import { TemplateFieldConfig, TemplateConfig } from "@/types/import";

// Target Template Field Definitions
export const TARGET_TEMPLATE_FIELDS: TemplateFieldConfig[] = [
  // Required Fields
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
    name: "target_period",
    header: "Target Period",
    isRequired: true,
    dataType: "date",
    description: "Start date of the target period (YYYY-MM-DD)",
    example: "2025-01-01",
    width: 15,
    enabled: true,
  },
  {
    name: "period_type",
    header: "Period Type",
    isRequired: true,
    dataType: "string",
    description: "Type of period: monthly, quarterly, or yearly",
    example: "monthly",
    validation: { options: ["monthly", "quarterly", "yearly"] },
    width: 15,
    enabled: true,
  },
  // Optional Fields
  {
    name: "target_quantity",
    header: "Target Quantity",
    isRequired: false,
    dataType: "number",
    description: "Target quantity for the period",
    example: "1000",
    validation: { min: 0 },
    width: 15,
    enabled: true,
  },
  {
    name: "target_revenue",
    header: "Target Revenue",
    isRequired: false,
    dataType: "number",
    description: "Target revenue for the period",
    example: "50000.00",
    validation: { min: 0 },
    width: 15,
    enabled: true,
  },
];

// Get only enabled fields
export function getEnabledTargetFields(): TemplateFieldConfig[] {
  return TARGET_TEMPLATE_FIELDS.filter((field) => field.enabled);
}

// Get required fields
export function getRequiredTargetFields(): TemplateFieldConfig[] {
  return TARGET_TEMPLATE_FIELDS.filter((field) => field.isRequired && field.enabled);
}

// Get optional fields
export function getOptionalTargetFields(): TemplateFieldConfig[] {
  return TARGET_TEMPLATE_FIELDS.filter((field) => !field.isRequired && field.enabled);
}

// Get field by name
export function getTargetFieldConfig(fieldName: string): TemplateFieldConfig | undefined {
  return TARGET_TEMPLATE_FIELDS.find((field) => field.name === fieldName);
}

// Target Template Configuration
export const TARGET_TEMPLATE_CONFIG: TemplateConfig = {
  type: "orders", // Reuse orders type for now, could add "targets" to ImportType later
  fields: TARGET_TEMPLATE_FIELDS,
  instructions: [
    "1. Fill in all REQUIRED fields (SKU, Target Period, Period Type)",
    "2. Target Quantity and Target Revenue are optional but at least one should be provided",
    "3. All SKUs must exist in your products catalog and be active",
    "4. Target Period should be the start date of the period (e.g., first day of month for monthly)",
    "5. Period Type must be one of: monthly, quarterly, yearly",
    "6. Dates must be in YYYY-MM-DD format",
    "7. Numbers should not contain currency symbols or commas",
    "8. Save the file and upload it to the Targets page",
  ],
};

