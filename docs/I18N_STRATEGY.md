<!-- docs-audit: src/lib/i18n* -->
<!-- docs-audit-reviewed: 2026-04-22 --># Internationalization Strategy

**Last reviewed:** 2026-04-21
**Current locale:** English (en-CA) only

---

## Why plan now

Canada is bilingual (English + French). BC realtors may serve French-speaking clients. Immigration-market expansion requires multilingual support. Planning now avoids costly retrofits.

## Strategy: string externalization

Even with English-only, extract user-facing strings to a central location:

```typescript
// src/lib/i18n/strings.ts (to be created)
export const strings = {
  contacts: {
    title: "Contacts",
    addNew: "Add Contact",
    searchPlaceholder: "Search contacts...",
    empty: "No contacts yet. Add your first contact to get started.",
  },
  // ... per-page sections
} as const;
```

**Benefits even without translation:**
- Consistent wording across pages
- Single place to update copy
- Easy to hand off to translators later
- Typo fixes propagate everywhere

## Implementation phases

### Phase 0 (now): Convention only
- New features SHOULD use string constants instead of inline text
- Not enforced — guidance only

### Phase 1 (when needed): Extract existing strings
- Create `src/lib/i18n/strings.ts`
- Migrate high-traffic pages first (dashboard, contacts, listings)
- Estimated: 2-3 days

### Phase 2 (when needed): Add French
- Add `next-intl` or `react-i18next`
- Locale detection from browser/user preference
- Professional translation of string file
- Estimated: 1-2 weeks

## Not in scope

- RTL language support
- Date/currency localization beyond en-CA/fr-CA
- Machine translation (always use professional translators for regulated content)
