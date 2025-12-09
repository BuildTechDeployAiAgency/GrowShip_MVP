-- Customer Financial Analytics System
-- Date: 2025-12-11
-- Purpose: Create views and functions for customer financial metrics

-- Create customer financial summary view
CREATE OR REPLACE VIEW customer_financial_summary AS
SELECT 
  COALESCE(i.customer_id, o.customer_id) as customer_id,
  COALESCE(i.customer_name, o.customer_name) as customer_name,
  COALESCE(i.brand_id, o.brand_id) as brand_id,
  
  -- Outstanding Receivables
  SUM(CASE 
    WHEN i.payment_status IN ('pending', 'partially_paid') 
    THEN COALESCE(i.total_amount, 0) 
    ELSE 0 
  END) as total_outstanding_receivables,
  
  -- Outstanding Payables (refunds, credits)
  SUM(CASE 
    WHEN i.payment_status = 'refunded' 
    THEN COALESCE(i.total_amount, 0) 
    ELSE 0 
  END) as total_outstanding_payables,
  
  -- Invoice metrics
  COUNT(DISTINCT i.id) as total_invoices,
  SUM(COALESCE(i.total_amount, 0)) as total_invoiced_amount,
  AVG(COALESCE(i.total_amount, 0)) as avg_invoice_amount,
  
  -- Order metrics
  COUNT(DISTINCT o.id) as total_orders,
  SUM(COALESCE(o.total_amount, 0)) as total_order_amount,
  AVG(COALESCE(o.total_amount, 0)) as avg_order_amount,
  
  -- Payment timing
  AVG(CASE 
    WHEN i.paid_date IS NOT NULL AND i.invoice_date IS NOT NULL
    THEN EXTRACT(EPOCH FROM (i.paid_date::timestamp - i.invoice_date::timestamp)) / 86400
    ELSE NULL
  END) as avg_days_to_pay,
  
  -- Latest activity
  MAX(i.invoice_date) as last_invoice_date,
  MAX(i.paid_date) as last_payment_date,
  MAX(o.order_date) as last_order_date,
  
  -- On-time payment rate
  COALESCE(
    COUNT(CASE WHEN i.paid_date IS NOT NULL AND i.due_date IS NOT NULL 
               AND i.paid_date::date <= i.due_date::date THEN 1 END)::decimal / 
    NULLIF(COUNT(CASE WHEN i.paid_date IS NOT NULL THEN 1 END), 0) * 100, 
    0
  ) as on_time_payment_rate

FROM invoices i
FULL OUTER JOIN orders o ON (
  i.customer_name = o.customer_name AND 
  i.brand_id = o.brand_id AND
  (i.customer_id = o.customer_id OR (i.customer_id IS NULL AND o.customer_id IS NULL))
)
WHERE (i.customer_name IS NOT NULL OR o.customer_name IS NOT NULL)
GROUP BY 
  COALESCE(i.customer_id, o.customer_id),
  COALESCE(i.customer_name, o.customer_name),
  COALESCE(i.brand_id, o.brand_id);

-- Create receivables aging view
CREATE OR REPLACE VIEW customer_receivables_aging AS
SELECT 
  i.customer_id,
  i.customer_name,
  i.brand_id,
  i.id as invoice_id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.total_amount,
  i.payment_status,
  
  -- Calculate days overdue
  CASE 
    WHEN i.due_date IS NULL THEN 0
    WHEN i.payment_status = 'paid' THEN 0
    ELSE GREATEST(0, EXTRACT(EPOCH FROM (NOW() - i.due_date::timestamp)) / 86400)::integer
  END as days_overdue,
  
  -- Calculate outstanding amount (considering payment lines)
  COALESCE(
    i.total_amount - COALESCE(payments.verified_amount, 0),
    i.total_amount
  ) as outstanding_amount,
  
  -- Aging bucket classification
  CASE 
    WHEN i.payment_status = 'paid' THEN 'paid'
    WHEN i.due_date IS NULL OR EXTRACT(EPOCH FROM (NOW() - i.due_date::timestamp)) / 86400 <= 30 THEN 'current'
    WHEN EXTRACT(EPOCH FROM (NOW() - i.due_date::timestamp)) / 86400 <= 60 THEN 'days_31_60'
    WHEN EXTRACT(EPOCH FROM (NOW() - i.due_date::timestamp)) / 86400 <= 90 THEN 'days_61_90'
    ELSE 'over_90'
  END as aging_bucket

FROM invoices i
LEFT JOIN (
  SELECT 
    invoice_id,
    SUM(CASE WHEN status = 'verified' THEN amount ELSE 0 END) as verified_amount
  FROM invoice_payment_lines 
  GROUP BY invoice_id
) payments ON i.id = payments.invoice_id
WHERE i.payment_status IN ('pending', 'partially_paid');

-- Function to calculate Days Sales Outstanding (DSO)
CREATE OR REPLACE FUNCTION calculate_customer_dso(
  p_customer_id TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_brand_id TEXT DEFAULT NULL,
  p_period_days INTEGER DEFAULT 90
)
RETURNS DECIMAL AS $$
DECLARE
  v_outstanding_receivables DECIMAL;
  v_avg_daily_sales DECIMAL;
  v_dso DECIMAL;
BEGIN
  -- Get total outstanding receivables for customer
  SELECT SUM(outstanding_amount)
  INTO v_outstanding_receivables
  FROM customer_receivables_aging
  WHERE (p_customer_id IS NULL OR customer_id = p_customer_id)
    AND (p_customer_name IS NULL OR customer_name = p_customer_name)
    AND (p_brand_id IS NULL OR brand_id = p_brand_id)
    AND aging_bucket != 'paid';

  -- Calculate average daily sales over the period
  SELECT AVG(daily_sales)
  INTO v_avg_daily_sales
  FROM (
    SELECT 
      DATE(invoice_date) as sale_date,
      SUM(total_amount) as daily_sales
    FROM invoices
    WHERE (p_customer_id IS NULL OR customer_id = p_customer_id)
      AND (p_customer_name IS NULL OR customer_name = p_customer_name)
      AND (p_brand_id IS NULL OR brand_id = p_brand_id)
      AND invoice_date >= CURRENT_DATE - INTERVAL '1 day' * p_period_days
    GROUP BY DATE(invoice_date)
  ) daily_totals;

  -- Calculate DSO
  IF v_avg_daily_sales > 0 THEN
    v_dso := v_outstanding_receivables / v_avg_daily_sales;
  ELSE
    v_dso := 0;
  END IF;

  RETURN COALESCE(v_dso, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get customer payment performance metrics
CREATE OR REPLACE FUNCTION get_customer_payment_performance(
  p_customer_id TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_brand_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  customer_id TEXT,
  customer_name TEXT,
  total_invoices BIGINT,
  total_amount DECIMAL,
  avg_days_to_pay DECIMAL,
  on_time_payment_rate DECIMAL,
  early_payment_rate DECIMAL,
  late_payment_rate DECIMAL,
  current_dso DECIMAL,
  risk_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH payment_stats AS (
    SELECT 
      i.customer_id,
      i.customer_name,
      COUNT(*) as invoice_count,
      SUM(i.total_amount) as total_invoiced,
      
      -- Payment timing calculations
      AVG(CASE 
        WHEN i.paid_date IS NOT NULL AND i.invoice_date IS NOT NULL
        THEN EXTRACT(EPOCH FROM (i.paid_date::timestamp - i.invoice_date::timestamp)) / 86400
        ELSE NULL
      END) as avg_payment_days,
      
      -- On-time payments
      COUNT(CASE 
        WHEN i.paid_date IS NOT NULL AND i.due_date IS NOT NULL 
        AND i.paid_date::date <= i.due_date::date 
        THEN 1 
      END)::decimal / NULLIF(COUNT(CASE WHEN i.paid_date IS NOT NULL THEN 1 END), 0) * 100 as on_time_rate,
      
      -- Early payments (paid before due date)
      COUNT(CASE 
        WHEN i.paid_date IS NOT NULL AND i.due_date IS NOT NULL 
        AND i.paid_date::date < i.due_date::date 
        THEN 1 
      END)::decimal / NULLIF(COUNT(CASE WHEN i.paid_date IS NOT NULL THEN 1 END), 0) * 100 as early_rate,
      
      -- Late payments
      COUNT(CASE 
        WHEN i.paid_date IS NOT NULL AND i.due_date IS NOT NULL 
        AND i.paid_date::date > i.due_date::date 
        THEN 1 
      END)::decimal / NULLIF(COUNT(CASE WHEN i.paid_date IS NOT NULL THEN 1 END), 0) * 100 as late_rate
      
    FROM invoices i
    WHERE (p_customer_id IS NULL OR i.customer_id = p_customer_id)
      AND (p_customer_name IS NULL OR i.customer_name = p_customer_name)
      AND (p_brand_id IS NULL OR i.brand_id = p_brand_id)
      AND i.invoice_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY i.customer_id, i.customer_name
  )
  SELECT 
    ps.customer_id,
    ps.customer_name,
    ps.invoice_count,
    ps.total_invoiced,
    ps.avg_payment_days,
    COALESCE(ps.on_time_rate, 0),
    COALESCE(ps.early_rate, 0),
    COALESCE(ps.late_rate, 0),
    calculate_customer_dso(ps.customer_id, ps.customer_name, p_brand_id),
    
    -- Risk score calculation (1-10, higher is riskier)
    LEAST(10, GREATEST(1,
      CASE 
        WHEN ps.on_time_rate >= 90 THEN 1
        WHEN ps.on_time_rate >= 80 THEN 2
        WHEN ps.on_time_rate >= 70 THEN 4
        WHEN ps.on_time_rate >= 60 THEN 6
        WHEN ps.on_time_rate >= 50 THEN 8
        ELSE 10
      END +
      CASE 
        WHEN ps.avg_payment_days <= 30 THEN 0
        WHEN ps.avg_payment_days <= 45 THEN 1
        WHEN ps.avg_payment_days <= 60 THEN 2
        ELSE 3
      END
    ))::integer as risk_score
    
  FROM payment_stats ps;
END;
$$ LANGUAGE plpgsql;

-- Create aging bucket summary function
CREATE OR REPLACE FUNCTION get_receivables_aging_summary(
  p_customer_id TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_brand_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  aging_bucket TEXT,
  invoice_count BIGINT,
  total_amount DECIMAL,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH aging_totals AS (
    SELECT 
      SUM(outstanding_amount) as grand_total
    FROM customer_receivables_aging
    WHERE (p_customer_id IS NULL OR customer_id = p_customer_id)
      AND (p_customer_name IS NULL OR customer_name = p_customer_name)
      AND (p_brand_id IS NULL OR brand_id = p_brand_id)
  )
  SELECT 
    cra.aging_bucket,
    COUNT(*)::bigint,
    SUM(cra.outstanding_amount),
    CASE 
      WHEN at.grand_total > 0 
      THEN (SUM(cra.outstanding_amount) / at.grand_total * 100)
      ELSE 0 
    END
  FROM customer_receivables_aging cra
  CROSS JOIN aging_totals at
  WHERE (p_customer_id IS NULL OR cra.customer_id = p_customer_id)
    AND (p_customer_name IS NULL OR cra.customer_name = p_customer_name)
    AND (p_brand_id IS NULL OR cra.brand_id = p_brand_id)
  GROUP BY cra.aging_bucket, at.grand_total
  ORDER BY 
    CASE cra.aging_bucket
      WHEN 'current' THEN 1
      WHEN 'days_31_60' THEN 2
      WHEN 'days_61_90' THEN 3
      WHEN 'over_90' THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_payment_status 
ON invoices(customer_name, customer_id, payment_status, brand_id);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date 
ON invoices(invoice_date) WHERE invoice_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_due_date 
ON invoices(due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_paid_date 
ON invoices(paid_date) WHERE paid_date IS NOT NULL;

-- Grant permissions
GRANT SELECT ON customer_financial_summary TO authenticated;
GRANT SELECT ON customer_receivables_aging TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_customer_dso TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_payment_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_receivables_aging_summary TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW customer_financial_summary IS 'Comprehensive financial summary for each customer including receivables, payables, and payment metrics';
COMMENT ON VIEW customer_receivables_aging IS 'Detailed aging analysis of customer receivables with outstanding amounts and overdue days';
COMMENT ON FUNCTION calculate_customer_dso IS 'Calculates Days Sales Outstanding for a specific customer or all customers';
COMMENT ON FUNCTION get_customer_payment_performance IS 'Returns comprehensive payment performance metrics for customer risk assessment';
COMMENT ON FUNCTION get_receivables_aging_summary IS 'Provides aging bucket summary with totals and percentages for receivables analysis';