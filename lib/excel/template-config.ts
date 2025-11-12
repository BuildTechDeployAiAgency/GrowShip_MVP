import { TemplateFieldConfig, TemplateConfig } from "@/types/import";

// Order Template Field Definitions
export const ORDER_TEMPLATE_FIELDS: TemplateFieldConfig[] = [
  // Required Fields
  {
    name: "order_date",
    header: "Order Date",
    isRequired: true,
    dataType: "date",
    description: "Date when the order was placed",
    example: "2025-11-08 or 11/08/2025",
    width: 15,
    enabled: true,
  },
  {
    name: "customer_name",
    header: "Customer Name",
    isRequired: false,
    dataType: "string",
    description: "Full name of the customer (auto-filled from your profile if empty)",
    example: "John Doe",
    width: 25,
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
    name: "quantity",
    header: "Quantity",
    isRequired: true,
    dataType: "number",
    description: "Number of items ordered",
    example: "10",
    validation: { min: 1 },
    width: 12,
    enabled: true,
  },
  {
    name: "unit_price",
    header: "Unit Price",
    isRequired: true,
    dataType: "number",
    description: "Price per unit",
    example: "99.99",
    validation: { min: 0 },
    width: 12,
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
  
  // Optional Fields
  {
    name: "customer_email",
    header: "Customer Email",
    isRequired: false,
    dataType: "email",
    description: "Customer email address (auto-filled from your profile if empty)",
    example: "customer@example.com",
    width: 25,
    enabled: true,
  },
  {
    name: "customer_phone",
    header: "Customer Phone",
    isRequired: false,
    dataType: "phone",
    description: "Customer phone number",
    example: "+1-234-567-8900",
    width: 18,
    enabled: true,
  },
  {
    name: "customer_type",
    header: "Customer Type",
    isRequired: false,
    dataType: "string",
    description: "Type of customer",
    example: "retail",
    validation: { options: ["retail", "wholesale", "distributor", "manufacturer"] },
    width: 15,
    enabled: false,
  },
  {
    name: "product_name",
    header: "Product Name",
    isRequired: false,
    dataType: "string",
    description: "Product name (optional, for reference)",
    example: "Premium Widget",
    width: 25,
    enabled: false,
  },
  {
    name: "discount",
    header: "Discount %",
    isRequired: false,
    dataType: "number",
    description: "Discount percentage",
    example: "10",
    validation: { min: 0, max: 100 },
    width: 12,
    enabled: false,
  },
  {
    name: "tax_rate",
    header: "Tax Rate %",
    isRequired: false,
    dataType: "number",
    description: "Tax rate percentage",
    example: "8.5",
    validation: { min: 0, max: 100 },
    width: 12,
    enabled: false,
  },
  {
    name: "shipping_address_line1",
    header: "Shipping Address Line 1",
    isRequired: false,
    dataType: "string",
    description: "First line of shipping address",
    example: "123 Main St",
    width: 30,
    enabled: false,
  },
  {
    name: "shipping_address_line2",
    header: "Shipping Address Line 2",
    isRequired: false,
    dataType: "string",
    description: "Second line of shipping address",
    example: "Apt 4B",
    width: 30,
    enabled: false,
  },
  {
    name: "shipping_city",
    header: "Shipping City",
    isRequired: false,
    dataType: "string",
    description: "City for shipping",
    example: "New York",
    width: 20,
    enabled: false,
  },
  {
    name: "shipping_state",
    header: "Shipping State/Province",
    isRequired: false,
    dataType: "string",
    description: "State or province for shipping",
    example: "NY",
    width: 20,
    enabled: false,
  },
  {
    name: "shipping_zip_code",
    header: "Shipping Zip/Postal Code",
    isRequired: false,
    dataType: "string",
    description: "Zip or postal code",
    example: "10001",
    width: 18,
    enabled: false,
  },
  {
    name: "shipping_country",
    header: "Shipping Country",
    isRequired: false,
    dataType: "string",
    description: "Country for shipping",
    example: "USA",
    width: 20,
    enabled: false,
  },
  {
    name: "shipping_method",
    header: "Shipping Method",
    isRequired: false,
    dataType: "string",
    description: "Shipping method",
    example: "Standard",
    width: 18,
    enabled: false,
  },
  {
    name: "shipping_cost",
    header: "Shipping Cost",
    isRequired: false,
    dataType: "number",
    description: "Shipping cost",
    example: "15.00",
    validation: { min: 0 },
    width: 15,
    enabled: false,
  },
  {
    name: "payment_method",
    header: "Payment Method",
    isRequired: false,
    dataType: "string",
    description: "Payment method used",
    example: "Credit Card",
    width: 18,
    enabled: false,
  },
  {
    name: "payment_status",
    header: "Payment Status",
    isRequired: false,
    dataType: "string",
    description: "Payment status",
    example: "pending",
    validation: { options: ["pending", "paid", "failed", "refunded", "partially_paid"] },
    width: 18,
    enabled: false,
  },
  {
    name: "notes",
    header: "Notes",
    isRequired: false,
    dataType: "string",
    description: "Additional notes for the order",
    example: "Urgent delivery",
    width: 30,
    enabled: false,
  },
];

// Get only enabled fields
export function getEnabledFields(): TemplateFieldConfig[] {
  return ORDER_TEMPLATE_FIELDS.filter((field) => field.enabled);
}

// Get required fields
export function getRequiredFields(): TemplateFieldConfig[] {
  return ORDER_TEMPLATE_FIELDS.filter((field) => field.isRequired && field.enabled);
}

// Get optional fields
export function getOptionalFields(): TemplateFieldConfig[] {
  return ORDER_TEMPLATE_FIELDS.filter((field) => !field.isRequired && field.enabled);
}

// Get field by name
export function getFieldConfig(fieldName: string): TemplateFieldConfig | undefined {
  return ORDER_TEMPLATE_FIELDS.find((field) => field.name === fieldName);
}

// Order Template Configuration
export const ORDER_TEMPLATE_CONFIG: TemplateConfig = {
  type: "orders",
  fields: ORDER_TEMPLATE_FIELDS,
  instructions: [
    "1. Fill in all REQUIRED fields (Order Date, SKU, Quantity, Unit Price)",
    "2. Customer Name, Customer Email, and Distributor ID will be auto-filled from your account if left empty",
    "3. All SKUs must exist in your products catalog and be active",
    "4. For multiple items in one order, use the same Order Date and Customer Name on consecutive rows",
    "5. Dates can be in formats: YYYY-MM-DD, MM/DD/YYYY, or DD-MM-YYYY",
    "6. Numbers should not contain currency symbols or commas",
    "7. Save the file and upload it to the Import page",
  ],
};

// Export configuration for future extensions (products, customers, etc.)
export const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  orders: ORDER_TEMPLATE_CONFIG,
  // Future: products: PRODUCT_TEMPLATE_CONFIG,
  // Future: customers: CUSTOMER_TEMPLATE_CONFIG,
};

