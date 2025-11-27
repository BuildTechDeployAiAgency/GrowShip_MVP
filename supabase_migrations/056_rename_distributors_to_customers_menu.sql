-- =====================================================
-- Migration 056: Rename Distributors to Customers in Menu
-- =====================================================
-- Description: Updates the menu_label for the Distributors menu item to "Customers"
-- Date: 2025-11-25
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- Update the menu label from "Distributors" to "Customers"
UPDATE menu_items 
SET menu_label = 'Customers' 
WHERE route_path = '/distributors' 
  AND menu_label = 'Distributors';

-- Also update any child menu items that might reference "Distributors"
UPDATE menu_items 
SET menu_label = REPLACE(menu_label, 'Distributor', 'Customer')
WHERE menu_label LIKE '%Distributor%';

COMMIT;

-- Verification query (run separately)
-- SELECT id, menu_label, route_path FROM menu_items WHERE route_path LIKE '%distributor%' OR menu_label LIKE '%Customer%';

