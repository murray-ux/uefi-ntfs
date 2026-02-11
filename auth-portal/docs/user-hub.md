# User Hub

Help for end users of Auth Portal.

## Contents

- [Logging In](#logging-in)
- [Creating an Account](#creating-an-account)
- [Password Reset](#password-reset)
- [Account Settings](#account-settings)
- [Accessibility](#accessibility)
- [FAQ](#faq)

---

## Logging In

1. Go to the login page
2. Enter your **username** and **password**
3. Optionally check "Keep me logged in" for extended sessions
4. Click **Log in**

### Troubleshooting Login Issues

| Problem | Solution |
|---------|----------|
| Forgot password | Use [Password Reset](#password-reset) |
| Account locked | Contact administrator |
| Invalid credentials | Check caps lock, try password reset |

---

## Creating an Account

1. Click "Create one" on the login page
2. Choose a **username** (3-30 characters, letters/numbers/underscores)
3. Enter a **password** (minimum 8 characters)
4. Confirm your password
5. Optionally add an **email address** (recommended for password recovery)
6. Click **Create account**

### Email Confirmation

If you provided an email address:
1. Check your inbox for a confirmation email
2. Click the confirmation link
3. Your email is now verified

**Note**: You can still use your account without confirming email, but password reset will not work.

---

## Password Reset

### Standard Reset

1. Click "Forgot your password?" on login page
2. Enter your **username** OR **email address**
3. Click **Request password reset**
4. Check your email for reset link
5. Click the link and enter a new password

### Enhanced Password Reset (EPR)

If you enabled EPR in settings:
- You must enter BOTH username AND email
- This prevents spam reset emails
- The system will not tell you that both are required (for security)

### Multiple Accounts

If you have multiple accounts with the same email:
- Enter **only email** → Get reset links for ALL accounts
- Enter **only username** → Get reset link for ONE account

### Didn't Receive Email?

Check these:
- ✅ Email address is on your account
- ✅ Spelling is correct
- ✅ Check spam/junk folder
- ✅ If EPR enabled, enter BOTH fields
- ✅ Wait if you requested too many resets

---

## Account Settings

Access settings by clicking ⚙️ **Settings** in the header.

### Display Tab

| Setting | Options | Description |
|---------|---------|-------------|
| Text Size | Standard, Medium, Large | Adjust text for readability |
| Color Theme | Light, Dark, Automatic | Choose color scheme |
| Expand Sections | On/Off | Auto-expand collapsible content |

### Email Tab

- **Email Address**: Add or change your email
- **Notifications**: Enable/disable email alerts

### Security Tab

- **Enhanced Password Reset**: Toggle EPR (recommended)
- **Change Password**: Link to password reset

---

## Accessibility

Auth Portal includes accessibility features:

### Visual
- **Dark Mode**: Reduces eye strain in low light
- **High Contrast**: Dark mode provides better contrast
- **Text Sizing**: Three levels available

### Navigation
- **Keyboard Navigation**: Full Tab key support
- **Skip Links**: Jump to main content
- **Focus Indicators**: Visible focus states

### Screen Readers
- **Semantic HTML**: Proper heading structure
- **ARIA Labels**: Form field descriptions
- **Live Regions**: Dynamic content announcements

---

## FAQ

### Can someone reset my password without my permission?

No. Password reset only sends an email - the attacker would need access to your email to complete the reset. Enable EPR for additional protection.

### What if I lose access to my email?

Contact an administrator. They can:
- Update your email address
- Manually reset your password
- Unlock your account

### How long do login sessions last?

Standard sessions expire after 24 hours. "Keep me logged in" extends to 30 days.

### Is my password stored securely?

Yes. Passwords are salted and hashed using a secure algorithm. We never store plaintext passwords.

### Can I have multiple accounts?

Yes, but each must have a unique username. Multiple accounts can share an email address.

---

## See Also

- [Sysadmin Hub](sysadmin-hub.md) - For system administrators
- [Developer Hub](developer-hub.md) - For developers
