import { TemplateFieldConfig } from "@/types/import";

/**
 * Product import template field configuration
 */
export const PRODUCT_TEMPLATE_FIELDS: TemplateFieldConfig[] = [
  {
    name: "sku",
    header: "SKU",
    isRequired: true,
    dataType: "string",
    description: "Unique product identifier (Stock Keeping Unit)",
    example: "PROD-001",
    width: 15,
    enabled: true,
  },
  {
    name: "product_name",
    header: "Product Name",
    isRequired: true,
    dataType: "string",
    description: "Full product name",
    example: "Premium Widget",
    width: 30,
    enabled: true,
  },
  {
    name: "description",
    header: "Description",
    isRequired: false,
    dataType: "string",
    description: "Product description",
    example: "High-quality premium widget for professional use",
    width: 40,
    enabled: true,
  },
  {
    name: "product_category",
    header: "Category",
    isRequired: false,
    dataType: "string",
    description: "Product category",
    example: "Electronics",
    width: 20,
    enabled: true,
  },
  {
    name: "unit_price",
    header: "Unit Price",
    isRequired: true,
    dataType: "number",
    description: "Selling price per unit",
    example: "99.99",
    validation: {
      min: 0,
    },
    width: 15,
    enabled: true,
  },
  {
    name: "cost_price",
    header: "Cost Price",
    isRequired: false,
    dataType: "number",
    description: "Cost price per unit",
    example: "49.99",
    validation: {
      min: 0,
    },
    width: 15,
    enabled: true,
  },
  {
    name: "currency",
    header: "Currency",
    isRequired: false,
    dataType: "string",
    description: "Currency code (default: USD)",
    example: "USD",
    validation: {
      options: ["USD", "EUR", "GBP", "CAD", "AUD"],
    },
    width: 12,
    enabled: true,
  },
  {
    name: "quantity_in_stock",
    header: "Quantity in Stock",
    isRequired: false,
    dataType: "number",
    description: "Current inventory quantity",
    example: "100",
    validation: {
      min: 0,
    },
    width: 18,
    enabled: true,
  },
  {
    name: "reorder_level",
    header: "Reorder Level",
    isRequired: false,
    dataType: "number",
    description: "Inventory level that triggers reorder",
    example: "20",
    validation: {
      min: 0,
    },
    width: 15,
    enabled: true,
  },
  {
    name: "reorder_quantity",
    header: "Reorder Quantity",
    isRequired: false,
    dataType: "number",
    description: "Quantity to reorder when level is reached",
    example: "50",
    validation: {
      min: 0,
    },
    width: 18,
    enabled: true,
  },
  {
    name: "barcode",
    header: "Barcode",
    isRequired: false,
    dataType: "string",
    description: "Product barcode/UPC",
    example: "123456789012",
    width: 18,
    enabled: true,
  },
  {
    name: "product_image_url",
    header: "Image URL",
    isRequired: false,
    dataType: "string",
    description: "URL to product image",
    example: "https://example.com/product.jpg",
    width: 35,
    enabled: true,
  },
  {
    name: "weight",
    header: "Weight",
    isRequired: false,
    dataType: "number",
    description: "Product weight",
    example: "2.5",
    validation: {
      min: 0,
    },
    width: 12,
    enabled: true,
  },
  {
    name: "weight_unit",
    header: "Weight Unit",
    isRequired: false,
    dataType: "string",
    description: "Unit of weight measurement (default: kg)",
    example: "kg",
    validation: {
      options: ["kg", "g", "lb", "oz"],
    },
    width: 12,
    enabled: true,
  },
  {
    name: "status",
    header: "Status",
    isRequired: false,
    dataType: "string",
    description: "Product status (default: active)",
    example: "active",
    validation: {
      options: ["active", "inactive", "discontinued", "out_of_stock"],
    },
    width: 15,
    enabled: true,
  },
  {
    name: "tags",
    header: "Tags",
    isRequired: false,
    dataType: "string",
    description: "Comma-separated tags",
    example: "premium, bestseller, featured",
    width: 25,
    enabled: true,
  },
  {
    name: "supplier_sku",
    header: "Supplier SKU",
    isRequired: false,
    dataType: "string",
    description: "Supplier's SKU reference",
    example: "SUP-PROD-001",
    width: 18,
    enabled: true,
  },
  {
    name: "notes",
    header: "Notes",
    isRequired: false,
    dataType: "string",
    description: "Additional notes or comments",
    example: "Special handling required",
    width: 30,
    enabled: true,
  },
];

/**
 * Get enabled product fields
 */
export function getEnabledProductFields(): TemplateFieldConfig[] {
  return PRODUCT_TEMPLATE_FIELDS.filter((f) => f.enabled !== false);
}

/**
 * Get product field configuration by name
 */
export function getProductFieldConfig(fieldName: string): TemplateFieldConfig | undefined {
  return PRODUCT_TEMPLATE_FIELDS.find((f) => f.name === fieldName);
}

/**
 * Get required product field names
 */
export function getRequiredProductFields(): string[] {
  return getEnabledProductFields()
    .filter((f) => f.isRequired)
    .map((f) => f.name);
}

