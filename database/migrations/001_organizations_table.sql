-- ==============================================
-- GrowShip Organizations Table Migration
-- ==============================================
-- This migration creates the organizations table for managing
-- multi-tenant distributor, brand, and manufacturer organizations.
-- Each organization has a unique ID (UUID) and can have parent-child relationships.

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    organization_type TEXT NOT NULL CHECK (organization_type IN ('super_admin', 'brand', 'distributor', 'manufacturer')),
    parent_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Contact Information
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    
    -- Address Information
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    zip_code TEXT,
    
    -- Additional Information
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- User Memberships Table
-- ==============================================
-- Links users to organizations with their specific roles

CREATE TABLE IF NOT EXISTS user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure a user can only have one active membership per organization
    UNIQUE(user_id, organization_id)
);

-- Create indexes for user_memberships
CREATE INDEX IF NOT EXISTS idx_user_memberships_user ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_org ON user_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_active ON user_memberships(is_active);

CREATE TRIGGER update_user_memberships_updated_at BEFORE UPDATE ON user_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- Row Level Security (RLS) Policies
-- ==============================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

-- Organizations: Super admins can see all, others see their own and child orgs
CREATE POLICY "Super admins can view all organizations"
    ON organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role_name = 'super_admin'
        )
    );

CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM user_memberships
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

CREATE POLICY "Users can view child organizations"
    ON organizations FOR SELECT
    USING (
        parent_organization_id IN (
            SELECT organization_id FROM user_memberships
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

-- Organizations: Only admins can insert/update/delete
CREATE POLICY "Admin users can insert organizations"
    ON organizations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND (
                role_name = 'super_admin'
                OR role_name LIKE '%_admin'
            )
        )
    );

CREATE POLICY "Admin users can update their organizations"
    ON organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN user_memberships um ON up.user_id = um.user_id
            WHERE up.user_id = auth.uid()
            AND um.organization_id = organizations.id
            AND (
                up.role_name = 'super_admin'
                OR up.role_name LIKE '%_admin'
            )
        )
    );

CREATE POLICY "Admin users can delete their organizations"
    ON organizations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN user_memberships um ON up.user_id = um.user_id
            WHERE up.user_id = auth.uid()
            AND um.organization_id = organizations.id
            AND (
                up.role_name = 'super_admin'
                OR up.role_name LIKE '%_admin'
            )
        )
    );

-- User Memberships: Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
    ON user_memberships FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view organization memberships"
    ON user_memberships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN user_memberships um ON up.user_id = um.user_id
            WHERE up.user_id = auth.uid()
            AND um.organization_id = user_memberships.organization_id
            AND (
                up.role_name = 'super_admin'
                OR up.role_name LIKE '%_admin'
            )
        )
    );

CREATE POLICY "Admins can manage organization memberships"
    ON user_memberships FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN user_memberships um ON up.user_id = um.user_id
            WHERE up.user_id = auth.uid()
            AND um.organization_id = user_memberships.organization_id
            AND (
                up.role_name = 'super_admin'
                OR up.role_name LIKE '%_admin'
            )
        )
    );

-- ==============================================
-- Update sales_documents_storage table
-- ==============================================
-- Ensure sales documents are linked to organizations

-- Add organization_id to sales_documents_storage if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_documents_storage' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE sales_documents_storage 
        ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        CREATE INDEX idx_sales_documents_org ON sales_documents_storage(organization_id);
    END IF;
END $$;

-- ==============================================
-- Helper Functions
-- ==============================================

-- Function to get user's accessible organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    organization_type TEXT,
    is_active BOOLEAN,
    user_count BIGINT,
    sales_report_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        o.organization_type,
        o.is_active,
        COUNT(DISTINCT um.user_id) as user_count,
        COUNT(DISTINCT sds.document_id) as sales_report_count
    FROM organizations o
    LEFT JOIN user_memberships um ON o.id = um.organization_id
    LEFT JOIN sales_documents_storage sds ON o.id = sds.organization_id
    WHERE o.id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = user_uuid AND is_active = true
    )
    OR o.parent_organization_id IN (
        SELECT organization_id FROM user_memberships
        WHERE user_id = user_uuid AND is_active = true
    )
    OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = user_uuid
        AND role_name = 'super_admin'
    )
    GROUP BY o.id, o.name, o.slug, o.organization_type, o.is_active
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get distributor details with stats
CREATE OR REPLACE FUNCTION get_distributor_details(dist_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    organization_type TEXT,
    parent_organization_id UUID,
    is_active BOOLEAN,
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    zip_code TEXT,
    description TEXT,
    user_count BIGINT,
    sales_report_count BIGINT,
    active_users_count BIGINT,
    total_sales_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        o.organization_type,
        o.parent_organization_id,
        o.is_active,
        o.contact_email,
        o.contact_phone,
        o.website,
        o.address,
        o.city,
        o.state,
        o.country,
        o.zip_code,
        o.description,
        COUNT(DISTINCT um.user_id) as user_count,
        COUNT(DISTINCT sds.document_id) as sales_report_count,
        COUNT(DISTINCT CASE WHEN up.user_status = 'approved' THEN um.user_id END) as active_users_count,
        0::NUMERIC as total_sales_value, -- Placeholder for future sales aggregation
        o.created_at,
        o.updated_at
    FROM organizations o
    LEFT JOIN user_memberships um ON o.id = um.organization_id
    LEFT JOIN user_profiles up ON um.user_id = up.user_id
    LEFT JOIN sales_documents_storage sds ON o.id = sds.organization_id
    WHERE o.id = dist_id
    AND o.organization_type = 'distributor'
    GROUP BY o.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- Sample Data (Optional - for development/testing)
-- ==============================================

-- Uncomment below to insert sample distributor organizations
-- INSERT INTO organizations (name, slug, organization_type, is_active, contact_email, city, country) VALUES
-- ('Acme Distribution', 'acme-distribution', 'distributor', true, 'contact@acme.com', 'New York', 'USA'),
-- ('Global Supply Co', 'global-supply-co', 'distributor', true, 'info@globalsupply.com', 'London', 'UK'),
-- ('Pacific Distributors', 'pacific-distributors', 'distributor', true, 'hello@pacific.com', 'Sydney', 'Australia');

-- ==============================================
-- Migration Complete
-- ==============================================
