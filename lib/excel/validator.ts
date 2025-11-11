import { createClient } from "@supabase/supabase-js";
import { ParsedOrder, ValidationError, ValidationResult } from "@/types/import";
import { getRequiredFields, getFieldConfig } from "./template-config";

/**
 * Validate parsed orders against business rules and database
 */
export async function validateOrders(
  orders: ParsedOrder[],
  brandId: string,
  distributorId: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const validOrders: ParsedOrder[] = [];
  const invalidOrders: ParsedOrder[] = [];

  if (orders.length === 0) {
    errors.push({
      row: 0,
      message: "No orders found in the file",
      code: "NO_ORDERS",
    });
    return { valid: false, errors, validOrders, invalidOrders };
  }

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all products for the brand to validate SKUs
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("sku, product_name, status, brand_id, unit_price")
    .eq("brand_id", brandId);

  if (productsError) {
    errors.push({
      row: 0,
      message: `Failed to fetch products: ${productsError.message}`,
      code: "PRODUCTS_FETCH_ERROR",
    });
    return { valid: false, errors, validOrders, invalidOrders };
  }

  // Create SKU lookup map
  const skuMap = new Map(
    products?.map((p) => [p.sku.toLowerCase(), p]) || []
  );

  // Validate distributor exists and is active
  const { data: distributor, error: distributorError } = await supabase
    .from("distributors")
    .select("id, name, status, brand_id")
    .eq("id", distributorId)
    .single();

  if (distributorError || !distributor) {
    errors.push({
      row: 0,
      field: "distributor_id",
      message: "Invalid distributor ID or distributor not found",
      code: "INVALID_DISTRIBUTOR",
      value: distributorId,
    });
    return { valid: false, errors, validOrders, invalidOrders };
  }

  if (distributor.status !== "active") {
    errors.push({
      row: 0,
      field: "distributor_id",
      message: `Distributor is not active (status: ${distributor.status})`,
      code: "DISTRIBUTOR_NOT_ACTIVE",
      value: distributorId,
    });
    return { valid: false, errors, validOrders, invalidOrders };
  }

  // Validate each order
  for (const order of orders) {
    const orderErrors: ValidationError[] = [];

    // Validate required fields
    if (!order.order_date) {
      orderErrors.push({
        row: order.row,
        field: "order_date",
        message: "Order date is required",
        code: "REQUIRED_FIELD",
      });
    }

    if (!order.customer_name || order.customer_name.trim() === "") {
      orderErrors.push({
        row: order.row,
        field: "customer_name",
        message: "Customer name is required",
        code: "REQUIRED_FIELD",
      });
    }

    // Validate date format
    if (order.order_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(order.order_date)) {
        orderErrors.push({
          row: order.row,
          field: "order_date",
          message: "Invalid date format. Use YYYY-MM-DD",
          code: "INVALID_DATE_FORMAT",
          value: order.order_date,
        });
      }
    }

    // Validate email format if provided
    if (order.customer_email) {
      // Trim email to handle whitespace issues
      const trimmedEmail = order.customer_email.trim();
      
      // Skip validation if email becomes empty after trimming
      if (!trimmedEmail) {
        orderErrors.push({
          row: order.row,
          field: "customer_email",
          message: "Email cannot be empty or whitespace only",
          code: "INVALID_EMAIL",
          value: order.customer_email,
        });
      } else {
        // More robust email regex pattern
        // Allows: letters, numbers, dots, underscores, percent, plus, hyphens in local part
        // Domain must have at least one dot and valid TLD (2+ letters)
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(trimmedEmail)) {
          orderErrors.push({
            row: order.row,
            field: "customer_email",
            message: `Invalid email format: "${trimmedEmail}"`,
            code: "INVALID_EMAIL",
            value: trimmedEmail,
          });
        }
      }
    }

    // Validate customer type if provided
    if (order.customer_type) {
      const validTypes = ["retail", "wholesale", "distributor", "manufacturer"];
      if (!validTypes.includes(order.customer_type)) {
        orderErrors.push({
          row: order.row,
          field: "customer_type",
          message: `Invalid customer type. Must be one of: ${validTypes.join(", ")}`,
          code: "INVALID_CUSTOMER_TYPE",
          value: order.customer_type,
        });
      }
    }

    // Validate items
    if (!order.items || order.items.length === 0) {
      orderErrors.push({
        row: order.row,
        field: "items",
        message: "Order must have at least one item",
        code: "NO_ITEMS",
      });
    } else {
      // Validate each item
      for (const item of order.items) {
        // Validate SKU exists
        const product = skuMap.get(item.sku.toLowerCase());
        if (!product) {
          orderErrors.push({
            row: order.row,
            field: "sku",
            message: `SKU not found in products catalog: ${item.sku}`,
            code: "SKU_NOT_FOUND",
            value: item.sku,
          });
        } else if (product.status !== "active") {
          orderErrors.push({
            row: order.row,
            field: "sku",
            message: `Product is not active (status: ${product.status}): ${item.sku}`,
            code: "PRODUCT_NOT_ACTIVE",
            value: item.sku,
          });
        }

        // Validate quantity
        if (!item.quantity || item.quantity <= 0) {
          orderErrors.push({
            row: order.row,
            field: "quantity",
            message: "Quantity must be greater than 0",
            code: "INVALID_QUANTITY",
            value: item.quantity,
          });
        }

        // Validate unit price
        if (item.unit_price === undefined || item.unit_price < 0) {
          orderErrors.push({
            row: order.row,
            field: "unit_price",
            message: "Unit price must be 0 or greater",
            code: "INVALID_UNIT_PRICE",
            value: item.unit_price,
          });
        }

        // Validate discount if provided
        if (item.discount !== undefined && (item.discount < 0 || item.discount > 100)) {
          orderErrors.push({
            row: order.row,
            field: "discount",
            message: "Discount must be between 0 and 100",
            code: "INVALID_DISCOUNT",
            value: item.discount,
          });
        }

        // Validate tax rate if provided
        if (item.tax_rate !== undefined && (item.tax_rate < 0 || item.tax_rate > 100)) {
          orderErrors.push({
            row: order.row,
            field: "tax_rate",
            message: "Tax rate must be between 0 and 100",
            code: "INVALID_TAX_RATE",
            value: item.tax_rate,
          });
        }
      }
    }

    // Validate shipping cost if provided
    if (order.shipping_cost !== undefined && order.shipping_cost < 0) {
      orderErrors.push({
        row: order.row,
        field: "shipping_cost",
        message: "Shipping cost cannot be negative",
        code: "INVALID_SHIPPING_COST",
        value: order.shipping_cost,
      });
    }

    // Add errors to main list
    if (orderErrors.length > 0) {
      errors.push(...orderErrors);
      invalidOrders.push(order);
    } else {
      validOrders.push(order);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validOrders,
    invalidOrders,
  };
}

/**
 * Validate file constraints (size, row count)
 */
export function validateFileConstraints(
  fileSize: number,
  rowCount: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Max file size: 10MB
  const maxSize = 10 * 1024 * 1024;
  if (fileSize > maxSize) {
    errors.push({
      row: 0,
      message: `File size exceeds maximum of 10MB (current: ${Math.round(fileSize / 1024 / 1024)}MB)`,
      code: "FILE_TOO_LARGE",
    });
  }

  // Max rows: 5000
  const maxRows = 5000;
  if (rowCount > maxRows) {
    errors.push({
      row: 0,
      message: `Too many rows. Maximum is ${maxRows} rows (current: ${rowCount})`,
      code: "TOO_MANY_ROWS",
    });
  }

  return errors;
}

/**
 * Calculate order totals
 */
export function calculateOrderTotals(order: ParsedOrder): {
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
} {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  // Calculate from items
  for (const item of order.items) {
    const itemSubtotal = item.quantity * item.unit_price;
    subtotal += itemSubtotal;

    if (item.discount) {
      const itemDiscount = itemSubtotal * (item.discount / 100);
      discountTotal += itemDiscount;
    }

    if (item.tax_rate) {
      const taxableAmount = itemSubtotal - (item.discount ? itemSubtotal * (item.discount / 100) : 0);
      const itemTax = taxableAmount * (item.tax_rate / 100);
      taxTotal += itemTax;
    }
  }

  const totalAmount = subtotal - discountTotal + taxTotal + (order.shipping_cost || 0);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount_total: Math.round(discountTotal * 100) / 100,
    tax_total: Math.round(taxTotal * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
  };
}

