-- ============================================================================
-- Migration: Seed Notification Registry with All Known Types
-- Date: 2025-12-09
-- Description: Populates notification_types with all 30 identified notifications
--              and creates default role settings mirroring current hardcoded logic
-- ============================================================================

-- ============================================================================
-- 1. SEED NOTIFICATION TYPES
-- ============================================================================

-- Clear existing data (for re-runs during development)
-- TRUNCATE notification_role_settings CASCADE;
-- TRUNCATE notification_types CASCADE;

-- Purchase Orders (7 types)
INSERT INTO notification_types (key, name, category, description, default_priority, default_action_required, supported_roles, module, trigger_location)
VALUES 
  ('po_created', 'New Purchase Order Created', 'purchase_order', 
   'Triggered when a new PO is created and requires review',
   'medium', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'brand_reviewer', 'super_admin'],
   'po-alerts', 'lib/notifications/po-alerts.ts → createPOCreatedAlert()'),
   
  ('po_approval_required', 'Purchase Order Approval Required', 'purchase_order',
   'Triggered when a PO is submitted and requires approval',
   'high', true,
   ARRAY['brand_admin', 'brand_manager', 'super_admin'],
   'po-alerts', 'lib/notifications/po-alerts.ts → createPOApprovalAlert()'),
   
  ('po_approved', 'Purchase Order Approved', 'purchase_order',
   'Notifies PO creator when their PO is approved',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'brand_reviewer'],
   'po-alerts', 'lib/notifications/po-alerts.ts → createPOStatusChangeAlert()'),
   
  ('po_rejected', 'Purchase Order Rejected', 'purchase_order',
   'Notifies PO creator when their PO is rejected',
   'medium', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'brand_reviewer'],
   'po-alerts', 'lib/notifications/po-alerts.ts → createPOStatusChangeAlert()'),
   
  ('po_placed', 'Purchase Order Placed', 'purchase_order',
   'Notifies when PO status changes to ordered',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'brand_reviewer'],
   'po-alerts', 'lib/notifications/po-alerts.ts → createPOStatusChangeAlert()'),
   
  ('po_received', 'Purchase Order Received', 'purchase_order',
   'Notifies when PO is marked as received and inventory is updated',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'brand_reviewer'],
   'po-sync', 'lib/inventory/po-sync.ts → syncPOReceipt()'),
   
  ('po_approval_due', 'PO Approval Due Reminder', 'purchase_order',
   'Reminder for upcoming PO approval deadlines from calendar events',
   'high', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'super_admin'],
   'compliance-alerts', 'lib/notifications/compliance-alerts.ts → checkCalendarEventAlerts()')
ON CONFLICT (key) DO NOTHING;

-- Inventory Management (9 types)
INSERT INTO notification_types (key, name, category, description, default_priority, default_action_required, supported_roles, module, trigger_location)
VALUES
  ('product_out_of_stock', 'Product Out of Stock', 'inventory',
   'Alert when product quantity reaches zero',
   'urgent', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'inventory-alerts', 'lib/notifications/inventory-alerts.ts → createLowStockAlert()'),
   
  ('critical_stock_level', 'Critical Stock Level', 'inventory',
   'Alert when product stock falls below critical threshold',
   'urgent', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'inventory-alerts', 'lib/notifications/inventory-alerts.ts → createLowStockAlert()'),
   
  ('low_stock_alert', 'Low Stock Alert', 'inventory',
   'Alert when product stock falls below low stock threshold',
   'high', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'inventory-alerts', 'lib/notifications/inventory-alerts.ts → createLowStockAlert()'),
   
  ('low_available_stock', 'Low Available Stock', 'inventory',
   'Alert when available stock (after allocations) falls below threshold',
   'high', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'order-sync', 'lib/inventory/order-sync.ts → syncOrderAllocation()'),
   
  ('stock_running_out_soon', 'Stock Running Out Soon', 'inventory',
   'Predictive alert based on sales velocity (projected stock-out within 7 days)',
   'high', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'inventory-alerts', 'lib/notifications/inventory-alerts.ts → createRunningOutSoonAlert()'),
   
  ('stock_replenished', 'Stock Replenished', 'inventory',
   'Notification when stock is replenished above low threshold',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'inventory-alerts', 'lib/notifications/inventory-alerts.ts → createStockRestoredAlert()'),
   
  ('overstock_alert', 'Overstock Alert', 'inventory',
   'Alert when product stock exceeds maximum threshold',
   'medium', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'inventory-alerts', 'lib/notifications/inventory-alerts.ts → createOverstockAlert()'),
   
  ('manual_stock_adjustment', 'Manual Stock Adjustment', 'inventory',
   'Notification when manual stock adjustment is made',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'inventory-api', 'app/api/inventory/adjust/route.ts'),
   
  ('bulk_stock_adjustment', 'Bulk Stock Adjustment', 'inventory',
   'Summary notification for bulk stock adjustments',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'inventory-api', 'app/api/inventory/bulk-adjust/route.ts')
ON CONFLICT (key) DO NOTHING;

-- Payments & Invoices (2 types)
INSERT INTO notification_types (key, name, category, description, default_priority, default_action_required, supported_roles, module, trigger_location)
VALUES
  ('payment_due_soon', 'Payment Due Soon', 'payment',
   'Reminder for invoices due within 7 days',
   'high', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics'],
   'payment-alerts', 'lib/notifications/payment-alerts.ts → checkPaymentDueAlerts()'),
   
  ('payment_due_reminder', 'Payment Due Reminder', 'payment',
   'Reminder for upcoming payment due dates from calendar events',
   'high', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'super_admin'],
   'compliance-alerts', 'lib/notifications/compliance-alerts.ts → checkCalendarEventAlerts()')
ON CONFLICT (key) DO NOTHING;

-- Shipments (7 types)
INSERT INTO notification_types (key, name, category, description, default_priority, default_action_required, supported_roles, module, trigger_location)
VALUES
  ('shipment_created', 'Shipment Created', 'shipment',
   'Notification when a new shipment is created for an order',
   'medium', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'distributor_admin'],
   'shipment-sql', 'DB function: create_shipment_transaction()'),
   
  ('shipment_shipped', 'Shipment Shipped', 'shipment',
   'Notification when shipment status changes to shipped',
   'medium', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'distributor_admin'],
   'shipment-sql', 'DB function: update_shipment_status()'),
   
  ('shipment_in_transit', 'Shipment In Transit', 'shipment',
   'Notification when shipment status changes to in_transit',
   'medium', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'distributor_admin'],
   'shipment-sql', 'DB function: update_shipment_status()'),
   
  ('shipment_delivered', 'Shipment Delivered', 'shipment',
   'Notification when shipment status changes to delivered',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'distributor_admin'],
   'shipment-sql', 'DB function: update_shipment_status()'),
   
  ('shipment_cancelled', 'Shipment Cancelled', 'shipment',
   'Notification when shipment status changes to cancelled',
   'medium', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'distributor_admin'],
   'shipment-sql', 'DB function: update_shipment_status()'),
   
  ('shipment_failed', 'Shipment Failed', 'shipment',
   'Notification when shipment status changes to failed',
   'high', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'distributor_admin'],
   'shipment-sql', 'DB function: update_shipment_status()'),
   
  ('shipment_arrival_reminder', 'Shipment Arrival Reminder', 'shipment',
   'Reminder for upcoming shipment arrivals from calendar events',
   'medium', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'super_admin'],
   'compliance-alerts', 'lib/notifications/compliance-alerts.ts → checkCalendarEventAlerts()')
ON CONFLICT (key) DO NOTHING;

-- Orders (3 types)
INSERT INTO notification_types (key, name, category, description, default_priority, default_action_required, supported_roles, module, trigger_location)
VALUES
  ('order_fulfilled', 'Order Fulfilled', 'order',
   'Notification when order is fulfilled and inventory is consumed',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'distributor_admin'],
   'order-sync', 'lib/inventory/order-sync.ts → syncOrderFulfillment()'),
   
  ('order_cancelled', 'Order Cancelled', 'order',
   'Notification when order is cancelled and allocated stock is released',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'distributor_admin'],
   'order-sync', 'lib/inventory/order-sync.ts → syncOrderCancellation()'),
   
  ('backorder_review_reminder', 'Backorder Review Reminder', 'order',
   'Reminder for backorder review events from calendar',
   'medium', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'super_admin'],
   'compliance-alerts', 'lib/notifications/compliance-alerts.ts → checkCalendarEventAlerts()')
ON CONFLICT (key) DO NOTHING;

-- Calendar Events (1 type)
INSERT INTO notification_types (key, name, category, description, default_priority, default_action_required, supported_roles, module, trigger_location)
VALUES
  ('custom_event_reminder', 'Custom Event Reminder', 'calendar',
   'Generic reminder for custom calendar events',
   'low', false,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'super_admin'],
   'compliance-alerts', 'lib/notifications/compliance-alerts.ts → checkCalendarEventAlerts()')
ON CONFLICT (key) DO NOTHING;

-- Compliance (1 type)
INSERT INTO notification_types (key, name, category, description, default_priority, default_action_required, supported_roles, module, trigger_location)
VALUES
  ('compliance_review_due', 'Compliance Review Due', 'compliance',
   'Alert for upcoming monthly distributor compliance review deadlines',
   'high', true,
   ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'super_admin'],
   'compliance-alerts', 'lib/notifications/compliance-alerts.ts → checkComplianceAlerts()')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. SEED DEFAULT ROLE SETTINGS
-- ============================================================================
-- This mirrors the CURRENT hardcoded logic to ensure no functionality is lost

-- Helper function to create default settings for a notification type
CREATE OR REPLACE FUNCTION seed_notification_role_settings()
RETURNS void AS $$
DECLARE
  v_type RECORD;
  v_role TEXT;
BEGIN
  -- Loop through all notification types
  FOR v_type IN SELECT id, key, supported_roles FROM notification_types LOOP
    -- Create settings for each supported role
    FOREACH v_role IN ARRAY v_type.supported_roles LOOP
      INSERT INTO notification_role_settings (
        notification_type_id,
        role,
        is_enabled,
        frequency,
        channels
      )
      VALUES (
        v_type.id,
        v_role,
        true, -- Default enabled
        'instant', -- Default instant delivery
        '["in_app"]'::jsonb -- Default in-app only
      )
      ON CONFLICT (notification_type_id, role) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the seed function
SELECT seed_notification_role_settings();

-- Drop the helper function (no longer needed)
DROP FUNCTION IF EXISTS seed_notification_role_settings();

-- ============================================================================
-- 3. CUSTOM OVERRIDES (Match Current Hardcoded Logic)
-- ============================================================================

-- PO Created: Exclude brand_manager (current logic only notifies admin, logistics, reviewer)
UPDATE notification_role_settings 
SET is_enabled = false
WHERE notification_type_id = (SELECT id FROM notification_types WHERE key = 'po_created')
  AND role = 'brand_manager';

-- PO Approval Required: Only admin and manager can approve
UPDATE notification_role_settings 
SET is_enabled = false
WHERE notification_type_id = (SELECT id FROM notification_types WHERE key = 'po_approval_required')
  AND role NOT IN ('brand_admin', 'brand_manager', 'super_admin');

-- Shipment notifications: Enable for both brand and distributor (current behavior)
-- Already set correctly via supported_roles

-- Distributor notifications: Currently disabled for most non-shipment types
-- This is the current state - distributors only get shipment notifications
UPDATE notification_role_settings 
SET is_enabled = false
WHERE role = 'distributor_admin'
  AND notification_type_id IN (
    SELECT id FROM notification_types 
    WHERE category NOT IN ('shipment', 'order')
  );

-- ============================================================================
-- 4. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_type_count INTEGER;
  v_settings_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_type_count FROM notification_types;
  SELECT COUNT(*) INTO v_settings_count FROM notification_role_settings;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Notification Registry Seed Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Notification Types created: %', v_type_count;
  RAISE NOTICE 'Role Settings created: %', v_settings_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Categories:';
  RAISE NOTICE '  - Purchase Orders: 7 types';
  RAISE NOTICE '  - Inventory: 9 types';
  RAISE NOTICE '  - Payments: 2 types';
  RAISE NOTICE '  - Shipments: 7 types';
  RAISE NOTICE '  - Orders: 3 types';
  RAISE NOTICE '  - Calendar: 1 type';
  RAISE NOTICE '  - Compliance: 1 type';
  RAISE NOTICE '========================================';
END $$;

-- Show summary of settings
SELECT 
  nt.category,
  nt.key,
  nt.name,
  COUNT(nrs.id) AS role_settings,
  COUNT(CASE WHEN nrs.is_enabled THEN 1 END) AS enabled_roles
FROM notification_types nt
LEFT JOIN notification_role_settings nrs ON nrs.notification_type_id = nt.id
GROUP BY nt.id, nt.category, nt.key, nt.name
ORDER BY nt.category, nt.key;
