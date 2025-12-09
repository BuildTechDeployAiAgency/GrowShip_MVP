# GrowShip Email Logo Assets

## Logo Specifications

### Icon Dimensions

- **Recommended Size**: 40x40px (for header)
- **Minimum Size**: 32x32px
- **Retina/HiDPI**: 80x80px (for @2x displays)

### Brand Colors

| Color Name      | Hex Code  | Usage                            |
| --------------- | --------- | -------------------------------- |
| Primary Teal    | `#14b8a6` | Main brand color, buttons, links |
| Secondary Green | `#10b981` | Gradients, accents               |
| Light Teal      | `#ccfbf1` | Icon backgrounds                 |
| Dark Gray       | `#111827` | Headlines, primary text          |
| Medium Gray     | `#6b7280` | Body text                        |
| Light Gray      | `#9ca3af` | Secondary text                   |

### Logo Options

1. **Text-Based Logo** (Most Compatible)

   - Uses emoji and CSS for maximum email client support
   - Works in: Gmail, Outlook, Apple Mail, Yahoo, etc.

2. **SVG Logo** (Modern Clients)

   - Vector-based, scalable
   - Limited support in: Outlook, some Gmail versions

3. **Image-Based Logo** (Recommended for Production)
   - Host PNG/JPG on CDN or Supabase Storage
   - Most reliable across all clients

## Hosting Your Logo

### Option 1: Supabase Storage (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** → Create a new bucket called `email-assets`
3. Set the bucket to **Public**
4. Upload your logo files:
   - `logo-icon.png` (40x40px)
   - `logo-icon@2x.png` (80x80px for retina)
5. Get the public URL:
   ```
   https://[PROJECT_ID].supabase.co/storage/v1/object/public/email-assets/logo-icon.png
   ```

### Option 2: Vercel/Next.js Public Folder

1. Add logo to `/public/email/logo-icon.png`
2. Reference in emails as:
   ```
   https://your-domain.com/email/logo-icon.png
   ```

### Option 3: External CDN

Use services like:

- Cloudinary
- AWS S3 + CloudFront
- imgix
- Bunny CDN

## Logo Files to Create

If you have design tools, create these files:

```
email-templates/assets/
├── logo-icon.png          # 40x40px, transparent background
├── logo-icon@2x.png       # 80x80px, for retina displays
├── logo-full.png          # Icon + "GrowShip" text, ~200x50px
├── logo-full@2x.png       # 400x100px, for retina displays
└── logo-white.png         # White version for dark backgrounds
```

## Using in Templates

Replace this placeholder in your email templates:

```html
<!-- Before -->
<img src="[YOUR_LOGO_URL]" alt="GrowShip" width="40" height="40" />

<!-- After -->
<img
  src="https://[PROJECT_ID].supabase.co/storage/v1/object/public/email-assets/logo-icon.png"
  alt="GrowShip"
  width="40"
  height="40"
/>
```
