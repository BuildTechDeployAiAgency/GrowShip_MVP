# Migration Troubleshooting Guide

## Issue: "relation 'organizations' does not exist"

### Problem
You're getting an error when trying to run migration 001:
```
ERROR: 42P01: relation "organizations" does not exist
```

This means the `organizations` table doesn't exist in your database.

### Diagnosis Steps

**Step 1: Run the diagnostic script**

Execute this in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of:
-- supabase_migrations/000_check_current_schema.sql
```

This will tell you:
- Does the `organizations` table exist?
- Does the `brands` table already exist?
- What tables DO exist in your database?
- What columns reference "organization"?

### Solutions Based on Diagnosis

---

#### Scenario A: Organizations Table Never Existed

**If the diagnostic shows no `organizations` table:**

✅ **Use the alternate migration path:**

1. **Skip migration 001** (original)
2. **Run migration 001_alternate** instead:
   ```sql
   -- Execute: supabase_migrations/001_alternate_create_brands_table.sql
   ```
   This creates the `brands` table from scratch

3. **Continue with migrations 002-007** as normal
   - Migration 002 will update existing tables to reference the new `brands` table
   - Migrations 003-007 proceed as planned

---

#### Scenario B: Table Has Different Name

**If your tables use a different naming convention:**

Check the diagnostic results for tables like:
- `organization` (singular)
- `brand` (if it already exists)
- `company`
- `tenant`

**Solution:** Modify migration 001 to use the correct table name:

```sql
-- In 001_rename_organizations_to_brands.sql
-- Replace all instances of "organizations" with your actual table name
```

---

#### Scenario C: You're on a Fresh Database

**If this is a new/empty database:**

You have two options:

**Option 1: Create schema from scratch**
1. Run `001_alternate_create_brands_table.sql`
2. Create other necessary tables (user_profiles, distributors, etc.)
3. Skip to migration 002 and adjust as needed

**Option 2: Start with proper schema**
```sql
-- You may need to first create the base schema
-- Do you have a schema creation script?
-- Or should we create one?
```

---

#### Scenario D: Brands Table Already Exists

**If diagnostic shows `brands` table already exists:**

Migration 001 may have already been run, or the schema was set up differently.

**Solution:**
1. Skip migration 001 entirely
2. Check if columns are already `brand_id` or still `organization_id`
3. Start from the appropriate migration:
   - If columns are already `brand_id`: Skip to migration 003
   - If columns are `organization_id`: Start with migration 002

---

### Step-by-Step Recovery

**1. Run the diagnostic:**
```bash
# In Supabase SQL Editor, execute:
supabase_migrations/000_check_current_schema.sql
```

**2. Share the results:**
The diagnostic will show you exactly what exists. Based on that:

**3. Choose your path:**

**Path A - Fresh/Empty Database:**
```sql
-- 1. Run alternate migration
supabase_migrations/001_alternate_create_brands_table.sql

-- 2. Continue with 002-007
-- (May need to adjust 002 if some tables don't exist)
```

**Path B - Organizations Table Exists with Different Name:**
```sql
-- 1. Update migration 001 with correct table name
-- 2. Run updated 001
-- 3. Continue with 002-007
```

**Path C - Brands Already Exists:**
```sql
-- 1. Check current column names
-- 2. Start from appropriate migration (002 or 003)
```

---

### Common Questions

**Q: Can I safely skip migration 001?**
A: Yes, if `brands` table already exists OR if you use the alternate script to create it.

**Q: What if only some tables exist?**
A: Run the diagnostic script and we can create a custom migration path based on what exists.

**Q: Should I create tables manually?**
A: It's better to use the migration scripts to ensure consistency, but we can create a "bootstrap" script if needed.

**Q: What if I have data in organizations table but different structure?**
A: We'll need to see the structure and adjust migration 001 accordingly.

---

### Next Steps After Diagnosis

**After running the diagnostic, you should know:**

1. ✅ What tables exist in your database
2. ✅ Whether to use original or alternate migration 001
3. ✅ Which migrations to run next

**Then proceed with:**
1. Apply the appropriate migration 001 variant
2. Verify it succeeded
3. Continue with migrations 002-007

---

### Getting More Help

**Share these diagnostic results:**

1. Output of `000_check_current_schema.sql`
2. Error messages you're seeing
3. Which migration you're trying to run

**Key information needed:**
- Does organizations table exist? (yes/no)
- Does brands table exist? (yes/no)
- What columns exist in distributors table?
- What columns exist in user_profiles table?

This will help determine the exact path forward for your specific database state.

---

### Prevention for Future Migrations

**Best practices:**
1. Always run diagnostic scripts first
2. Check current state before assuming structure
3. Have database backups before migrations
4. Test migrations on a dev/staging database first
5. Run migrations one at a time, verifying each

---

## Summary of Available Migration Variants

```
000_check_current_schema.sql        # Run first - diagnostic
001_rename_organizations_to_brands.sql   # Original - if organizations exists
001_alternate_create_brands_table.sql    # Alternative - if organizations doesn't exist
002-007_*.sql                            # Continue as normal after 001
```

