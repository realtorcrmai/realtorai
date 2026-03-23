#!/usr/bin/env bash
# ============================================================
# ListingFlow Secret Vault
# Encrypts/decrypts .env.local using OpenSSL AES-256-CBC
#
# Usage:
#   ./scripts/vault.sh encrypt    # .env.local → .env.vault
#   ./scripts/vault.sh decrypt    # .env.vault → .env.local
#   ./scripts/vault.sh status     # Show loaded secrets count
#   ./scripts/vault.sh diff       # Compare vault vs local
#
# The .env.vault file is safe to commit to git.
# The .env.local file must NEVER be committed.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"
VAULT_FILE="$PROJECT_ROOT/.env.vault"
CIPHER="aes-256-cbc"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  echo "Usage: $0 {encrypt|decrypt|status|diff}"
  echo ""
  echo "  encrypt   Encrypt .env.local → .env.vault"
  echo "  decrypt   Decrypt .env.vault → .env.local"
  echo "  status    Show count of secrets in .env.local"
  echo "  diff      Compare vault contents vs .env.local"
  exit 1
}

get_passphrase() {
  if [ -n "${VAULT_PASSPHRASE:-}" ]; then
    echo "$VAULT_PASSPHRASE"
    return
  fi

  if [ -t 0 ]; then
    read -s -p "Vault passphrase: " PASS
    echo "" >&2
    echo "$PASS"
  else
    # Non-interactive — read from stdin
    read -r PASS
    echo "$PASS"
  fi
}

count_secrets() {
  local file="$1"
  grep -c '^[A-Z_]\+=' "$file" 2>/dev/null || echo "0"
}

cmd_encrypt() {
  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    exit 1
  fi

  PASS=$(get_passphrase)

  openssl enc -$CIPHER -salt -pbkdf2 -iter 100000 \
    -in "$ENV_FILE" -out "$VAULT_FILE" \
    -pass "pass:$PASS"

  local count=$(count_secrets "$ENV_FILE")
  echo -e "${GREEN}✅ Encrypted $count secrets → .env.vault${NC}"
  echo "  Commit .env.vault to git (never commit .env.local)"
}

cmd_decrypt() {
  if [ ! -f "$VAULT_FILE" ]; then
    echo -e "${RED}Error: .env.vault not found${NC}"
    echo "  Ask a teammate for the vault file or passphrase"
    exit 1
  fi

  if [ -f "$ENV_FILE" ]; then
    local existing=$(count_secrets "$ENV_FILE")
    echo -e "${YELLOW}⚠️  .env.local exists ($existing secrets). Overwrite? [y/N]${NC}"
    if [ -t 0 ]; then
      read -r CONFIRM
      if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        echo "Aborted."
        exit 0
      fi
    else
      echo "  Non-interactive mode — overwriting"
    fi
  fi

  PASS=$(get_passphrase)

  if ! openssl enc -$CIPHER -d -salt -pbkdf2 -iter 100000 \
    -in "$VAULT_FILE" -out "$ENV_FILE" \
    -pass "pass:$PASS" 2>/dev/null; then
    echo -e "${RED}❌ Decryption failed — wrong passphrase?${NC}"
    rm -f "$ENV_FILE.tmp" 2>/dev/null
    exit 1
  fi

  local count=$(count_secrets "$ENV_FILE")
  echo -e "${GREEN}✅ Decrypted $count secrets → .env.local${NC}"

  # Verify .env.local is gitignored
  if ! grep -q "^\.env\.local$" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    echo ".env.local" >> "$PROJECT_ROOT/.gitignore"
    echo -e "${YELLOW}  Added .env.local to .gitignore${NC}"
  fi
  echo "  .env.local is NOT tracked by git ✓"
}

cmd_status() {
  echo "━━━ Vault Status ━━━"

  if [ -f "$VAULT_FILE" ]; then
    local vsize=$(wc -c < "$VAULT_FILE" | tr -d ' ')
    local vdate=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$VAULT_FILE" 2>/dev/null || stat -c "%y" "$VAULT_FILE" 2>/dev/null | cut -d. -f1)
    echo -e "  ${GREEN}✅ .env.vault${NC} ($vsize bytes, modified $vdate)"
  else
    echo -e "  ${RED}❌ .env.vault not found${NC}"
  fi

  if [ -f "$ENV_FILE" ]; then
    local count=$(count_secrets "$ENV_FILE")
    local ldate=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$ENV_FILE" 2>/dev/null || stat -c "%y" "$ENV_FILE" 2>/dev/null | cut -d. -f1)
    echo -e "  ${GREEN}✅ .env.local${NC} ($count secrets, modified $ldate)"
    echo ""
    echo "  Secrets loaded:"
    grep '^[A-Z_]\+=' "$ENV_FILE" | while IFS='=' read -r key value; do
      if [ -n "$value" ]; then
        local masked="${value:0:4}***"
        echo -e "    ${GREEN}✓${NC} $key = $masked"
      else
        echo -e "    ${RED}✗${NC} $key = (empty)"
      fi
    done
  else
    echo -e "  ${RED}❌ .env.local not found — run: ./scripts/vault.sh decrypt${NC}"
  fi

  # Git tracking check
  echo ""
  if git ls-files --error-unmatch .env.local &>/dev/null; then
    echo -e "  ${RED}⚠️  WARNING: .env.local IS tracked by git! Remove it:${NC}"
    echo "    git rm --cached .env.local"
  else
    echo -e "  ${GREEN}✓${NC} .env.local is NOT tracked by git"
  fi
}

cmd_diff() {
  if [ ! -f "$VAULT_FILE" ]; then
    echo -e "${RED}No .env.vault to compare${NC}"
    exit 1
  fi
  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}No .env.local to compare${NC}"
    exit 1
  fi

  PASS=$(get_passphrase)

  local tmp=$(mktemp)
  if ! openssl enc -$CIPHER -d -salt -pbkdf2 -iter 100000 \
    -in "$VAULT_FILE" -out "$tmp" \
    -pass "pass:$PASS" 2>/dev/null; then
    echo -e "${RED}❌ Decryption failed${NC}"
    rm -f "$tmp"
    exit 1
  fi

  # Compare keys only (not values for security)
  local vault_keys=$(grep '^[A-Z_]\+=' "$tmp" | cut -d= -f1 | sort)
  local local_keys=$(grep '^[A-Z_]\+=' "$ENV_FILE" | cut -d= -f1 | sort)

  echo "━━━ Vault vs Local ━━━"

  local only_vault=$(comm -23 <(echo "$vault_keys") <(echo "$local_keys"))
  local only_local=$(comm -13 <(echo "$vault_keys") <(echo "$local_keys"))
  local in_both=$(comm -12 <(echo "$vault_keys") <(echo "$local_keys"))

  if [ -n "$only_vault" ]; then
    echo -e "${RED}  In vault but NOT in local:${NC}"
    echo "$only_vault" | sed 's/^/    /'
  fi

  if [ -n "$only_local" ]; then
    echo -e "${YELLOW}  In local but NOT in vault (re-encrypt needed):${NC}"
    echo "$only_local" | sed 's/^/    /'
  fi

  local both_count=$(echo "$in_both" | wc -l | tr -d ' ')
  echo -e "  ${GREEN}$both_count keys in both${NC}"

  # Check for value differences
  local changed=0
  while IFS= read -r key; do
    local v1=$(grep "^${key}=" "$tmp" | cut -d= -f2-)
    local v2=$(grep "^${key}=" "$ENV_FILE" | cut -d= -f2-)
    if [ "$v1" != "$v2" ]; then
      echo -e "  ${YELLOW}↔ $key has different values${NC}"
      changed=$((changed+1))
    fi
  done <<< "$in_both"

  if [ "$changed" -eq 0 ]; then
    echo -e "  ${GREEN}All shared keys have matching values${NC}"
  fi

  rm -f "$tmp"
}

# ── Main ────────────────────────────────────────
case "${1:-}" in
  encrypt) cmd_encrypt ;;
  decrypt) cmd_decrypt ;;
  status)  cmd_status ;;
  diff)    cmd_diff ;;
  *)       usage ;;
esac
