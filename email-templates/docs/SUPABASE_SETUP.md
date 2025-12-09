# Supabase Email Template Setup Guide

This guide explains how to upload and configure the GrowShip email templates in your Supabase project.

## Prerequisites

- Access to your Supabase Dashboard
- Admin permissions for the project

## Step-by-Step Setup

### Step 1: Access Email Templates

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your GrowShip project
3. Navigate to **Authentication** → **Email Templates** (in the left sidebar)

### Step 2: Configure Each Template

Supabase provides four email template types that match our custom templates:

| Supabase Template | Our Template File     | Description                        |
| ----------------- | --------------------- | ---------------------------------- |
| Confirm signup    | `confirm-signup.html` | Email sent when user signs up      |
| Reset password    | `reset-password.html` | Email sent for password reset      |
| Invite user       | `invite-user.html`    | Email sent when inviting new users |
| Magic link        | `magic-link.html`     | Email sent for passwordless login  |

**Note:** The following templates are custom and need to be sent via Edge Functions or custom email sending:

| Custom Template   | Our Template File     | Description                                               |
| ----------------- | --------------------- | --------------------------------------------------------- |
| Change email      | `change-email.html`   | Email sent to verify new email address                    |
| Re-authentication | `reauthenticate.html` | Email sent for re-authentication before sensitive actions |

### Step 3: Upload Confirm Signup Template

1. Click on **Confirm signup** in the Email Templates section
2. **Subject Line**: Set to `Confirm Your GrowShip Account`
3. **Email Body**:
   - Copy the entire contents of `email-templates/html/confirm-signup.html`
   - Paste into the email body editor (Source mode)
4. Click **Save**

### Step 4: Upload Reset Password Template

1. Click on **Reset password**
2. **Subject Line**: Set to `Reset Your GrowShip Password`
3. **Email Body**:
   - Copy the entire contents of `email-templates/html/reset-password.html`
   - Paste into the email body editor (Source mode)
4. Click **Save**

### Step 5: Upload Invite User Template

1. Click on **Invite user**
2. **Subject Line**: Set to `You're Invited to Join GrowShip!`
3. **Email Body**:
   - Copy the entire contents of `email-templates/html/invite-user.html`
   - Paste into the email body editor (Source mode)
4. Click **Save**

### Step 6: Upload Magic Link Template

1. Click on **Magic link**
2. **Subject Line**: Set to `Sign In to GrowShip`
3. **Email Body**:
   - Copy the entire contents of `email-templates/html/magic-link.html`
   - Paste into the email body editor (Source mode)
4. Click **Save**

## Template Variables Reference

Supabase provides these variables that are automatically replaced:

| Variable                 | Description                                    | Used In       |
| ------------------------ | ---------------------------------------------- | ------------- |
| `{{ .ConfirmationURL }}` | Full URL for the action (confirm, reset, etc.) | All templates |
| `{{ .Token }}`           | The raw token value                            | Optional use  |
| `{{ .TokenHash }}`       | Hashed token value                             | Optional use  |
| `{{ .SiteURL }}`         | Your site's base URL                           | Optional use  |
| `{{ .Email }}`           | User's email address                           | Optional use  |
| `{{ .Data }}`            | Custom data passed in the request              | Optional use  |
| `{{ .RedirectTo }}`      | Redirect URL after action                      | Optional use  |

## Customizing Subject Lines

Recommended subject lines for GrowShip:

| Template        | Subject Line                       |
| --------------- | ---------------------------------- |
| Confirm signup  | `Confirm Your GrowShip Account`    |
| Reset password  | `Reset Your GrowShip Password`     |
| Invite user     | `You're Invited to Join GrowShip!` |
| Magic link      | `Sign In to GrowShip`              |
| Change email    | `Verify Your New Email Address`    |
| Re-authenticate | `Re-authentication Required`       |

## Testing Your Templates

### Test Confirm Signup

1. Create a new user account through your app
2. Check the email received
3. Verify the confirmation link works

### Test Reset Password

1. Use the "Forgot Password" flow in your app
2. Check the email received
3. Verify the reset link works

### Test Invite User

1. Use the admin invite feature (Users → Invite)
2. Check the email received at the invited address
3. Verify the invitation link works

### Test Magic Link

1. Enable Magic Link authentication in your app (if not already)
2. Request a magic link sign-in
3. Check the email and verify the link works

## Custom Templates (Change Email & Re-authentication)

The `change-email.html` and `reauthenticate.html` templates are not part of Supabase's built-in email templates. These need to be sent via:

### Option 1: Supabase Edge Functions

Create an Edge Function that sends these emails using a service like Resend, SendGrid, or Postmark:

```typescript
// Example Edge Function structure
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { email, type, confirmationUrl } = await req.json();

  // Load template HTML
  const template =
    type === "change-email"
      ? await Deno.readTextFile("./change-email.html")
      : await Deno.readTextFile("./reauthenticate.html");

  // Replace variables
  const html = template
    .replace("{{ .ConfirmationURL }}", confirmationUrl)
    .replace("{{ .Email }}", email);

  // Send via email service
  // ... your email sending logic
});
```

### Option 2: Next.js API Route

Send emails from your Next.js API routes:

```typescript
// app/api/auth/change-email/route.ts
import { Resend } from "resend";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { email, confirmationUrl } = await request.json();

  const template = fs.readFileSync(
    path.join(process.cwd(), "email-templates/html/change-email.html"),
    "utf-8"
  );

  const html = template
    .replace("{{ .ConfirmationURL }}", confirmationUrl)
    .replace("{{ .Email }}", email);

  await resend.emails.send({
    from: "GrowShip <noreply@growship.com>",
    to: email,
    subject: "Verify Your New Email Address",
    html,
  });
}
```

### Option 3: Supabase Database Functions + pg_net

Use Supabase's `pg_net` extension to send HTTP requests to an email service from database functions.

## Troubleshooting

### Emails Not Sending

1. **Check Email Provider Settings**

   - Go to **Project Settings** → **Authentication** → **SMTP Settings**
   - Ensure SMTP is properly configured (or use Supabase's default)

2. **Check Rate Limits**

   - Supabase has email rate limits
   - Free tier: ~30 emails/hour

3. **Check Spam Folder**
   - Emails might be going to spam
   - Add your domain to allowlist

### Template Variables Not Working

1. Ensure variables use exact syntax: `{{ .VariableName }}`
2. Variables are case-sensitive
3. Check for extra spaces inside `{{ }}`

### Styling Issues

1. **Outlook**: Some gradients and modern CSS may not render
   - Templates include Outlook-specific conditionals
2. **Gmail**: May strip some styles
   - Inline styles are used for better compatibility
3. **Mobile**: Test on actual devices
   - Templates are responsive

## Email Provider Setup (Optional)

For better deliverability, configure a custom SMTP provider:

### Recommended Providers

1. **Resend** (recommended for Next.js projects)

   - Easy setup, good deliverability
   - [resend.com](https://resend.com)

2. **SendGrid**

   - Industry standard, robust API
   - [sendgrid.com](https://sendgrid.com)

3. **Postmark**

   - Excellent for transactional emails
   - [postmarkapp.com](https://postmarkapp.com)

4. **AWS SES**
   - Cost-effective at scale
   - [aws.amazon.com/ses](https://aws.amazon.com/ses)

### Configure SMTP in Supabase

1. Go to **Project Settings** → **Authentication**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Enter your provider's credentials:
   - Host
   - Port
   - Username
   - Password
5. Set **Sender Email** and **Sender Name**
6. Click **Save**

## Production Checklist

Before going live, ensure:

- [ ] All four email templates are uploaded
- [ ] Subject lines are set correctly
- [ ] Test each email flow works end-to-end
- [ ] Logo URLs are updated (if using image-based logos)
- [ ] SMTP provider is configured (optional but recommended)
- [ ] Rate limits are appropriate for your expected volume
- [ ] Spam testing passed (use [mail-tester.com](https://mail-tester.com))

## Support

If you encounter issues:

1. Check Supabase Dashboard logs
2. Review Authentication settings
3. Consult [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
