-- Create order_history table for tracking order changes
CREATE TABLE IF NOT EXISTS order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_history(created_at);
CREATE INDEX IF NOT EXISTS idx_order_history_changed_by ON order_history(changed_by);

-- Enable RLS
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view order history for orders in their brand
CREATE POLICY "Users can view order history for their brand orders"
  ON order_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN user_profiles up ON up.brand_id = o.brand_id
      WHERE o.id = order_history.order_id
      AND up.user_id = auth.uid()
    )
  );

-- Users can create order history entries for orders in their brand
CREATE POLICY "Users can create order history for their brand orders"
  ON order_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN user_profiles up ON up.brand_id = o.brand_id
      WHERE o.id = order_history.order_id
      AND up.user_id = auth.uid()
    )
    AND changed_by = auth.uid()
  );

-- Function to log order changes
CREATE OR REPLACE FUNCTION log_order_change()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[];
  field_name TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- Track status changes
  IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    INSERT INTO order_history (order_id, field_name, old_value, new_value, changed_by)
    VALUES (
      NEW.id,
      'order_status',
      OLD.order_status::TEXT,
      NEW.order_status::TEXT,
      COALESCE(NEW.updated_by, auth.uid())
    );
  END IF;

  -- Track payment_status changes
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO order_history (order_id, field_name, old_value, new_value, changed_by)
    VALUES (
      NEW.id,
      'payment_status',
      OLD.payment_status::TEXT,
      NEW.payment_status::TEXT,
      COALESCE(NEW.updated_by, auth.uid())
    );
  END IF;

  -- Track estimated_delivery_date changes
  IF OLD.estimated_delivery_date IS DISTINCT FROM NEW.estimated_delivery_date THEN
    INSERT INTO order_history (order_id, field_name, old_value, new_value, changed_by)
    VALUES (
      NEW.id,
      'estimated_delivery_date',
      COALESCE(OLD.estimated_delivery_date::TEXT, ''),
      COALESCE(NEW.estimated_delivery_date::TEXT, ''),
      COALESCE(NEW.updated_by, auth.uid())
    );
  END IF;

  -- Track actual_delivery_date changes
  IF OLD.actual_delivery_date IS DISTINCT FROM NEW.actual_delivery_date THEN
    INSERT INTO order_history (order_id, field_name, old_value, new_value, changed_by)
    VALUES (
      NEW.id,
      'actual_delivery_date',
      COALESCE(OLD.actual_delivery_date::TEXT, ''),
      COALESCE(NEW.actual_delivery_date::TEXT, ''),
      COALESCE(NEW.updated_by, auth.uid())
    );
  END IF;

  -- Track tracking_number changes
  IF OLD.tracking_number IS DISTINCT FROM NEW.tracking_number THEN
    INSERT INTO order_history (order_id, field_name, old_value, new_value, changed_by)
    VALUES (
      NEW.id,
      'tracking_number',
      COALESCE(OLD.tracking_number::TEXT, ''),
      COALESCE(NEW.tracking_number::TEXT, ''),
      COALESCE(NEW.updated_by, auth.uid())
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log changes
CREATE TRIGGER order_history_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (
    OLD.order_status IS DISTINCT FROM NEW.order_status OR
    OLD.payment_status IS DISTINCT FROM NEW.payment_status OR
    OLD.estimated_delivery_date IS DISTINCT FROM NEW.estimated_delivery_date OR
    OLD.actual_delivery_date IS DISTINCT FROM NEW.actual_delivery_date OR
    OLD.tracking_number IS DISTINCT FROM NEW.tracking_number
  )
  EXECUTE FUNCTION log_order_change();

-- Add comment
COMMENT ON TABLE order_history IS 'Tracks all changes to order fields for audit purposes';
COMMENT ON COLUMN order_history.field_name IS 'Name of the field that changed';
COMMENT ON COLUMN order_history.old_value IS 'Previous value of the field';
COMMENT ON COLUMN order_history.new_value IS 'New value of the field';
COMMENT ON COLUMN order_history.change_reason IS 'Optional reason for the change';

