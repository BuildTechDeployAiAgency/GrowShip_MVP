-- Fix Import Menu Route
-- The import page exists at /import (singular) but the menu was set to /imports (plural)
-- This migration corrects the route path

UPDATE sidebar_menus 
SET route_path = '/import', 
    updated_at = NOW()
WHERE route_path = '/imports' 
  AND is_active = true;

-- Verify the update
SELECT id, menu_label, route_path, menu_order, is_active
FROM sidebar_menus
WHERE route_path = '/import';

