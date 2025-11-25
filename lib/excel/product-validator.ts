import { createClient } from "@supabase/supabase-js";
import { ParsedProduct, ValidationError, ValidationResult } from "@/types/import";
import { getRequiredProductFields } from "./product-template-config";

/**
 * Validate parsed products against business rules and database
 */
export async function validateProducts(
  products: ParsedProduct[],
  brandId: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const validProducts: ParsedProduct[] = [];
  const invalidProducts: ParsedProduct[] = [];

  if (products.length === 0) {
    errors.push({
      row: 0,
      message: "No products found in the file",
      code: "NO_PRODUCTS",
    });
    return { valid: false, errors, validProducts, invalidProducts };
  }

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch existing products for the brand to check for duplicates
  const { data: existingProducts, error: productsError } = await supabase
    .from("products")
    .select("sku, product_name, brand_id")
    .eq("brand_id", brandId);

  if (productsError) {
    errors.push({
      row: 0,
      message: `Failed to fetch existing products: ${productsError.message}`,
      code: "PRODUCTS_FETCH_ERROR",
    });
    return { valid: false, errors, validProducts, invalidProducts };
  }

  // Create SKU lookup map for existing products
  const existingSkuMap = new Map(
    existingProducts?.map((p) => [p.sku.toLowerCase(), p]) || []
  );

  // Track SKUs within the current import file to detect duplicates
  const importSkuMap = new Map<string, number>();

  // Validate each product
  for (const product of products) {
    const productErrors: ValidationError[] = [];
    const skuLower = product.sku.toLowerCase();

    // 1. Required field validation
    if (!product.sku || product.sku.trim() === "") {
      productErrors.push({
        row: product.row,
        field: "sku",
        message: "SKU is required",
        code: "MISSING_SKU",
      });
    }

    if (!product.product_name || product.product_name.trim() === "") {
      productErrors.push({
        row: product.row,
        field: "product_name",
        message: "Product Name is required",
        code: "MISSING_PRODUCT_NAME",
      });
    }

    if (product.unit_price === undefined || product.unit_price === null) {
      productErrors.push({
        row: product.row,
        field: "unit_price",
        message: "Unit Price is required",
        code: "MISSING_UNIT_PRICE",
      });
    }

    // 2. Data type and range validation
    if (product.unit_price !== undefined && product.unit_price < 0) {
      productErrors.push({
        row: product.row,
        field: "unit_price",
        message: "Unit Price must be 0 or greater",
        code: "INVALID_UNIT_PRICE",
        value: product.unit_price,
      });
    }

    if (product.cost_price !== undefined && product.cost_price < 0) {
      productErrors.push({
        row: product.row,
        field: "cost_price",
        message: "Cost Price must be 0 or greater",
        code: "INVALID_COST_PRICE",
        value: product.cost_price,
      });
    }

    if (product.quantity_in_stock !== undefined && product.quantity_in_stock < 0) {
      productErrors.push({
        row: product.row,
        field: "quantity_in_stock",
        message: "Quantity in Stock must be 0 or greater",
        code: "INVALID_QUANTITY",
        value: product.quantity_in_stock,
      });
    }

    if (product.reorder_level !== undefined && product.reorder_level < 0) {
      productErrors.push({
        row: product.row,
        field: "reorder_level",
        message: "Reorder Level must be 0 or greater",
        code: "INVALID_REORDER_LEVEL",
        value: product.reorder_level,
      });
    }

    if (product.reorder_quantity !== undefined && product.reorder_quantity < 0) {
      productErrors.push({
        row: product.row,
        field: "reorder_quantity",
        message: "Reorder Quantity must be 0 or greater",
        code: "INVALID_REORDER_QUANTITY",
        value: product.reorder_quantity,
      });
    }

    if (product.weight !== undefined && product.weight < 0) {
      productErrors.push({
        row: product.row,
        field: "weight",
        message: "Weight must be 0 or greater",
        code: "INVALID_WEIGHT",
        value: product.weight,
      });
    }

    // 3. Status validation
    const validStatuses = ["active", "inactive", "discontinued", "out_of_stock"];
    if (product.status && !validStatuses.includes(product.status)) {
      productErrors.push({
        row: product.row,
        field: "status",
        message: `Status must be one of: ${validStatuses.join(", ")}`,
        code: "INVALID_STATUS",
        value: product.status,
      });
    }

    // 4. Currency validation
    const validCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY"];
    if (product.currency && !validCurrencies.includes(product.currency.toUpperCase())) {
      productErrors.push({
        row: product.row,
        field: "currency",
        message: `Currency must be one of: ${validCurrencies.join(", ")}`,
        code: "INVALID_CURRENCY",
        value: product.currency,
      });
    }

    // 5. Weight unit validation
    const validWeightUnits = ["kg", "g", "lb", "oz"];
    if (product.weight_unit && !validWeightUnits.includes(product.weight_unit.toLowerCase())) {
      productErrors.push({
        row: product.row,
        field: "weight_unit",
        message: `Weight Unit must be one of: ${validWeightUnits.join(", ")}`,
        code: "INVALID_WEIGHT_UNIT",
        value: product.weight_unit,
      });
    }

    // 6. Check for duplicate SKU within import file
    if (product.sku) {
      if (importSkuMap.has(skuLower)) {
        productErrors.push({
          row: product.row,
          field: "sku",
          message: `Duplicate SKU found in import file (first occurrence at row ${importSkuMap.get(skuLower)})`,
          code: "DUPLICATE_SKU_IN_FILE",
          value: product.sku,
        });
      } else {
        importSkuMap.set(skuLower, product.row);
      }
    }

    // 7. SKU length validation
    if (product.sku && product.sku.length > 100) {
      productErrors.push({
        row: product.row,
        field: "sku",
        message: "SKU must not exceed 100 characters",
        code: "SKU_TOO_LONG",
        value: product.sku,
      });
    }

    // 8. Product name length validation
    if (product.product_name && product.product_name.length > 255) {
      productErrors.push({
        row: product.row,
        field: "product_name",
        message: "Product Name must not exceed 255 characters",
        code: "PRODUCT_NAME_TOO_LONG",
        value: product.product_name,
      });
    }

    // Categorize product as valid or invalid
    if (productErrors.length === 0) {
      validProducts.push(product);
    } else {
      invalidProducts.push(product);
      errors.push(...productErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validProducts,
    invalidProducts,
  };
}

/**
 * Validate file constraints (size, format, etc.)
 */
export function validateProductFileConstraints(
  fileSize: number,
  fileName: string,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  // Check file size
  const fileSizeMB = fileSize / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  // Check file extension
  const validExtensions = [".xlsx", ".xls"];
  const hasValidExtension = validExtensions.some((ext) =>
    fileName.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Invalid file format. Only Excel files (${validExtensions.join(", ")}) are supported`,
    };
  }

  return { valid: true };
}

