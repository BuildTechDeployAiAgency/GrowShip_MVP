-- Brand-Distributor Relationships Management Schema
-- Purpose: Enable many-to-many relationships between brands and distributors
-- with rich metadata and relationship lifecycle management

-- Create relationship status enum
CREATE TYPE relationship_status AS ENUM (
  'pending',      -- Awaiting approval
  'active',       -- Currently active relationship
  'suspended',    -- Temporarily suspended
  'terminated'    -- Permanently ended
);

-- Create territory priority enum
CREATE TYPE territory_priority AS ENUM (
  'primary',      -- Primary distributor for territory
  'secondary',    -- Secondary/backup distributor
  'shared'        -- Shared territory access
);

-- Create brand_distributor_relationships table
CREATE TABLE IF NOT EXISTS brand_distributor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core relationship data
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  
  -- Relationship metadata
  status relationship_status NOT NULL DEFAULT 'pending',
  territory_priority territory_priority NOT NULL DEFAULT 'primary',
  
  -- Territory and business details
  assigned_territories TEXT[], -- Array of territory IDs or names
  commission_rate DECIMAL(5,2), -- Commission percentage (e.g., 15.50)
  contract_start_date DATE,
  contract_end_date DATE,
  minimum_order_value DECIMAL(12,2),
  credit_limit DECIMAL(12,2),
  
  -- Business terms
  payment_terms TEXT, -- e.g., "Net 30", "COD", etc.
  shipping_terms TEXT, -- e.g., "FOB", "CIF", etc.
  exclusive_territories BOOLEAN DEFAULT FALSE,
  
  -- Performance tracking
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  performance_rating DECIMAL(3,2), -- 1.00 to 5.00 rating
  
  -- Approval and tracking
  approved_by UUID REFERENCES user_profiles(user_id),
  approved_at TIMESTAMP WITH TIME ZONE,
  suspended_reason TEXT,
  termination_reason TEXT,
  
  -- Audit fields
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(user_id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique active relationships per brand-distributor pair
  CONSTRAINT unique_active_brand_distributor 
    UNIQUE (brand_id, distributor_id) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX idx_brand_distributor_relationships_brand_id 
  ON brand_distributor_relationships(brand_id);
  
CREATE INDEX idx_brand_distributor_relationships_distributor_id 
  ON brand_distributor_relationships(distributor_id);
  
CREATE INDEX idx_brand_distributor_relationships_status 
  ON brand_distributor_relationships(status);
  
CREATE INDEX idx_brand_distributor_relationships_territories 
  ON brand_distributor_relationships USING GIN (assigned_territories);
  
CREATE INDEX idx_brand_distributor_relationships_created_at 
  ON brand_distributor_relationships(created_at DESC);

-- Create relationship history table for audit trail
CREATE TABLE IF NOT EXISTS brand_distributor_relationship_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES brand_distributor_relationships(id) ON DELETE CASCADE,
  
  -- Change tracking
  change_type TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'terminated'
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  
  -- Audit fields
  changed_by UUID REFERENCES user_profiles(user_id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_relationship_history_relationship_id 
  ON brand_distributor_relationship_history(relationship_id);
  
CREATE INDEX idx_relationship_history_changed_at 
  ON brand_distributor_relationship_history(changed_at DESC);

-- Enable Row Level Security
ALTER TABLE brand_distributor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_distributor_relationship_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_distributor_relationships

-- Super admins can see all relationships
CREATE POLICY "Super admins can manage all brand distributor relationships" ON brand_distributor_relationships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role_name = 'super_admin'
    )
  );

-- Brand admins can manage relationships for their brand
CREATE POLICY "Brand admins can manage their brand relationships" ON brand_distributor_relationships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.brand_id = brand_distributor_relationships.brand_id
      AND user_profiles.role_name LIKE 'brand_%'
    )
  );

-- Distributor admins can view relationships for their distributor
CREATE POLICY "Distributor admins can view their distributor relationships" ON brand_distributor_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.distributor_id = brand_distributor_relationships.distributor_id
      AND user_profiles.role_name LIKE 'distributor_%'
    )
  );

-- RLS Policies for relationship history

-- Super admins can see all relationship history
CREATE POLICY "Super admins can view all relationship history" ON brand_distributor_relationship_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role_name = 'super_admin'
    )
  );

-- Brand admins can see history for their brand relationships
CREATE POLICY "Brand admins can view their brand relationship history" ON brand_distributor_relationship_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      JOIN brand_distributor_relationships bdr ON bdr.id = brand_distributor_relationship_history.relationship_id
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.brand_id = bdr.brand_id
      AND user_profiles.role_name LIKE 'brand_%'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_distributor_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
CREATE TRIGGER update_brand_distributor_relationships_updated_at_trigger
  BEFORE UPDATE ON brand_distributor_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_distributor_relationships_updated_at();

-- Function to create relationship history entries
CREATE OR REPLACE FUNCTION create_relationship_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert history record for updates
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO brand_distributor_relationship_history (
      relationship_id,
      change_type,
      old_values,
      new_values,
      changed_by
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.status != NEW.status THEN 'status_changed'
        ELSE 'updated'
      END,
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  
  -- Insert history record for inserts
  IF TG_OP = 'INSERT' THEN
    INSERT INTO brand_distributor_relationship_history (
      relationship_id,
      change_type,
      old_values,
      new_values,
      changed_by
    ) VALUES (
      NEW.id,
      'created',
      NULL,
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  
  -- Insert history record for deletes
  IF TG_OP = 'DELETE' THEN
    INSERT INTO brand_distributor_relationship_history (
      relationship_id,
      change_type,
      old_values,
      new_values,
      changed_by
    ) VALUES (
      OLD.id,
      'terminated',
      to_jsonb(OLD),
      NULL,
      auth.uid()
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create history entries
CREATE TRIGGER create_relationship_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON brand_distributor_relationships
  FOR EACH ROW
  EXECUTE FUNCTION create_relationship_history();

-- Function to update performance metrics
CREATE OR REPLACE FUNCTION update_relationship_performance()
RETURNS TRIGGER AS $$
DECLARE
  rel_record RECORD;
BEGIN
  -- Update relationship performance when sales data changes
  FOR rel_record IN 
    SELECT DISTINCT bdr.id 
    FROM brand_distributor_relationships bdr
    WHERE bdr.brand_id = COALESCE(NEW.brand_id, OLD.brand_id)
    AND bdr.distributor_id = COALESCE(NEW.distributor_id, OLD.distributor_id)
    AND bdr.status = 'active'
  LOOP
    UPDATE brand_distributor_relationships
    SET 
      total_revenue = COALESCE((
        SELECT SUM(total_amount)
        FROM sales_data sd
        WHERE sd.brand_id = brand_distributor_relationships.brand_id
        AND sd.distributor_id = brand_distributor_relationships.distributor_id
      ), 0),
      total_orders = COALESCE((
        SELECT COUNT(*)
        FROM orders o
        WHERE o.brand_id = brand_distributor_relationships.brand_id
        AND o.distributor_id = brand_distributor_relationships.distributor_id
      ), 0),
      updated_at = NOW()
    WHERE id = rel_record.id;
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Insert initial relationships based on existing distributor-brand assignments
-- This maintains backward compatibility with existing data
INSERT INTO brand_distributor_relationships (
  brand_id,
  distributor_id,
  status,
  territory_priority,
  assigned_territories,
  created_by,
  created_at
)
SELECT 
  d.brand_id,
  d.id as distributor_id,
  'active'::relationship_status,
  'primary'::territory_priority,
  CASE 
    WHEN d.primary_territory IS NOT NULL THEN ARRAY[d.primary_territory]
    ELSE ARRAY[]::TEXT[]
  END,
  (SELECT user_id FROM user_profiles WHERE role_name = 'super_admin' LIMIT 1),
  d.created_at
FROM distributors d
WHERE d.brand_id IS NOT NULL
ON CONFLICT (brand_id, distributor_id) DO NOTHING;

-- Create a view for easy relationship querying with brand and distributor details
CREATE OR REPLACE VIEW brand_distributor_relationships_detailed AS
SELECT 
  bdr.*,
  b.name as brand_name,
  b.slug as brand_slug,
  b.organization_type as brand_type,
  d.name as distributor_name,
  d.company_name as distributor_company,
  d.email as distributor_email,
  d.primary_territory as distributor_primary_territory,
  d.territory_ids as distributor_territory_ids,
  -- Performance calculations
  CASE 
    WHEN bdr.total_orders > 0 THEN bdr.total_revenue / bdr.total_orders
    ELSE 0
  END as average_order_value,
  -- Relationship age in days
  EXTRACT(days FROM NOW() - bdr.created_at) as relationship_age_days,
  -- Contract status
  CASE 
    WHEN bdr.contract_end_date IS NOT NULL AND bdr.contract_end_date < CURRENT_DATE THEN 'expired'
    WHEN bdr.contract_end_date IS NOT NULL AND bdr.contract_end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'active'
  END as contract_status
FROM brand_distributor_relationships bdr
JOIN brands b ON b.id = bdr.brand_id
JOIN distributors d ON d.id = bdr.distributor_id;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON brand_distributor_relationships TO authenticated;
GRANT SELECT ON brand_distributor_relationship_history TO authenticated;
GRANT SELECT ON brand_distributor_relationships_detailed TO authenticated;

-- Add helpful comments
COMMENT ON TABLE brand_distributor_relationships IS 'Many-to-many relationships between brands and distributors with business terms and performance tracking';
COMMENT ON TABLE brand_distributor_relationship_history IS 'Audit trail for all changes to brand-distributor relationships';
COMMENT ON VIEW brand_distributor_relationships_detailed IS 'Comprehensive view of relationships with brand and distributor details plus calculated fields';

-- Add constraint to prevent overlapping exclusive territories (business rule)
-- This will be enforced at the application level for flexibility