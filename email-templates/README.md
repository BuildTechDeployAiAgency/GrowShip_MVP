# GrowShip Email Templates

Custom-branded HTML email templates for the GrowShip platform, designed to match the application's teal/green color scheme and modern aesthetic.

## Overview

This folder contains responsive HTML email templates for all authentication-related communications:

| Template              | Purpose                                 | Supabase Template Type |
| --------------------- | --------------------------------------- | ---------------------- |
| `confirm-signup.html` | Email confirmation after registration   | Confirm signup         |
| `reset-password.html` | Password reset request                  | Reset password         |
| `invite-user.html`    | Admin invites new user                  | Invite user            |
| `magic-link.html`     | Passwordless sign-in                    | Magic link             |
| `change-email.html`   | Verify new email address                | Custom                 |
| `reauthenticate.html` | Re-authentication for sensitive actions | Custom                 |

## Folder Structure

```
email-templates/
├── html/
│   ├── confirm-signup.html    # Sign up confirmation
│   ├── reset-password.html     # Password reset
│   ├── invite-user.html        # User invitation
│   ├── magic-link.html         # Magic link auth
│   ├── change-email.html       # Email change verification
│   └── reauthenticate.html     # Re-authentication request
├── assets/
│   ├── logo-svg.html           # Logo component options
│   └── README-LOGO.md          # Logo hosting guide
├── docs/
│   └── SUPABASE_SETUP.md       # Supabase configuration guide
└── README.md                    # This file
```

## Design Features

### Branding

- **Primary Color**: Teal (#14b8a6)
- **Secondary Color**: Green (#10b981)
- **Accent Colors**: Purple (#8b5cf6), Blue (#2563eb), Orange (#ea580c)
- **Typography**: System fonts with Geist Sans fallback

### Features

- Responsive design (mobile + desktop)
- Email client compatibility (Gmail, Outlook, Apple Mail, Yahoo)
- Accessible HTML structure
- Dark mode friendly colors
- Clear call-to-action buttons
- Security notices and expiration warnings
- Alternative link text for button fallback

## Quick Start

### 1. Upload to Supabase

See [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) for detailed instructions.

**Quick steps:**

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Select each template type
3. Copy/paste the HTML from the corresponding file
4. Set the subject line
5. Save

### 2. Recommended Subject Lines

| Template        | Subject Line                       |
| --------------- | ---------------------------------- |
| Confirm signup  | `Confirm Your GrowShip Account`    |
| Reset password  | `Reset Your GrowShip Password`     |
| Invite user     | `You're Invited to Join GrowShip!` |
| Magic link      | `Sign In to GrowShip`              |
| Change email    | `Verify Your New Email Address`    |
| Re-authenticate | `Re-authentication Required`       |

## Template Variables

These Supabase variables are used in templates:

```html
{{ .ConfirmationURL }}
<!-- Main action URL (confirm, reset, invite, sign-in) -->
{{ .Token }}
<!-- Raw authentication token -->
{{ .TokenHash }}
<!-- Hashed token -->
{{ .SiteURL }}
<!-- Your site's base URL -->
{{ .Email }}
<!-- User's email address -->
{{ .RedirectTo }}
<!-- Post-action redirect URL -->
```

## Customization

### Changing Colors

Find and replace these color codes in the HTML files:

```css
/* Primary Teal */
#14b8a6 → your-primary-color

/* Secondary Green */
#10b981 → your-secondary-color

/* Light Backgrounds */
#f0fdfa → your-light-bg      /* teal-50 */
#ecfdf5 → your-green-bg      /* green-50 */
#eff6ff → your-blue-bg       /* blue-50 */
#faf5ff → your-purple-bg     /* purple-50 */
#fff7ed → your-orange-bg     /* orange-50 */
```

### Changing Company Name

Search and replace:

- `GrowShip` → Your Company Name
- `Multi-Tenant Business Platform` → Your Tagline

### Adding Your Logo

See [assets/README-LOGO.md](./assets/README-LOGO.md) for logo hosting options.

Replace the text-based logo with your image:

```html
<!-- Replace this -->
<div style="width: 40px; height: 40px; background: linear-gradient(...);">
  ...
</div>

<!-- With this -->
<img
  src="https://your-cdn.com/logo.png"
  alt="Your Company"
  width="40"
  height="40"
/>
```

## Testing

### Preview in Browser

1. Open any `.html` file directly in your browser
2. The template will render with placeholder URLs

### Send Test Emails

1. Upload templates to Supabase
2. Trigger each flow in your app:
   - Sign up (new user)
   - Forgot password
   - Invite user (admin panel)
   - Magic link (if enabled)
   - Change email address
   - Re-authentication (sensitive actions)

### Email Client Testing

Use these services to test across clients:

- [Litmus](https://litmus.com)
- [Email on Acid](https://emailonacid.com)
- [Mailtrap](https://mailtrap.io)

## Email Client Compatibility

| Client          | Compatibility                 |
| --------------- | ----------------------------- |
| Gmail (Web)     | ✅ Full support               |
| Gmail (Mobile)  | ✅ Full support               |
| Apple Mail      | ✅ Full support               |
| Outlook 365     | ✅ Good support               |
| Outlook Desktop | ⚠️ Minor gradient limitations |
| Yahoo Mail      | ✅ Full support               |
| Thunderbird     | ✅ Full support               |

## Troubleshooting

### Emails Going to Spam

- Configure SPF/DKIM records for your domain
- Use a reputable SMTP provider
- Test with [mail-tester.com](https://mail-tester.com)

### Buttons Not Working

- Check that `{{ .ConfirmationURL }}` is correctly placed
- Ensure URL hasn't been accidentally modified

### Styling Issues

- Emails use inline styles for best compatibility
- Some advanced CSS may not work in Outlook
- Test in target email clients before deploying

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email HTML Best Practices](https://www.litmus.com/blog/email-coding-guidelines/)

## License

These templates are part of the GrowShip project and follow the same license.
