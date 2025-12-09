-- ================================================
-- MIGRATION: BACKFILL CALENDAR EVENTS
-- ================================================
-- Description: Backfill calendar_events table with events from existing
--              invoices, purchase orders, shipments, and marketing campaigns
-- Date: December 7, 2025
-- Author: GrowShip MVP Team
-- ================================================
-- USAGE: Run this script in Supabase Dashboard > SQL Editor
-- NOTE: This is a one-time backfill script, not an automated migration
-- ================================================

BEGIN;

-- ================================================
-- 1. CLEAN UP EXISTING SYSTEM-GENERATED EVENTS
-- ================================================
-- Remove all non-custom events to prevent duplicates
-- Custom events created by users are preserved

DELETE FROM calendar_events
WHERE event_type != 'custom';

-- ================================================
-- 2. BACKFILL "PAYMENT DUE" EVENTS FROM INVOICES
-- ================================================
-- Create events for pending invoices with due dates in the next 90 days

INSERT INTO calendar_events (
  brand_id,
  event_type,
  title,
  description,
  event_date,
  related_entity_type,
  related_entity_id,
  is_all_day,
  distributor_id,
  status,
  created_at,
  updated_at
)
SELECT 
  i.brand_id,
  'payment_due'::calendar_event_type,
  'Payment Due: ' || i.invoice_number,
  'Invoice ' || i.invoice_number || ' payment is due. Amount: $' || 
    COALESCE(TO_CHAR(i.total_amount, 'FM999,999,990.00'), '0.00'),
  i.due_date,
  'invoice',
  i.id,
  true,
  i.distributor_id,
  CASE 
    WHEN i.due_date < CURRENT_DATE THEN 'overdue'::calendar_event_status
    ELSE 'upcoming'::calendar_event_status
  END,
  NOW(),
  NOW()
FROM invoices i
WHERE i.payment_status = 'pending'
  AND i.due_date IS NOT NULL
  AND i.due_date >= CURRENT_DATE - INTERVAL '30 days'
  AND i.due_date <= CURRENT_DATE + INTERVAL '90 days';

-- ================================================
-- 3. BACKFILL "PO APPROVAL DUE" EVENTS FROM PURCHASE ORDERS
-- ================================================
-- Create events for submitted POs (due 3 days after submission)

INSERT INTO calendar_events (
  brand_id,
  event_type,
  title,
  description,
  event_date,
  related_entity_type,
  related_entity_id,
  is_all_day,
  distributor_id,
  status,
  created_at,
  updated_at
)
SELECT 
  po.brand_id,
  'po_approval_due'::calendar_event_type,
  'PO Approval Due: ' || po.po_number,
  'Purchase Order ' || po.po_number || ' requires approval. Amount: $' || 
    COALESCE(TO_CHAR(po.total_amount, 'FM999,999,990.00'), '0.00'),
  COALESCE(po.submitted_at::date, po.created_at::date) + INTERVAL '3 days',
  'po',
  po.id,
  true,
  po.distributor_id,
  CASE 
    WHEN (COALESCE(po.submitted_at::date, po.created_at::date) + INTERVAL '3 days') < CURRENT_DATE 
      THEN 'overdue'::calendar_event_status
    ELSE 'upcoming'::calendar_event_status
  END,
  NOW(),
  NOW()
FROM purchase_orders po
WHERE po.po_status = 'submitted';

-- ================================================
-- 4. BACKFILL "SHIPMENT ARRIVAL" EVENTS FROM PURCHASE ORDERS
-- ================================================
-- Create events for approved/ordered POs with expected delivery dates

INSERT INTO calendar_events (
  brand_id,
  event_type,
  title,
  description,
  event_date,
  related_entity_type,
  related_entity_id,
  is_all_day,
  distributor_id,
  status,
  created_at,
  updated_at
)
SELECT 
  po.brand_id,
  'shipment_arrival'::calendar_event_type,
  'Shipment Arrival: ' || po.po_number,
  'Purchase Order ' || po.po_number || ' shipment is expected to arrive. Amount: $' || 
    COALESCE(TO_CHAR(po.total_amount, 'FM999,999,990.00'), '0.00'),
  po.expected_delivery_date,
  'po',
  po.id,
  true,
  po.distributor_id,
  CASE 
    WHEN po.expected_delivery_date < CURRENT_DATE THEN 'overdue'::calendar_event_status
    ELSE 'upcoming'::calendar_event_status
  END,
  NOW(),
  NOW()
FROM purchase_orders po
WHERE po.po_status IN ('approved', 'ordered')
  AND po.expected_delivery_date IS NOT NULL
  AND po.expected_delivery_date >= CURRENT_DATE - INTERVAL '7 days'
  AND po.expected_delivery_date <= CURRENT_DATE + INTERVAL '90 days';

-- ================================================
-- 5. BACKFILL "BACKORDER REVIEW" EVENTS FROM PURCHASE ORDERS
-- ================================================
-- Create events 14 days after PO date for backorder review

INSERT INTO calendar_events (
  brand_id,
  event_type,
  title,
  description,
  event_date,
  related_entity_type,
  related_entity_id,
  is_all_day,
  distributor_id,
  status,
  created_at,
  updated_at
)
SELECT 
  po.brand_id,
  'backorder_review'::calendar_event_type,
  'Backorder Review: ' || po.po_number,
  'Review backorder status and fill rate for Purchase Order ' || po.po_number,
  po.po_date + INTERVAL '14 days',
  'po',
  po.id,
  true,
  po.distributor_id,
  CASE 
    WHEN (po.po_date + INTERVAL '14 days') < CURRENT_DATE THEN 'overdue'::calendar_event_status
    ELSE 'upcoming'::calendar_event_status
  END,
  NOW(),
  NOW()
FROM purchase_orders po
WHERE po.po_status IN ('approved', 'ordered')
  AND po.po_date IS NOT NULL
  AND (po.po_date + INTERVAL '14 days') >= CURRENT_DATE
  AND (po.po_date + INTERVAL '14 days') <= CURRENT_DATE + INTERVAL '90 days';

-- ================================================
-- 6. BACKFILL "DELIVERY MILESTONE" EVENTS FROM SHIPMENTS
-- ================================================
-- Create events for active shipments with estimated delivery dates

INSERT INTO calendar_events (
  brand_id,
  event_type,
  title,
  description,
  event_date,
  related_entity_type,
  related_entity_id,
  is_all_day,
  distributor_id,
  status,
  created_at,
  updated_at
)
SELECT 
  s.brand_id,
  'delivery_milestone'::calendar_event_type,
  'Delivery Expected: ' || COALESCE(s.tracking_number, 'Shipment'),
  'Shipment ' || COALESCE(s.tracking_number, s.id::text) || ' is expected to be delivered. Status: ' || s.shipment_status,
  s.estimated_delivery_date,
  'shipment',
  s.id,
  true,
  s.distributor_id,
  CASE 
    WHEN s.estimated_delivery_date < CURRENT_DATE THEN 'overdue'::calendar_event_status
    ELSE 'upcoming'::calendar_event_status
  END,
  NOW(),
  NOW()
FROM shipments s
WHERE s.shipment_status IN ('pending', 'in_transit', 'out_for_delivery')
  AND s.estimated_delivery_date IS NOT NULL
  AND s.estimated_delivery_date >= CURRENT_DATE - INTERVAL '7 days'
  AND s.estimated_delivery_date <= CURRENT_DATE + INTERVAL '90 days';

-- ================================================
-- 7. BACKFILL "CAMPAIGN START" EVENTS FROM MARKETING CAMPAIGNS
-- ================================================
-- Create events for planned/active campaigns with upcoming start dates

INSERT INTO calendar_events (
  brand_id,
  event_type,
  title,
  description,
  event_date,
  related_entity_type,
  related_entity_id,
  is_all_day,
  status,
  created_at,
  updated_at
)
SELECT 
  mc.brand_id,
  'campaign_start'::calendar_event_type,
  'Campaign Start: ' || mc.name,
  'Marketing campaign "' || mc.name || '" starts today',
  mc.start_date,
  'campaign',
  mc.id,
  true,
  CASE 
    WHEN mc.start_date < CURRENT_DATE THEN 'done'::calendar_event_status
    ELSE 'upcoming'::calendar_event_status
  END,
  NOW(),
  NOW()
FROM marketing_campaigns mc
WHERE mc.status IN ('planned', 'active')
  AND mc.start_date IS NOT NULL
  AND mc.start_date >= CURRENT_DATE - INTERVAL '30 days'
  AND mc.start_date <= CURRENT_DATE + INTERVAL '90 days';

-- ================================================
-- 8. BACKFILL "CAMPAIGN END" EVENTS FROM MARKETING CAMPAIGNS
-- ================================================
-- Create events for planned/active campaigns with upcoming end dates

INSERT INTO calendar_events (
  brand_id,
  event_type,
  title,
  description,
  event_date,
  related_entity_type,
  related_entity_id,
  is_all_day,
  status,
  created_at,
  updated_at
)
SELECT 
  mc.brand_id,
  'campaign_end'::calendar_event_type,
  'Campaign End: ' || mc.name,
  'Marketing campaign "' || mc.name || '" ends today',
  mc.end_date,
  'campaign',
  mc.id,
  true,
  CASE 
    WHEN mc.end_date < CURRENT_DATE THEN 'done'::calendar_event_status
    ELSE 'upcoming'::calendar_event_status
  END,
  NOW(),
  NOW()
FROM marketing_campaigns mc
WHERE mc.status IN ('planned', 'active')
  AND mc.end_date IS NOT NULL
  AND mc.end_date >= CURRENT_DATE - INTERVAL '30 days'
  AND mc.end_date <= CURRENT_DATE + INTERVAL '90 days';

-- ================================================
-- 9. BACKFILL "POP UPLOAD DUE" EVENTS FROM MARKETING CAMPAIGNS
-- ================================================
-- Create events 3 days after campaign end for POP upload deadline

INSERT INTO calendar_events (
  brand_id,
  event_type,
  title,
  description,
  event_date,
  related_entity_type,
  related_entity_id,
  is_all_day,
  status,
  created_at,
  updated_at
)
SELECT 
  mc.brand_id,
  'pop_upload_due'::calendar_event_type,
  'POP Upload Due: ' || mc.name,
  'Proof of performance documents are due for campaign "' || mc.name || '"',
  mc.end_date + INTERVAL '3 days',
  'campaign',
  mc.id,
  true,
  CASE 
    WHEN (mc.end_date + INTERVAL '3 days') < CURRENT_DATE THEN 'overdue'::calendar_event_status
    ELSE 'upcoming'::calendar_event_status
  END,
  NOW(),
  NOW()
FROM marketing_campaigns mc
WHERE mc.status IN ('planned', 'active')
  AND mc.end_date IS NOT NULL
  AND (mc.end_date + INTERVAL '3 days') >= CURRENT_DATE
  AND (mc.end_date + INTERVAL '3 days') <= CURRENT_DATE + INTERVAL '90 days';

-- ================================================
-- 10. BACKFILL "COMPLIANCE REVIEW" EVENTS FROM DISTRIBUTORS
-- ================================================
-- Create monthly compliance review events for active distributors
-- Due on the 5th of each month for the previous month's report

INSERT INTO calendar_events (
  brand_id,
  event_type,
  title,
  description,
  event_date,
  related_entity_type,
  related_entity_id,
  is_all_day,
  distributor_id,
  status,
  created_at,
  updated_at
)
SELECT 
  d.brand_id,
  'compliance_review'::calendar_event_type,
  'Monthly Report Due: ' || d.name,
  'Monthly distributor report for ' || TO_CHAR(month_date, 'Month YYYY') || ' is due',
  (DATE_TRUNC('month', month_date) + INTERVAL '1 month' + INTERVAL '4 days')::date,
  'distributor',
  d.id,
  true,
  d.id,
  CASE 
    WHEN (DATE_TRUNC('month', month_date) + INTERVAL '1 month' + INTERVAL '4 days')::date < CURRENT_DATE 
      THEN 'overdue'::calendar_event_status
    ELSE 'upcoming'::calendar_event_status
  END,
  NOW(),
  NOW()
FROM distributors d
CROSS JOIN (
  -- Generate dates for current month and next 2 months
  SELECT DATE_TRUNC('month', CURRENT_DATE) AS month_date
  UNION ALL
  SELECT DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')
  UNION ALL
  SELECT DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 months')
) months
WHERE d.status = 'active'
  AND (DATE_TRUNC('month', month_date) + INTERVAL '1 month' + INTERVAL '4 days')::date >= CURRENT_DATE;

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run after migration)
-- ================================================

-- Count events by type
SELECT 
  event_type,
  status,
  COUNT(*) as event_count
FROM calendar_events
GROUP BY event_type, status
ORDER BY event_type, status;

-- View upcoming events for the next 30 days
SELECT 
  event_type,
  title,
  event_date,
  status,
  related_entity_type
FROM calendar_events
WHERE event_date >= CURRENT_DATE
  AND event_date <= CURRENT_DATE + INTERVAL '30 days'
  AND status = 'upcoming'
ORDER BY event_date;

-- Check events by brand
SELECT 
  b.name as brand_name,
  ce.event_type,
  COUNT(*) as event_count
FROM calendar_events ce
JOIN brands b ON ce.brand_id = b.id
GROUP BY b.name, ce.event_type
ORDER BY b.name, ce.event_type;
