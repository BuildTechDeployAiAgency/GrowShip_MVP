-- ==============================================
-- Add Distributors Menu Item
-- ==============================================
-- This migration adds the Distributors menu item to the sidebar
-- and assigns appropriate permissions to roles that should see it

-- Insert the Distributors menu item
INSERT INTO sidebar_menus (
    id,
    parent_id,
    menu_label,
    menu_icon,
    route_path,
    menu_order,
    is_active,
    requires_permission,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    NULL,  -- Top level menu item
    'Distributors',
    'Building2',  -- Lucide icon name
    '/distributors',
    40,  -- Order after Dashboard (10), Sales (20), Users (30)
    true,
    'view_distributors',
    now(),
    now()
) ON CONFLICT (route_path) DO NOTHING;

-- Get the menu_id for the Distributors menu item
DO $$
DECLARE
    distributors_menu_id UUID;
    super_admin_role_id UUID;
    brand_admin_role_id UUID;
    brand_manager_role_id UUID;
BEGIN
    -- Get the menu ID
    SELECT id INTO distributors_menu_id
    FROM sidebar_menus
    WHERE route_path = '/distributors';
    
    -- If menu doesn't exist, skip
    IF distributors_menu_id IS NULL THEN
        RAISE NOTICE 'Distributors menu not found, skipping permissions';
        RETURN;
    END IF;
    
    -- Get role IDs
    SELECT id INTO super_admin_role_id FROM roles WHERE role_name = 'super_admin';
    SELECT id INTO brand_admin_role_id FROM roles WHERE role_name = 'brand_admin';
    SELECT id INTO brand_manager_role_id FROM roles WHERE role_name = 'brand_manager';
    
    -- Grant permissions to super_admin (full access)
    IF super_admin_role_id IS NOT NULL THEN
        INSERT INTO role_menu_permissions (
            id,
            role_id,
            menu_id,
            can_view,
            can_edit,
            can_delete,
            can_approve,
            created_at
        ) VALUES (
            gen_random_uuid(),
            super_admin_role_id,
            distributors_menu_id,
            true,
            true,
            true,
            true,
            now()
        ) ON CONFLICT (role_id, menu_id) DO UPDATE
        SET can_view = true, can_edit = true, can_delete = true, can_approve = true;
        
        RAISE NOTICE 'Granted full access to super_admin';
    END IF;
    
    -- Grant permissions to brand_admin (full access to their distributors)
    IF brand_admin_role_id IS NOT NULL THEN
        INSERT INTO role_menu_permissions (
            id,
            role_id,
            menu_id,
            can_view,
            can_edit,
            can_delete,
            can_approve,
            created_at
        ) VALUES (
            gen_random_uuid(),
            brand_admin_role_id,
            distributors_menu_id,
            true,
            true,
            true,
            false,
            now()
        ) ON CONFLICT (role_id, menu_id) DO UPDATE
        SET can_view = true, can_edit = true, can_delete = true, can_approve = false;
        
        RAISE NOTICE 'Granted full access to brand_admin';
    END IF;
    
    -- Grant view-only permissions to brand_manager
    IF brand_manager_role_id IS NOT NULL THEN
        INSERT INTO role_menu_permissions (
            id,
            role_id,
            menu_id,
            can_view,
            can_edit,
            can_delete,
            can_approve,
            created_at
        ) VALUES (
            gen_random_uuid(),
            brand_manager_role_id,
            distributors_menu_id,
            true,
            false,
            false,
            false,
            now()
        ) ON CONFLICT (role_id, menu_id) DO UPDATE
        SET can_view = true, can_edit = false, can_delete = false, can_approve = false;
        
        RAISE NOTICE 'Granted view access to brand_manager';
    END IF;
    
END $$;

-- ==============================================
-- Verify the menu item was added
-- ==============================================
SELECT 
    sm.id,
    sm.menu_label,
    sm.route_path,
    sm.menu_order,
    sm.is_active,
    COUNT(rmp.id) as role_permissions_count
FROM sidebar_menus sm
LEFT JOIN role_menu_permissions rmp ON sm.id = rmp.menu_id
WHERE sm.route_path = '/distributors'
GROUP BY sm.id, sm.menu_label, sm.route_path, sm.menu_order, sm.is_active;
