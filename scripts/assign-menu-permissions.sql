-- Assign menu permissions to roles after menu entries are created
-- This script grants view permissions to appropriate roles for the new menu items

-- First, get the menu IDs (adjust menu_label values if needed)
DO $$
DECLARE
    orders_menu_id UUID;
    purchase_orders_menu_id UUID;
    shipments_menu_id UUID;
    invoices_menu_id UUID;
    reports_menu_id UUID;
    financials_menu_id UUID;
    marketing_menu_id UUID;
    calendar_menu_id UUID;
    notifications_menu_id UUID;
    distributors_menu_id UUID;
    manufacturers_menu_id UUID;
    products_menu_id UUID;
    role_id UUID;
BEGIN
    -- Get menu IDs
    SELECT id INTO orders_menu_id FROM sidebar_menus WHERE route_path = '/orders' LIMIT 1;
    SELECT id INTO purchase_orders_menu_id FROM sidebar_menus WHERE route_path = '/purchase-orders' LIMIT 1;
    SELECT id INTO shipments_menu_id FROM sidebar_menus WHERE route_path = '/shipments' LIMIT 1;
    SELECT id INTO invoices_menu_id FROM sidebar_menus WHERE route_path = '/invoices' LIMIT 1;
    SELECT id INTO reports_menu_id FROM sidebar_menus WHERE route_path = '/reports' LIMIT 1;
    SELECT id INTO financials_menu_id FROM sidebar_menus WHERE route_path = '/financials' LIMIT 1;
    SELECT id INTO marketing_menu_id FROM sidebar_menus WHERE route_path = '/marketing' LIMIT 1;
    SELECT id INTO calendar_menu_id FROM sidebar_menus WHERE route_path = '/calendar' LIMIT 1;
    SELECT id INTO notifications_menu_id FROM sidebar_menus WHERE route_path = '/notifications' LIMIT 1;
    SELECT id INTO distributors_menu_id FROM sidebar_menus WHERE route_path = '/distributors' LIMIT 1;
    SELECT id INTO manufacturers_menu_id FROM sidebar_menus WHERE route_path = '/manufacturers' LIMIT 1;
    SELECT id INTO products_menu_id FROM sidebar_menus WHERE route_path = '/products' LIMIT 1;
    
    -- Grant permissions to super_admin (all menus)
    SELECT id INTO role_id FROM roles WHERE role_name = 'super_admin' LIMIT 1;
    IF role_id IS NOT NULL THEN
        -- Orders
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, orders_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = orders_menu_id);
        
        -- Purchase Orders
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, purchase_orders_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = purchase_orders_menu_id);
        
        -- Shipments
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, shipments_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = shipments_menu_id);
        
        -- Invoices
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, invoices_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = invoices_menu_id);
        
        -- Reports
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, reports_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = reports_menu_id);
        
        -- Financials
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, financials_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = financials_menu_id);
        
        -- Marketing
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, marketing_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = marketing_menu_id);
        
        -- Calendar
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, calendar_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = calendar_menu_id);
        
        -- Notifications
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, notifications_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = notifications_menu_id);
        
        -- Distributors
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, distributors_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = distributors_menu_id);
        
        -- Manufacturers
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, manufacturers_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = manufacturers_menu_id);
        
        -- Products
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, products_menu_id, true, true, true, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = products_menu_id);
    END IF;
    
    -- Grant permissions to brand_admin (most menus except manufacturers)
    SELECT id INTO role_id FROM roles WHERE role_name = 'brand_admin' LIMIT 1;
    IF role_id IS NOT NULL THEN
        -- Orders, Purchase Orders, Shipments, Invoices, Reports, Financials, Marketing, Calendar, Notifications, Distributors, Products
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, orders_menu_id, true, true, false, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = orders_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, purchase_orders_menu_id, true, true, false, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = purchase_orders_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, shipments_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = shipments_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, invoices_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = invoices_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, reports_menu_id, true, false, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = reports_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, financials_menu_id, true, false, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = financials_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, marketing_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = marketing_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, calendar_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = calendar_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, notifications_menu_id, true, false, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = notifications_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, distributors_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = distributors_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, products_menu_id, true, true, true, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = products_menu_id);
    END IF;
    
    -- Grant permissions to distributor_admin (orders, shipments, invoices, reports, financials, calendar, notifications)
    SELECT id INTO role_id FROM roles WHERE role_name = 'distributor_admin' LIMIT 1;
    IF role_id IS NOT NULL THEN
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, orders_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = orders_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, shipments_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = shipments_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, invoices_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = invoices_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, reports_menu_id, true, false, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = reports_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, financials_menu_id, true, false, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = financials_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, calendar_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = calendar_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, notifications_menu_id, true, false, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = notifications_menu_id);
    END IF;
    
    -- Grant permissions to manufacturer_admin (similar to brand_admin)
    SELECT id INTO role_id FROM roles WHERE role_name = 'manufacturer_admin' LIMIT 1;
    IF role_id IS NOT NULL THEN
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, orders_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = orders_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, purchase_orders_menu_id, true, true, false, true
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = purchase_orders_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, shipments_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = shipments_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, invoices_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = invoices_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, reports_menu_id, true, false, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = reports_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, financials_menu_id, true, false, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = financials_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, calendar_menu_id, true, true, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = calendar_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, notifications_menu_id, true, false, false, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = notifications_menu_id);
        
        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_edit, can_delete, can_approve)
        SELECT role_id, products_menu_id, true, true, true, false
        WHERE NOT EXISTS (SELECT 1 FROM role_menu_permissions WHERE role_id = role_id AND menu_id = products_menu_id);
    END IF;
END $$;