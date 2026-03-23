#!/bin/bash
# ============================================================
# ListingFlow Secret Vault
# Encrypts/decrypts .env.local for team sharing via git
# Usage:
#   ./scripts/vault.sh encrypt    # .env.local → .env.vault (commit this)
#   ./scripts/vault.sh decrypt    # .env.vault → .env.local (run after pull)
#   ./scripts/vault.sh status     # show what's stored
# ============================================================

set -e

VAULT_FILE=".env.vault"
ENV_FILE=".env.local"
VAULT_PASS_FILE=".vault-pass"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

get_passphrase() {
  # Check for passphrase file first (for CI/automation)
  if [ -f "$VAULT_PASS_FILE" ]; then
    cat "$VAULT_PASS_FILE"
    return
  fi

  # Check env var
  if [ -n "$VAULT_PASSPHRASE" ]; then
    echo "$VAULT_PASSPHRASE"
    return
  fi

  # Prompt
  read -s -p "Vault passphrase: " pass
  echo >&2
  echo "$pass"
}

case "${1:-help}" in

  encrypt)
    if [ ! -f "$ENV_FILE" ]; then
      echo -e "${RED}Error: $ENV_FILE not found${NC}"
      exit 1
    fi

    PASS=$(get_passphrase)
    if [ -z "$PASS" ]; then
      echo -e "${RED}Error: passphrase cannot be empty${NC}"
      exit 1
    fi

    # Encrypt with AES-256-CBC
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
      -in "$ENV_FILE" -out "$VAULT_FILE" -pass "pass:$PASS"

    # Count secrets
    SECRET_COUNT=$(grep -c "=" "$ENV_FILE" 2>/dev/null || echo "0")
    VAULT_SIZE=$(wc -c < "$VAULT_FILE" | tr -d ' ')

    echo -e "${GREEN}✓ Encrypted $SECRET_COUNT secrets → $VAULT_FILE ($VAULT_SIZE bytes)${NC}"
    echo -e "${YELLOW}  Commit $VAULT_FILE to git. Share the passphrase with your team securely.${NC}"
    echo -e "  Never commit $ENV_FILE directly."
    ;;

  decrypt)
    if [ ! -f "$VAULT_FILE" ]; then
      echo -e "${RED}Error: $VAULT_FILE not found. Pull latest code first.${NC}"
      exit 1
    fi

    if [ -f "$ENV_FILE" ]; then
      echo -e "${YELLOW}Warning: $ENV_FILE already exists.${NC}"
      read -p "Overwrite? (y/N) " confirm
      if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted."
        exit 0
      fi
    fi

    PASS=$(get_passphrase)
    if [ -z "$PASS" ]; then
      echo -e "${RED}Error: passphrase cannot be empty${NC}"
      exit 1
    fi

    # Decrypt
    if openssl enc -aes-256-cbc -d -salt -pbkdf2 -iter 100000 \
      -in "$VAULT_FILE" -out "$ENV_FILE" -pass "pass:$PASS" 2>/dev/null; then

      SECRET_COUNT=$(grep -c "=" "$ENV_FILE" 2>/dev/null || echo "0")
      echo -e "${GREEN}✓ Decrypted $SECRET_COUNT secrets → $ENV_FILE${NC}"
    else
      echo -e "${RED}✗ Decryption failed — wrong passphrase?${NC}"
      rm -f "$ENV_FILE"
      exit 1
    fi
    ;;

  status)
    echo "=== Vault Status ==="
    if [ -f "$VAULT_FILE" ]; then
      VAULT_SIZE=$(wc -c < "$VAULT_FILE" | tr -d ' ')
      VAULT_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$VAULT_FILE" 2>/dev/null || stat -c "%y" "$VAULT_FILE" 2>/dev/null | cut -d. -f1)
      echo -e "${GREEN}✓ $VAULT_FILE exists ($VAULT_SIZE bytes, updated $VAULT_DATE)${NC}"
    else
      echo -e "${RED}✗ $VAULT_FILE not found${NC}"
    fi

    if [ -f "$ENV_FILE" ]; then
      SECRET_COUNT=$(grep -c "=" "$ENV_FILE" 2>/dev/null || echo "0")
      echo -e "${GREEN}✓ $ENV_FILE exists ($SECRET_COUNT secrets)${NC}"

      # Show which keys are set (not values)
      echo ""
      echo "Keys in $ENV_FILE:"
      grep "=" "$ENV_FILE" | grep -v "^#" | cut -d= -f1 | while read key; do
        val=$(grep "^$key=" "$ENV_FILE" | cut -d= -f2-)
        if [ -z "$val" ]; then
          echo -e "  ${RED}○ $key (empty)${NC}"
        else
          masked="${val:0:4}****"
          echo -e "  ${GREEN}● $key${NC} = $masked"
        fi
      done
    else
      echo -e "${YELLOW}✗ $ENV_FILE not found — run './scripts/vault.sh decrypt'${NC}"
    fi
    ;;

  rotate)
    if [ ! -f "$ENV_FILE" ]; then
      echo -e "${RED}Error: $ENV_FILE not found. Decrypt first.${NC}"
      exit 1
    fi

    echo "Enter OLD passphrase:"
    read -s OLD_PASS
    echo ""
    echo "Enter NEW passphrase:"
    read -s NEW_PASS
    echo ""
    echo "Confirm NEW passphrase:"
    read -s CONFIRM_PASS
    echo ""

    if [ "$NEW_PASS" != "$CONFIRM_PASS" ]; then
      echo -e "${RED}Passphrases don't match${NC}"
      exit 1
    fi

    # Re-encrypt with new passphrase
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
      -in "$ENV_FILE" -out "$VAULT_FILE" -pass "pass:$NEW_PASS"

    echo -e "${GREEN}✓ Vault re-encrypted with new passphrase${NC}"
    echo -e "${YELLOW}  Share the new passphrase with your team.${NC}"
    ;;

  *)
    echo "ListingFlow Secret Vault"
    echo ""
    echo "Usage:"
    echo "  ./scripts/vault.sh encrypt   Encrypt .env.local → .env.vault"
    echo "  ./scripts/vault.sh decrypt   Decrypt .env.vault → .env.local"
    echo "  ./scripts/vault.sh status    Show vault status and keys"
    echo "  ./scripts/vault.sh rotate    Change vault passphrase"
    echo ""
    echo "Set VAULT_PASSPHRASE env var or create .vault-pass file to skip prompt."
    echo "The .vault-pass file is gitignored."
    ;;

esac
