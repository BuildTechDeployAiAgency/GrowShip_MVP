-- ==========================================
-- Orders Table Migration
-- ==========================================
-- This migration creates the orders table with all necessary fields
-- and relationships for managing orders in the GrowShip platform

-- Create ENUM types for order and payment status
CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed', 
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_paid'
);

CREATE TYPE customer_type AS ENUM (
  'retail',
  'wholesale',
  'distributor',
  'manufacturer'
);

-- Main Orders Table
CREATE TABLE IF NOT EXISTS orders (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(100) UNIQUE NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- User and Organization relationship
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  
  -- Customer Information (stored as JSONB for flexibility)
  customer_id VARCHAR(100),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_type customer_type,
  
  -- Order Items (stored as JSONB array)
  items JSONB NOT NULL,
  
  -- Shipping Information (stored as JSONB)
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_zip_code VARCHAR(20),
  shipping_country VARCHAR(100),
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(100),
  estimated_delivery_date TIMESTAMP WITH TIME ZONE,
  actual_delivery_date TIMESTAMP WITH TIME ZONE,
  
  -- Financial Details
  subtotal DECIMAL(15, 2) NOT NULL,
  discount_total DECIMAL(15, 2) DEFAULT 0.00,
  tax_total DECIMAL(15, 2) DEFAULT 0.00,
  shipping_cost DECIMAL(15, 2) DEFAULT 0.00,
  total_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Payment Information
  payment_method VARCHAR(50),
  payment_status payment_status DEFAULT 'pending',
  
  -- Order Status
  order_status order_status DEFAULT 'pending',
  
  -- Additional Information
  notes TEXT,
  tags TEXT[],
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_total CHECK (total_amount >= 0),
  CONSTRAINT valid_subtotal CHECK (subtotal >= 0),
  CONSTRAINT valid_items CHECK (jsonb_array_length(items) > 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_organization_id ON orders(organization_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_customer_name ON orders(customer_name);
CREATE INDEX idx_orders_order_date ON orders(order_date DESC);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_total_amount ON orders(total_amount);

-- Composite indexes for common queries
CREATE INDEX idx_orders_user_org ON orders(user_id, organization_id);
CREATE INDEX idx_orders_org_status ON orders(organization_id, order_status);
CREATE INDEX idx_orders_org_date ON orders(organization_id, order_date DESC);

-- GIN index for JSONB columns and array
CREATE INDEX idx_orders_items ON orders USING GIN(items);
CREATE INDEX idx_orders_tags ON orders USING GIN(tags);

-- Full text search index for customer name and order number
CREATE INDEX idx_orders_search ON orders USING GIN(
  to_tsvector('english', 
    coalesce(order_number, '') || ' ' || 
    coalesce(customer_name, '') || ' ' || 
    coalesce(notes, '')
  )
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Create Row Level Security (RLS) policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view orders from their organization
CREATE POLICY orders_select_policy ON orders
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Users can insert orders for their organization
CREATE POLICY orders_insert_policy ON orders
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Users can update orders from their organization
CREATE POLICY orders_update_policy ON orders
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Only admins can delete orders
CREATE POLICY orders_delete_policy ON orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role_name IN ('super_admin', 'brand_admin', 'distributor_admin', 'manufacturer_admin')
    )
  );

-- Create materialized view for organization-level order analytics
CREATE MATERIALIZED VIEW orders_analytics_view AS
SELECT 
  organization_id,
  DATE_TRUNC('month', order_date) as month,
  order_status,
  payment_status,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value,
  SUM(JSONB_ARRAY_LENGTH(items)) as total_items_sold,
  COUNT(DISTINCT customer_id) as unique_customers
FROM orders
GROUP BY organization_id, DATE_TRUNC('month', order_date), order_status, payment_status;

-- Create index on materialized view
CREATE INDEX idx_orders_analytics_org ON orders_analytics_view(organization_id);
CREATE INDEX idx_orders_analytics_month ON orders_analytics_view(month DESC);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_orders_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY orders_analytics_view;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE orders IS 'Main orders table storing all order information';
COMMENT ON COLUMN orders.items IS 'JSON array of order items with product details, quantities, and pricing';
COMMENT ON COLUMN orders.tags IS 'Array of tags for categorizing and filtering orders';
COMMENT ON COLUMN orders.customer_type IS 'Type of customer: retail, wholesale, distributor, or manufacturer';
