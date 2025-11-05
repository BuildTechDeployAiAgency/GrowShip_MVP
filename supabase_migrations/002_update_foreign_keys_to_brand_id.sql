-- =====================================================
-- Migration 002: Update Foreign Keys to brand_id
-- =====================================================
-- Description: Rename organization_id to brand_id across all tables
-- Date: 2025-11-04
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- ================================================
-- USER_PROFILES TABLE
-- ================================================

-- Drop existing foreign key constraints
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_organization_id_fkey;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_parent_organization_id_fkey;

-- Rename columns
ALTER TABLE user_profiles RENAME COLUMN organization_id TO brand_id;
ALTER TABLE user_profiles RENAME COLUMN parent_organization_id TO parent_brand_id;

-- Add new foreign key constraints
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;

ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_parent_brand_id_fkey 
  FOREIGN KEY (parent_brand_id) REFERENCES brands(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_brand_id ON user_profiles(brand_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_parent_brand_id ON user_profiles(parent_brand_id);

-- ================================================
-- USER_MEMBERSHIPS TABLE
-- ================================================

-- Drop existing foreign key constraint
ALTER TABLE user_memberships DROP CONSTRAINT IF EXISTS user_memberships_organization_id_fkey;

-- Rename column
ALTER TABLE user_memberships RENAME COLUMN organization_id TO brand_id;

-- Add new foreign key constraint
ALTER TABLE user_memberships 
  ADD CONSTRAINT user_memberships_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_memberships_brand_id ON user_memberships(brand_id);

-- ================================================
-- SALES_DATA TABLE
-- ================================================

-- Drop existing foreign key constraint
ALTER TABLE sales_data DROP CONSTRAINT IF EXISTS sales_data_organization_id_fkey;

-- Rename column
ALTER TABLE sales_data RENAME COLUMN organization_id TO brand_id;

-- Add new foreign key constraint
ALTER TABLE sales_data 
  ADD CONSTRAINT sales_data_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_sales_data_brand_id ON sales_data(brand_id);

-- ================================================
-- SALES_DOCUMENTS TABLE
-- ================================================

-- Drop existing foreign key constraint
ALTER TABLE sales_documents DROP CONSTRAINT IF EXISTS sales_documents_organization_id_fkey;

-- Rename column
ALTER TABLE sales_documents RENAME COLUMN organization_id TO brand_id;

-- Add new foreign key constraint
ALTER TABLE sales_documents 
  ADD CONSTRAINT sales_documents_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_sales_documents_brand_id ON sales_documents(brand_id);

-- ================================================
-- SALES_DOCUMENTS_STORAGE TABLE
-- ================================================

-- Drop existing foreign key constraint
ALTER TABLE sales_documents_storage DROP CONSTRAINT IF EXISTS sales_documents_storage_organization_id_fkey;

-- Rename column
ALTER TABLE sales_documents_storage RENAME COLUMN organization_id TO brand_id;

-- Add new foreign key constraint
ALTER TABLE sales_documents_storage 
  ADD CONSTRAINT sales_documents_storage_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_sales_documents_storage_brand_id ON sales_documents_storage(brand_id);

-- ================================================
-- ORDERS TABLE
-- ================================================

-- Drop existing foreign key constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_organization_id_fkey;

-- Rename column
ALTER TABLE orders RENAME COLUMN organization_id TO brand_id;

-- Add NOT NULL constraint (orders must belong to a brand)
ALTER TABLE orders ALTER COLUMN brand_id SET NOT NULL;

-- Add new foreign key constraint
ALTER TABLE orders 
  ADD CONSTRAINT orders_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_orders_brand_id ON orders(brand_id);

-- ================================================
-- PURCHASE_ORDERS TABLE
-- ================================================

-- Drop existing foreign key constraint if it exists
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_organization_id_fkey;

-- Rename column
ALTER TABLE purchase_orders RENAME COLUMN organization_id TO brand_id;

-- Add NOT NULL constraint
ALTER TABLE purchase_orders ALTER COLUMN brand_id SET NOT NULL;

-- Add new foreign key constraint
ALTER TABLE purchase_orders 
  ADD CONSTRAINT purchase_orders_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_purchase_orders_brand_id ON purchase_orders(brand_id);

-- ================================================
-- INVOICES TABLE
-- ================================================

-- Drop existing foreign key constraint if it exists
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_organization_id_fkey;

-- Rename column
ALTER TABLE invoices RENAME COLUMN organization_id TO brand_id;

-- Add NOT NULL constraint
ALTER TABLE invoices ALTER COLUMN brand_id SET NOT NULL;

-- Add new foreign key constraint
ALTER TABLE invoices 
  ADD CONSTRAINT invoices_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_invoices_brand_id ON invoices(brand_id);

-- ================================================
-- SHIPMENTS TABLE
-- ================================================

-- Drop existing foreign key constraint if it exists
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_organization_id_fkey;

-- Rename column
ALTER TABLE shipments RENAME COLUMN organization_id TO brand_id;

-- Add NOT NULL constraint
ALTER TABLE shipments ALTER COLUMN brand_id SET NOT NULL;

-- Add new foreign key constraint
ALTER TABLE shipments 
  ADD CONSTRAINT shipments_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_shipments_brand_id ON shipments(brand_id);

-- ================================================
-- NOTIFICATIONS TABLE
-- ================================================

-- Drop existing foreign key constraint if it exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_organization_id_fkey;

-- Rename column
ALTER TABLE notifications RENAME COLUMN organization_id TO brand_id;

-- Add new foreign key constraint (nullable)
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_notifications_brand_id ON notifications(brand_id);

-- ================================================
-- MARKETING_CAMPAIGNS TABLE
-- ================================================

-- Drop existing foreign key constraint if it exists
ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_organization_id_fkey;

-- Rename column
ALTER TABLE marketing_campaigns RENAME COLUMN organization_id TO brand_id;

-- Add NOT NULL constraint
ALTER TABLE marketing_campaigns ALTER COLUMN brand_id SET NOT NULL;

-- Add new foreign key constraint
ALTER TABLE marketing_campaigns 
  ADD CONSTRAINT marketing_campaigns_brand_id_fkey 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_brand_id ON marketing_campaigns(brand_id);

COMMIT;

-- Verification queries (run separately)
-- SELECT COUNT(*) FROM user_profiles WHERE brand_id IS NOT NULL;
-- SELECT COUNT(*) FROM orders WHERE brand_id IS NOT NULL;
-- SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%brand_id%';

