-- =====================================================
-- ROLLBACK: Brand Refactoring
-- =====================================================
-- Description: Rollback all changes from migrations 001-007
-- Date: 2025-11-04
-- Author: GrowShip Team
-- WARNING: This will reverse the brand refactoring. Use with caution!
-- =====================================================

BEGIN;

-- ================================================
-- ROLLBACK Migration 007: Database Functions
-- ================================================

-- Restore old function names
DROP FUNCTION IF EXISTS create_brand_view(uuid, text, text);

CREATE OR REPLACE FUNCTION create_organization_view(
  p_organization_id uuid,
  p_view_name text,
  p_user_table text
)
RETURNS boolean AS $$
BEGIN
  EXECUTE format(
    'CREATE OR REPLACE VIEW %I AS 
     SELECT * FROM %I 
     WHERE organization_id = %L',
    p_view_name,
    p_user_table,
    p_organization_id
  );
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop new helper functions
DROP FUNCTION IF EXISTS get_brand_distributors(uuid);
DROP FUNCTION IF EXISTS get_sales_by_distributor(uuid, date, date);

-- Recreate materialized view with organization_id
DROP MATERIALIZED VIEW IF EXISTS orders_analytics_view;

CREATE MATERIALIZED VIEW orders_analytics_view AS
SELECT 
  o.id,
  o.order_number,
  o.order_date,
  o.organization_id,
  o.customer_name,
  o.customer_type,
  o.total_amount,
  o.order_status,
  o.payment_status,
  DATE_TRUNC('month', o.order_date)::date as order_month
FROM orders o;

-- ================================================
-- ROLLBACK Migration 006: RLS Policies
-- ================================================

-- Note: RLS policies should be recreated based on your original policies
-- This is a placeholder - adjust based on your specific policies

-- ================================================
-- ROLLBACK Migration 005: Manufacturers Table
-- ================================================

ALTER TABLE manufacturers DROP CONSTRAINT IF EXISTS manufacturers_brand_id_fkey;
ALTER TABLE manufacturers RENAME COLUMN brand_id TO org_id;
ALTER TABLE manufacturers 
  ADD CONSTRAINT manufacturers_org_id_fkey 
  FOREIGN KEY (org_id) REFERENCES organizations(id);

DROP INDEX IF EXISTS idx_manufacturers_brand_id;
DROP INDEX IF EXISTS idx_manufacturers_brand_status;
CREATE INDEX IF NOT EXISTS idx_manufacturers_org_id ON manufacturers(org_id);

-- ================================================
-- ROLLBACK Migration 004: Distributor Relationships
-- ================================================

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_populate_invoice_distributor_id ON invoices;
DROP TRIGGER IF EXISTS trigger_populate_shipment_distributor_id ON shipments;
DROP FUNCTION IF EXISTS populate_invoice_distributor_id();
DROP FUNCTION IF EXISTS populate_shipment_distributor_id();

-- Remove distributor_id columns and constraints
ALTER TABLE sales_data DROP CONSTRAINT IF EXISTS sales_data_distributor_id_fkey;
ALTER TABLE sales_data DROP COLUMN IF EXISTS distributor_id;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_distributor_id_fkey;
ALTER TABLE orders DROP COLUMN IF EXISTS distributor_id;

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_distributor_id_fkey;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS distributor_id;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_distributor_id_fkey;
ALTER TABLE invoices DROP COLUMN IF EXISTS distributor_id;

ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_distributor_id_fkey;
ALTER TABLE shipments DROP COLUMN IF EXISTS distributor_id;

-- Drop indexes
DROP INDEX IF EXISTS idx_sales_data_distributor_id;
DROP INDEX IF EXISTS idx_sales_data_brand_distributor;
DROP INDEX IF EXISTS idx_sales_data_brand_distributor_date;
DROP INDEX IF EXISTS idx_orders_distributor_id;
DROP INDEX IF EXISTS idx_orders_brand_distributor;
DROP INDEX IF EXISTS idx_orders_distributor_date;
DROP INDEX IF EXISTS idx_purchase_orders_distributor_id;
DROP INDEX IF EXISTS idx_purchase_orders_brand_distributor;
DROP INDEX IF EXISTS idx_purchase_orders_distributor_date;
DROP INDEX IF EXISTS idx_invoices_distributor_id;
DROP INDEX IF EXISTS idx_invoices_brand_distributor;
DROP INDEX IF EXISTS idx_shipments_distributor_id;
DROP INDEX IF EXISTS idx_shipments_brand_distributor;

-- ================================================
-- ROLLBACK Migration 003: Distributors Table
-- ================================================

ALTER TABLE distributors DROP CONSTRAINT IF EXISTS distributors_brand_id_fkey;
ALTER TABLE distributors RENAME COLUMN brand_id TO org_id;
ALTER TABLE distributors 
  ADD CONSTRAINT distributors_org_id_fkey 
  FOREIGN KEY (org_id) REFERENCES organizations(id);

DROP INDEX IF EXISTS idx_distributors_brand_id;
DROP INDEX IF EXISTS idx_distributors_brand_status;
CREATE INDEX IF NOT EXISTS idx_distributors_org_id ON distributors(org_id);

-- ================================================
-- ROLLBACK Migration 002: Foreign Keys to organization_id
-- ================================================

-- USER_PROFILES
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_brand_id_fkey;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_parent_brand_id_fkey;
ALTER TABLE user_profiles RENAME COLUMN brand_id TO organization_id;
ALTER TABLE user_profiles RENAME COLUMN parent_brand_id TO parent_organization_id;
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_parent_organization_id_fkey 
  FOREIGN KEY (parent_organization_id) REFERENCES organizations(id);

-- USER_MEMBERSHIPS
ALTER TABLE user_memberships DROP CONSTRAINT IF EXISTS user_memberships_brand_id_fkey;
ALTER TABLE user_memberships RENAME COLUMN brand_id TO organization_id;
ALTER TABLE user_memberships 
  ADD CONSTRAINT user_memberships_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- SALES_DATA
ALTER TABLE sales_data DROP CONSTRAINT IF EXISTS sales_data_brand_id_fkey;
ALTER TABLE sales_data RENAME COLUMN brand_id TO organization_id;
ALTER TABLE sales_data 
  ADD CONSTRAINT sales_data_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- SALES_DOCUMENTS
ALTER TABLE sales_documents DROP CONSTRAINT IF EXISTS sales_documents_brand_id_fkey;
ALTER TABLE sales_documents RENAME COLUMN brand_id TO organization_id;
ALTER TABLE sales_documents 
  ADD CONSTRAINT sales_documents_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- SALES_DOCUMENTS_STORAGE
ALTER TABLE sales_documents_storage DROP CONSTRAINT IF EXISTS sales_documents_storage_brand_id_fkey;
ALTER TABLE sales_documents_storage RENAME COLUMN brand_id TO organization_id;
ALTER TABLE sales_documents_storage 
  ADD CONSTRAINT sales_documents_storage_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- ORDERS
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_brand_id_fkey;
ALTER TABLE orders RENAME COLUMN brand_id TO organization_id;
ALTER TABLE orders 
  ADD CONSTRAINT orders_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- PURCHASE_ORDERS
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_brand_id_fkey;
ALTER TABLE purchase_orders RENAME COLUMN brand_id TO organization_id;
ALTER TABLE purchase_orders 
  ADD CONSTRAINT purchase_orders_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- INVOICES
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_brand_id_fkey;
ALTER TABLE invoices RENAME COLUMN brand_id TO organization_id;
ALTER TABLE invoices 
  ADD CONSTRAINT invoices_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- SHIPMENTS
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_brand_id_fkey;
ALTER TABLE shipments RENAME COLUMN brand_id TO organization_id;
ALTER TABLE shipments 
  ADD CONSTRAINT shipments_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- NOTIFICATIONS
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_brand_id_fkey;
ALTER TABLE notifications RENAME COLUMN brand_id TO organization_id;
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- MARKETING_CAMPAIGNS
ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_brand_id_fkey;
ALTER TABLE marketing_campaigns RENAME COLUMN brand_id TO organization_id;
ALTER TABLE marketing_campaigns 
  ADD CONSTRAINT marketing_campaigns_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- ================================================
-- ROLLBACK Migration 001: Rename brands to organizations
-- ================================================

-- Drop trigger
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
DROP FUNCTION IF EXISTS update_brands_updated_at();

-- Rename table back
ALTER TABLE brands RENAME TO organizations;

-- Restore archived organizations if needed
-- INSERT INTO organizations SELECT id, name, slug, organization_type::user_role, parent_organization_id, is_active, created_at, updated_at FROM organizations_archived;

-- Restore trigger
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

COMMIT;

-- Note: After rollback, you may need to manually restore RLS policies
-- and verify that all data is intact

