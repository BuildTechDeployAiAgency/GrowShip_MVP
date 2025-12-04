-- Fix missing relationship between sales_documents_storage and user_profiles
-- This allows the frontend to query sales_documents_storage(..., user_profiles(*))

BEGIN;

-- 1. Ensure user_profiles has a unique constraint on user_id
-- This is required for it to be the target of a foreign key
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_user_id_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'user_profiles_user_id_key' AND n.nspname = 'public'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2. Add the foreign key from sales_documents_storage to user_profiles
-- This tells PostgREST that these tables are related via user_id
ALTER TABLE sales_documents_storage
DROP CONSTRAINT IF EXISTS sales_documents_storage_user_id_fkey_profiles;

ALTER TABLE sales_documents_storage
ADD CONSTRAINT sales_documents_storage_user_id_fkey_profiles
FOREIGN KEY (user_id) REFERENCES user_profiles(user_id);

COMMIT;
