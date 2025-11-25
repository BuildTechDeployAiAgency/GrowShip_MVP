import { createClient } from "@supabase/supabase-js";
import { ParsedTarget, ValidationError, ValidationResult } from "@/types/import";

/**
 * Validate parsed targets against business rules and database
 */
export async function validateTargets(
  targets: ParsedTarget[],
  brandId: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const validTargets: ParsedTarget[] = [];
  const invalidTargets: ParsedTarget[] = [];

  if (targets.length === 0) {
    errors.push({
      row: 0,
      message: "No targets found in the file",
      code: "NO_TARGETS",
    });
    return { valid: false, errors, validTargets, invalidTargets };
  }

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all products for the brand to validate SKUs
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("sku, product_name, status, brand_id")
    .eq("brand_id", brandId);

  if (productsError) {
    errors.push({
      row: 0,
      message: `Failed to fetch products: ${productsError.message}`,
      code: "PRODUCTS_FETCH_ERROR",
    });
    return { valid: false, errors, validTargets, invalidTargets };
  }

  // Create SKU lookup map
  const skuMap = new Map(
    products?.map((p) => [p.sku.toLowerCase(), p]) || []
  );

  // Validate each target
  for (const target of targets) {
    const targetErrors: ValidationError[] = [];

    // Validate required fields
    if (!target.sku || target.sku.trim() === "") {
      targetErrors.push({
        row: target.row,
        field: "sku",
        message: "SKU is required",
        code: "REQUIRED_FIELD",
      });
    }

    if (!target.target_period) {
      targetErrors.push({
        row: target.row,
        field: "target_period",
        message: "Target period is required",
        code: "REQUIRED_FIELD",
      });
    }

    if (!target.period_type) {
      targetErrors.push({
        row: target.row,
        field: "period_type",
        message: "Period type is required",
        code: "REQUIRED_FIELD",
      });
    }

    // Validate SKU exists
    if (target.sku) {
      const product = skuMap.get(target.sku.toLowerCase());
      if (!product) {
        targetErrors.push({
          row: target.row,
          field: "sku",
          message: `SKU not found in products catalog: ${target.sku}`,
          code: "SKU_NOT_FOUND",
          value: target.sku,
        });
      } else if (product.status !== "active") {
        targetErrors.push({
          row: target.row,
          field: "sku",
          message: `Product is not active (status: ${product.status}): ${target.sku}`,
          code: "PRODUCT_NOT_ACTIVE",
          value: target.sku,
        });
      }
    }

    // Validate date format
    if (target.target_period) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(target.target_period)) {
        targetErrors.push({
          row: target.row,
          field: "target_period",
          message: "Invalid date format. Use YYYY-MM-DD",
          code: "INVALID_DATE_FORMAT",
          value: target.target_period,
        });
      }
    }

    // Validate period type
    if (target.period_type) {
      const validTypes = ["monthly", "quarterly", "yearly"];
      if (!validTypes.includes(target.period_type)) {
        targetErrors.push({
          row: target.row,
          field: "period_type",
          message: `Invalid period type. Must be one of: ${validTypes.join(", ")}`,
          code: "INVALID_PERIOD_TYPE",
          value: target.period_type,
        });
      }
    }

    // Validate at least one target value is provided
    if (target.target_quantity === undefined && target.target_revenue === undefined) {
      targetErrors.push({
        row: target.row,
        message: "At least one of Target Quantity or Target Revenue must be provided",
        code: "MISSING_TARGET_VALUE",
      });
    }

    // Validate numeric fields
    if (target.target_quantity !== undefined && target.target_quantity < 0) {
      targetErrors.push({
        row: target.row,
        field: "target_quantity",
        message: "Target quantity cannot be negative",
        code: "INVALID_QUANTITY",
        value: target.target_quantity,
      });
    }

    if (target.target_revenue !== undefined && target.target_revenue < 0) {
      targetErrors.push({
        row: target.row,
        field: "target_revenue",
        message: "Target revenue cannot be negative",
        code: "INVALID_REVENUE",
        value: target.target_revenue,
      });
    }

    // Add errors to main list
    if (targetErrors.length > 0) {
      errors.push(...targetErrors);
      invalidTargets.push(target);
    } else {
      validTargets.push(target);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validTargets,
    invalidTargets,
  };
}

/**
 * Validate file constraints (size, row count)
 */
export function validateTargetFileConstraints(
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

