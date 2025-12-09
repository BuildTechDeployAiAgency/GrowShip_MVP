-- Fix RLS for po_approval_history to allow distributors to view history
-- Logic: If a user can view the Purchase Order, they can view its history.

DROP POLICY IF EXISTS "Users can view approval history for their brand POs" ON po_approval_history;
DROP POLICY IF EXISTS "Users can view approval history by brand/distributor" ON po_approval_history;
DROP POLICY IF EXISTS "view_history_for_accessible_pos" ON po_approval_history;

CREATE POLICY "view_history_for_accessible_pos" ON po_approval_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders
    WHERE id = po_approval_history.po_id
    -- This relies on purchase_orders RLS policies to filter accessible POs
  )
);
