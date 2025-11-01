# Database Update Scripts

This directory contains scripts to update the Supabase database with menu entries and permissions.

## Prerequisites

1. **Environment Variables**: Make sure `.env.local` is configured with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

2. **Dependencies**: Install required packages:
   ```bash
   npm install --save-dev tsx dotenv
   ```

## Scripts

### 1. `add-menu-entries.ts`

Adds menu entries to the `sidebar_menus` table. This script will:
- Create menu entries for Dashboard, Sales, Users, Settings, and Super Admin
- Create child menus for Sales (Analytics and Reports)
- Skip existing entries to avoid duplicates

**Run:**
```bash
npx tsx scripts/add-menu-entries.ts
```

### 2. `assign-menu-permissions.ts`

Assigns menu permissions to roles in the `role_menu_permissions` table. This script will:
- Assign permissions for all 13 role types
- Set appropriate view/edit/delete/approve permissions based on role level
- Skip existing permissions to avoid duplicates

**Run:**
```bash
npx tsx scripts/assign-menu-permissions.ts
```

## Usage

Run the scripts in order:

```bash
# Step 1: Add menu entries
npx tsx scripts/add-menu-entries.ts

# Step 2: Assign permissions
npx tsx scripts/assign-menu-permissions.ts
```

## Troubleshooting

### Missing Environment Variables

If you see an error about missing environment variables:
1. Create `.env.local` in the project root
2. Add your Supabase credentials (see `env.example` for reference)

### Script Fails to Connect

- Verify your Supabase URL and service role key are correct
- Ensure your Supabase project is active
- Check network connectivity

### Duplicate Entry Errors

The scripts are designed to skip existing entries. If you see duplicate errors:
- Check the database manually
- Delete duplicate entries if needed
- Re-run the script
