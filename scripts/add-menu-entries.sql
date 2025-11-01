-- Insert menu entries for all new platform sections
-- This script adds menu items for Orders, Purchase Orders, Shipments, Invoices, Reports, Financials, Marketing, Calendar, Notifications, Distributors, Manufacturers, and Products

-- First, check if menus already exist and get the max menu_order
DO $$
DECLARE
    max_order INTEGER;
BEGIN
    SELECT COALESCE(MAX(menu_order), 0) INTO max_order FROM sidebar_menus;
    
    -- Insert Orders menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Orders', 'ShoppingCart', '/orders', max_order + 1, true, 'can_manage_orders')
    ON CONFLICT DO NOTHING;
    
    -- Insert Purchase Orders menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Purchase Orders', 'FileText', '/purchase-orders', max_order + 2, true, 'can_manage_orders')
    ON CONFLICT DO NOTHING;
    
    -- Insert Shipments menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Shipments', 'Truck', '/shipments', max_order + 3, true, 'can_manage_orders')
    ON CONFLICT DO NOTHING;
    
    -- Insert Invoices menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Invoices', 'Receipt', '/invoices', max_order + 4, true, 'can_view_financials')
    ON CONFLICT DO NOTHING;
    
    -- Insert Reports menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Reports', 'FileText', '/reports', max_order + 5, true, NULL)
    ON CONFLICT DO NOTHING;
    
    -- Insert Financials menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Financials', 'DollarSign', '/financials', max_order + 6, true, 'can_view_financials')
    ON CONFLICT DO NOTHING;
    
    -- Insert Marketing menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Marketing', 'Megaphone', '/marketing', max_order + 7, true, NULL)
    ON CONFLICT DO NOTHING;
    
    -- Insert Calendar menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Calendar', 'Calendar', '/calendar', max_order + 8, true, NULL)
    ON CONFLICT DO NOTHING;
    
    -- Insert Notifications menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Notifications', 'Bell', '/notifications', max_order + 9, true, NULL)
    ON CONFLICT DO NOTHING;
    
    -- Insert Distributors menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Distributors', 'Building2', '/distributors', max_order + 10, true, 'can_manage_organizations')
    ON CONFLICT DO NOTHING;
    
    -- Insert Manufacturers menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Manufacturers', 'Factory', '/manufacturers', max_order + 11, true, 'can_manage_organizations')
    ON CONFLICT DO NOTHING;
    
    -- Insert Products menu
    INSERT INTO sidebar_menus (menu_label, menu_icon, route_path, menu_order, is_active, requires_permission)
    VALUES ('Products', 'Package', '/products', max_order + 12, true, 'can_manage_products')
    ON CONFLICT DO NOTHING;
END $$;

-- Note: After running this script, you'll need to assign permissions to roles in the role_menu_permissions table
-- Use the script below or assign permissions manually through the Supabase dashboard