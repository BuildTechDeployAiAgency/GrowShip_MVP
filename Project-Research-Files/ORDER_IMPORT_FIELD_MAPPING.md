# Order Import Field Mapping Documentation

## Overview

This document describes the field mappings between Excel columns and the database order structure for the bulk order import feature using ExcelJS.

## Import Process Flow

1. **File Upload**: User uploads Excel file (.xlsx or .xls)
2. **Parsing**: Excel file is parsed using ExcelJS library
3. **Order Grouping**: Rows are grouped into orders based on `Order Date` + `Customer Name`
4. **Validation**: Orders are validated against business rules and database constraints
5. **Import**: Valid orders are inserted into the database in batches

## Excel Column to Database Field Mapping

### Required Fields

These fields must be present in the Excel file and cannot be empty:

| Excel Column Header | Field ID (Database) | Data Type | Description | Example | Validation |
|---------------------|---------------------|-----------|-------------|---------|------------|
| **Order Date** | `order_date` | Date | Date when the order was placed | `2025-11-08` or `11/08/2025` | Must be valid date format (YYYY-MM-DD) |
| **Customer Name** | `customer_name` | String | Full name of the customer | `John Doe` | Cannot be empty |
| **SKU** | `sku` | String | Product SKU identifier | `PROD-001` | Must exist in products catalog and be active |
| **Quantity** | `quantity` | Number | Number of items ordered | `10` | Must be >= 1 |
| **Unit Price** | `unit_price` | Number | Price per unit | `99.99` | Must be >= 0 |
| **Distributor ID** | `distributor_id` | UUID String | Distributor UUID identifier | `123e4567-e89b-12d3-a456-426614174000` | Must exist in distributors table and be active. Can be empty if user is a distributor. |

### Optional Fields

These fields can be included but are not required:

| Excel Column Header | Field ID (Database) | Data Type | Description | Example | Validation |
|---------------------|---------------------|-----------|-------------|---------|------------|
| **Customer Email** | `customer_email` | Email | Customer email address | `customer@example.com` | Must be valid email format if provided |
| **Customer Phone** | `customer_phone` | String | Customer phone number | `+1-234-567-8900` | No specific format required |
| **Customer Type** | `customer_type` | String | Type of customer | `retail` | Must be one of: `retail`, `wholesale`, `distributor`, `manufacturer` |
| **Product Name** | `product_name` | String | Product name (for reference) | `Premium Widget` | No validation |
| **Discount %** | `discount` | Number | Discount percentage | `10` | Must be between 0 and 100 |
| **Tax Rate %** | `tax_rate` | Number | Tax rate percentage | `8.5` | Must be between 0 and 100 |
| **Shipping Address Line 1** | `shipping_address_line1` | String | First line of shipping address | `123 Main St` | No validation |
| **Shipping Address Line 2** | `shipping_address_line2` | String | Second line of shipping address | `Apt 4B` | No validation |
| **Shipping City** | `shipping_city` | String | City for shipping | `New York` | No validation |
| **Shipping State/Province** | `shipping_state` | String | State or province for shipping | `NY` | No validation |
| **Shipping Zip/Postal Code** | `shipping_zip_code` | String | Zip or postal code | `10001` | No validation |
| **Shipping Country** | `shipping_country` | String | Country for shipping | `USA` | No validation |
| **Shipping Method** | `shipping_method` | String | Shipping method | `Standard` | No validation |
| **Shipping Cost** | `shipping_cost` | Number | Shipping cost | `15.00` | Must be >= 0 |
| **Payment Method** | `payment_method` | String | Payment method used | `Credit Card` | No validation |
| **Payment Status** | `payment_status` | String | Payment status | `pending` | Must be one of: `pending`, `paid`, `failed`, `refunded`, `partially_paid` |
| **Notes** | `notes` | String | Additional notes for the order | `Urgent delivery` | No validation |

## Order Grouping Logic

Orders are grouped based on the combination of:
- **Order Date** (`order_date`)
- **Customer Name** (`customer_name`)

**Important**: Multiple rows with the same `Order Date` and `Customer Name` are treated as items within the same order. Each row represents one line item.

### Example:

```
Order Date    | Customer Name | SKU      | Quantity | Unit Price
--------------|---------------|----------|----------|------------
2025-11-08    | John Doe      | PROD-001 | 5        | 10.00
2025-11-08    | John Doe      | PROD-002 | 3        | 15.00
2025-11-09    | Jane Smith    | PROD-001 | 2        | 10.00
```

This creates:
- **Order 1**: John Doe on 2025-11-08 with 2 items (PROD-001 x5, PROD-002 x3)
- **Order 2**: Jane Smith on 2025-11-09 with 1 item (PROD-001 x2)

## Database Schema Mapping

### Orders Table

| Excel Field | Database Column | Type | Notes |
|-------------|----------------|------|-------|
| `order_date` | `order_date` | DATE | Required |
| `customer_name` | `customer_name` | TEXT | Required |
| `customer_email` | `customer_email` | TEXT | Optional |
| `customer_phone` | `customer_phone` | TEXT | Optional |
| `customer_type` | `customer_type` | TEXT | Optional |
| `distributor_id` | `distributor_id` | UUID | Required (foreign key to distributors) |
| `shipping_address_line1` | `shipping_address_line1` | TEXT | Optional |
| `shipping_address_line2` | `shipping_address_line2` | TEXT | Optional |
| `shipping_city` | `shipping_city` | TEXT | Optional |
| `shipping_state` | `shipping_state` | TEXT | Optional |
| `shipping_zip_code` | `shipping_zip_code` | TEXT | Optional |
| `shipping_country` | `shipping_country` | TEXT | Optional |
| `shipping_method` | `shipping_method` | TEXT | Optional |
| `shipping_cost` | `shipping_cost` | DECIMAL | Optional, defaults to 0 |
| `payment_method` | `payment_method` | TEXT | Optional |
| `payment_status` | `payment_status` | TEXT | Optional, defaults to "pending" |
| `notes` | `notes` | TEXT | Optional |
| - | `order_number` | TEXT | Auto-generated: `ORD-{timestamp}-{random}` |
| - | `order_status` | TEXT | Auto-set to "pending" |
| - | `currency` | TEXT | Auto-set to "USD" |
| - | `subtotal` | DECIMAL | Calculated from items |
| - | `discount_total` | DECIMAL | Calculated from items |
| - | `tax_total` | DECIMAL | Calculated from items |
| - | `total_amount` | DECIMAL | Calculated: subtotal - discount + tax + shipping |

### Order Items (JSONB Array)

Each order contains an `items` array with the following structure:

| Excel Field | Item Property | Type | Notes |
|-------------|---------------|------|-------|
| `sku` | `sku` | TEXT | Required, must exist in products |
| `product_name` | `product_name` | TEXT | Optional |
| `quantity` | `quantity` | INTEGER | Required, >= 1 |
| `unit_price` | `unit_price` | DECIMAL | Required, >= 0 |
| `discount` | `discount` | DECIMAL | Optional, defaults to 0 |
| `tax_rate` | `tax_rate` | DECIMAL | Optional, defaults to 0 |
| - | `total` | DECIMAL | Calculated: `(quantity * unit_price) * (1 - discount/100) * (1 + tax_rate/100)` |

## Calculation Logic

### Item Total Calculation

```javascript
let itemSubtotal = quantity * unit_price;
if (discount > 0) {
  itemSubtotal = itemSubtotal * (1 - discount / 100);
}
if (tax_rate > 0) {
  itemSubtotal = itemSubtotal * (1 + tax_rate / 100);
}
item.total = Math.round(itemSubtotal * 100) / 100;
```

### Order Totals Calculation

```javascript
subtotal = sum of all item subtotals
discount_total = sum of all item discounts
tax_total = sum of all item taxes
total_amount = subtotal - discount_total + tax_total + shipping_cost
```

## Validation Rules

### File-Level Validation

- **File Size**: Maximum 10MB
- **File Type**: Must be .xlsx or .xls
- **Row Count**: Maximum 5,000 rows

### Field-Level Validation

1. **Order Date**: Must be valid date in format YYYY-MM-DD
2. **Customer Name**: Cannot be empty or whitespace only
3. **SKU**: Must exist in products table for the brand, product must be active
4. **Quantity**: Must be >= 1
5. **Unit Price**: Must be >= 0
6. **Distributor ID**: Must exist in distributors table and be active (unless user is distributor)
7. **Email**: If provided, must be valid email format
8. **Customer Type**: If provided, must be one of the allowed values
9. **Discount %**: If provided, must be between 0 and 100
10. **Tax Rate %**: If provided, must be between 0 and 100
11. **Shipping Cost**: If provided, must be >= 0
12. **Payment Status**: If provided, must be one of the allowed values

### Business Rules

1. **One Distributor Per Upload**: All rows in a single Excel file must have the same `Distributor ID` (or be empty for distributor users)
2. **Product Existence**: All SKUs must exist in the products catalog for the brand
3. **Product Status**: All products must be active
4. **Order Grouping**: Orders are automatically grouped by date + customer name

## Error Handling

### Validation Errors

Errors are reported with:
- **Row Number**: Excel row number (1-based, excluding header)
- **Field**: Field name that failed validation
- **Message**: Human-readable error message
- **Code**: Error code for programmatic handling

### Common Error Codes

- `NO_ORDERS`: No orders found in file
- `REQUIRED_FIELD`: Required field is missing or empty
- `INVALID_DATE_FORMAT`: Date format is invalid
- `INVALID_EMAIL`: Email format is invalid
- `SKU_NOT_FOUND`: SKU does not exist in products catalog
- `PRODUCT_NOT_ACTIVE`: Product exists but is not active
- `INVALID_QUANTITY`: Quantity is <= 0
- `INVALID_UNIT_PRICE`: Unit price is < 0
- `INVALID_DISTRIBUTOR`: Distributor ID is invalid or not found
- `DISTRIBUTOR_NOT_ACTIVE`: Distributor exists but is not active
- `INVALID_DISCOUNT`: Discount is not between 0 and 100
- `INVALID_TAX_RATE`: Tax rate is not between 0 and 100
- `INVALID_SHIPPING_COST`: Shipping cost is < 0
- `INVALID_CUSTOMER_TYPE`: Customer type is not in allowed list
- `INVALID_PAYMENT_STATUS`: Payment status is not in allowed list
- `NO_ITEMS`: Order has no items

## Import Process

1. **Upload**: File is uploaded and parsed
2. **Parse**: Excel rows are parsed into `ParsedOrder` objects
3. **Group**: Rows are grouped into orders by date + customer name
4. **Extract Distributor**: Distributor ID is extracted from first row (if present)
5. **Validate**: Orders are validated against business rules
6. **Confirm**: User confirms distributor assignment
7. **Import**: Valid orders are inserted into database in batches of 50
8. **Log**: Import results are logged to `import_logs` table

## Distributor Auto-Pickup

The system automatically extracts the `Distributor ID` from the Excel sheet:

1. **Extraction**: First non-empty `Distributor ID` value is extracted
2. **Validation**: All rows must have the same distributor ID (or be empty)
3. **Auto-Selection**: If a single distributor ID is found, it's auto-selected in the confirmation dialog
4. **Warning**: If multiple different distributor IDs are found, a warning is shown

## File Format Requirements

### Excel File Structure

- **First Row**: Must contain column headers (exact match required)
- **Data Rows**: Start from row 2
- **Empty Rows**: Are skipped automatically
- **Date Formats**: Accepts YYYY-MM-DD, MM/DD/YYYY, or DD-MM-YYYY
- **Number Formats**: Should not include currency symbols or commas

### Example Excel Structure

```
Order Date    | Customer Name | SKU      | Quantity | Unit Price | Distributor ID
--------------|---------------|----------|----------|------------|------------------
2025-11-08    | John Doe      | PROD-001 | 5        | 10.00      | 123e4567-...
2025-11-08    | John Doe      | PROD-002 | 3        | 15.00      | 123e4567-...
2025-11-09    | Jane Smith    | PROD-001 | 2        | 10.00      | 123e4567-...
```

## Notes

- All monetary values are stored as DECIMAL in the database
- Dates are stored as DATE type (YYYY-MM-DD format)
- Order numbers are auto-generated and unique
- Import logs track all import attempts for audit purposes
- Failed imports can be retried after fixing errors
- Partial imports are supported (some orders succeed, some fail)

