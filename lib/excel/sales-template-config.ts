import { TemplateFieldConfig, TemplateConfig } from "@/types/import";

// Sales Data Template Field Definitions
export const SALES_TEMPLATE_FIELDS: TemplateFieldConfig[] = [
  // Required Fields
  {
    name: "sales_date",
    header: "Sales Date",
    isRequired: true,
    dataType: "date",
    description: "Date of the sales transaction (will be normalized to reporting_month)",
    example: "2025-11-01 or 11/01/2025",
    width: 15,
    enabled: true,
  },
  {
    name: "sku",
    header: "SKU",
    isRequired: true,
    dataType: "string",
    description: "Product SKU (must exist in your products catalog)",
    example: "PROD-001",
    width: 15,
    enabled: true,
  },
  {
    name: "retailer_name",
    header: "Retailer",
    isRequired: true,
    dataType: "string",
    description: "Name of the retailer/customer",
    example: "Walmart",
    width: 25,
    enabled: true,
  },
  {
    name: "territory",
    header: "Territory/Region",
    isRequired: true,
    dataType: "string",
    description: "Sales territory or region",
    example: "North America",
    width: 20,
    enabled: true,
  },
  {
    name: "units_sold",
    header: "Units Sold",
    isRequired: true,
    dataType: "number",
    description: "Number of units sold",
    example: "1000",
    validation: { min: 0 },
    width: 15,
    enabled: true,
  },
  {
    name: "total_sales",
    header: "Net Revenue",
    isRequired: true,
    dataType: "number",
    description: "Net sales revenue (after discounts/returns)",
    example: "50000.00",
    validation: { min: 0 },
    width: 15,
    enabled: true,
  },

  // Optional Fields
  {
    name: "product_name",
    header: "Product Name",
    isRequired: false,
    dataType: "string",
    description: "Product name (optional, for reference)",
    example: "Premium Widget",
    width: 25,
    enabled: true,
  },
  {
    name: "category",
    header: "Category",
    isRequired: false,
    dataType: "string",
    description: "Product category",
    example: "Electronics",
    width: 20,
    enabled: true,
  },
  {
    name: "territory_country",
    header: "Country",
    isRequired: false,
    dataType: "string",
    description: "Country where sales occurred",
    example: "USA",
    width: 15,
    enabled: true,
  },
  {
    name: "sales_channel",
    header: "Sales Channel",
    isRequired: false,
    dataType: "string",
    description: "Sales channel classification",
    example: "retail",
    validation: { options: ["retail", "ecom", "wholesale", "direct", "other"] },
    width: 15,
    enabled: true,
  },
  {
    name: "currency",
    header: "Currency",
    isRequired: false,
    dataType: "string",
    description: "Currency code (defaults to USD)",
    example: "USD",
    width: 10,
    enabled: true,
  },
  {
    name: "gross_revenue_local",
    header: "Gross Revenue Local",
    isRequired: false,
    dataType: "number",
    description: "Gross revenue in local currency (before discounts/returns)",
    example: "55000.00",
    validation: { min: 0 },
    width: 18,
    enabled: true,
  },
  {
    name: "marketing_spend",
    header: "Marketing Spend",
    isRequired: false,
    dataType: "number",
    description: "Marketing/promotional spend for this sales entry",
    example: "5000.00",
    validation: { min: 0 },
    width: 18,
    enabled: true,
  },
  {
    name: "distributor_id",
    header: "Distributor ID",
    isRequired: false,
    dataType: "string",
    description: "Distributor UUID (auto-filled from your account if empty)",
    example: "123e4567-e89b-12d3-a456-426614174000",
    width: 30,
    enabled: true,
  },
  {
    name: "target_revenue",
    header: "Target Revenue",
    isRequired: false,
    dataType: "number",
    description: "Target revenue for comparison (optional)",
    example: "45000.00",
    validation: { min: 0 },
    width: 15,
    enabled: false,
  },
  {
    name: "notes",
    header: "Notes",
    isRequired: false,
    dataType: "string",
    description: "Additional notes or comments",
    example: "Q4 promotional campaign",
    width: 30,
    enabled: false,
  },
];

// Get only enabled fields
export function getEnabledSalesFields(): TemplateFieldConfig[] {
  return SALES_TEMPLATE_FIELDS.filter((field) => field.enabled);
}

// Get required fields
export function getRequiredSalesFields(): TemplateFieldConfig[] {
  return SALES_TEMPLATE_FIELDS.filter((field) => field.isRequired && field.enabled);
}

// Get optional fields
export function getOptionalSalesFields(): TemplateFieldConfig[] {
  return SALES_TEMPLATE_FIELDS.filter((field) => !field.isRequired && field.enabled);
}

// Get field by name
export function getSalesFieldConfig(fieldName: string): TemplateFieldConfig | undefined {
  return SALES_TEMPLATE_FIELDS.find((field) => field.name === fieldName);
}

// Sales Template Configuration
export const SALES_TEMPLATE_CONFIG: TemplateConfig = {
  type: "sales",
  fields: SALES_TEMPLATE_FIELDS,
  instructions: [
    "1. Fill in all REQUIRED fields (Sales Date, SKU, Retailer, Territory, Units Sold, Net Revenue)",
    "2. Distributor ID will be auto-filled from your account if left empty",
    "3. All SKUs must exist in your products catalog and be active",
    "4. Sales Date will be normalized to the first day of the month for reporting",
    "5. Dates can be in formats: YYYY-MM-DD, MM/DD/YYYY, or DD-MM-YYYY",
    "6. Revenue and numeric values should not contain currency symbols or commas",
    "7. Sales Channel options: retail, ecom, wholesale, direct, other",
    "8. Save the file and upload it to the Import page",
  ],
};

