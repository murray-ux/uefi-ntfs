# Translator Hub

Translation and localization guide for Auth Portal.

## Contents

- [Overview](#overview)
- [Supported Languages](#supported-languages)
- [Translation Workflow](#translation-workflow)
- [Adding a New Language](#adding-a-new-language)
- [Translation Guidelines](#translation-guidelines)
- [Testing Translations](#testing-translations)

---

## Overview

Auth Portal supports multiple languages through:

1. **Language Selector** - User-facing dropdown in header
2. **Browser Detection** - Automatic language based on browser settings
3. **Preference Storage** - Saved in user preferences and localStorage

### Current Status

| Language | Code | Status | Completion |
|----------|------|--------|------------|
| English | en | Complete | 100% |
| Spanish | es | Partial | 80% |
| French | fr | Partial | 75% |
| German | de | Partial | 70% |
| Chinese | zh | Partial | 65% |
| Japanese | ja | Partial | 60% |
| Portuguese | pt | Partial | 55% |
| Russian | ru | Partial | 50% |
| Arabic | ar | Partial | 45% |
| Italian | it | Partial | 40% |
| Korean | ko | Partial | 35% |
| Vietnamese | vi | Partial | 30% |
| Turkish | tr | Partial | 25% |
| Indonesian | id | Partial | 20% |

---

## Supported Languages

Currently registered in `src/types.ts`:

```typescript
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'español' },
  { code: 'fr', name: 'French', nativeName: 'français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'pt', name: 'Portuguese', nativeName: 'português' },
  { code: 'ru', name: 'Russian', nativeName: 'русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'it', name: 'Italian', nativeName: 'italiano' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];
```

---

## Translation Workflow

### 1. Create Translation File

Create `i18n/<language-code>.json`:

```json
{
  "login": {
    "title": "Log in",
    "username": "Username",
    "password": "Password",
    "rememberMe": "Keep me logged in",
    "submit": "Log in",
    "forgotPassword": "Forgot your password?",
    "noAccount": "Don't have an account?",
    "createOne": "Create one"
  },
  "passwordReset": {
    "title": "Reset password",
    "usernameLabel": "Username",
    "emailLabel": "Email address",
    "hint": "Enter your username or email address (or both).",
    "submit": "Request password reset",
    "successMessage": "If an account with that information exists, a password reset email has been sent."
  },
  "createAccount": {
    "title": "Create account",
    "subtitle": "Join to access all features",
    "usernameLabel": "Username",
    "passwordLabel": "Password",
    "confirmPasswordLabel": "Confirm password",
    "emailLabel": "Email address (optional)",
    "submit": "Create account"
  },
  "settings": {
    "title": "Settings",
    "display": "Display",
    "email": "Email",
    "security": "Security",
    "textSize": "Text Size",
    "colorTheme": "Color Theme",
    "expandSections": "Expand all sections",
    "epr": "Enhanced Password Reset",
    "save": "Save settings"
  },
  "common": {
    "cancel": "Cancel",
    "back": "Back",
    "help": "Help",
    "privacyPolicy": "Privacy policy",
    "termsOfUse": "Terms of use"
  }
}
```

### 2. Register Language

Add to `SUPPORTED_LANGUAGES` in `src/types.ts`:

```typescript
{ code: 'xx', name: 'Language Name', nativeName: 'Native Name' },
```

### 3. Test Translation

1. Select language from dropdown
2. Verify all strings display correctly
3. Check RTL layout for Arabic, Hebrew, etc.
4. Test form validation messages

---

## Adding a New Language

### Step-by-Step

1. **Create translation file**
   ```bash
   cp i18n/en.json i18n/xx.json
   ```

2. **Translate all strings**
   ```bash
   # Edit the new file
   vim i18n/xx.json
   ```

3. **Add to language list**
   ```typescript
   // src/types.ts
   { code: 'xx', name: 'My Language', nativeName: 'My Language Native' },
   ```

4. **Test in browser**
   - Open Auth Portal
   - Select new language
   - Verify all pages

5. **Submit pull request**
   - Include translation file
   - Include types.ts change
   - Note completion percentage

### RTL Languages

For right-to-left languages (Arabic, Hebrew, Persian, Urdu):

1. Add `dir="rtl"` attribute handling
2. Test all layouts flip correctly
3. Ensure form alignment works

```css
[dir="rtl"] .form-input {
  text-align: right;
}

[dir="rtl"] .header-actions {
  flex-direction: row-reverse;
}
```

---

## Translation Guidelines

### Style Guide

| Do | Don't |
|----|-------|
| Be concise | Use long phrases |
| Use familiar terms | Invent new terminology |
| Maintain consistency | Vary translations of same term |
| Keep placeholders | Translate {variables} |
| Test in context | Translate in isolation |

### Placeholders

Preserve all placeholders:

```json
// Correct
"greeting": "Hello, {username}!"

// Wrong - don't translate placeholder
"greeting": "Hello, {nombre_usuario}!"
```

### Formatting

- Keep line lengths reasonable
- Preserve JSON structure
- Use UTF-8 encoding
- No trailing whitespace

### Common Terms

Keep consistent translations for:

| English | Description |
|---------|-------------|
| Username | User identifier |
| Password | Secret credential |
| Email | Electronic mail address |
| Log in | Action to authenticate |
| Log out | Action to end session |
| Reset | Action to restore |
| Settings | Configuration options |
| Help | Assistance/documentation |

---

## Testing Translations

### Manual Testing

1. Set browser language preference
2. Clear localStorage
3. Reload page
4. Verify auto-detection works
5. Test language switcher
6. Check all pages/forms

### Automated Testing

```bash
# Validate JSON syntax
npm run test:i18n

# Check for missing keys
npm run test:i18n:coverage
```

### Checklist

- [ ] All strings translated
- [ ] No untranslated placeholders
- [ ] JSON syntax valid
- [ ] Language registered in types.ts
- [ ] Dropdown shows correctly
- [ ] RTL layout works (if applicable)
- [ ] Form labels aligned
- [ ] Error messages translated
- [ ] Help sections translated
- [ ] Footer links work

---

## See Also

- [Developer Hub](developer-hub.md) - Code structure
- [User Hub](user-hub.md) - End user documentation
- [Sysadmin Hub](sysadmin-hub.md) - Configuration
