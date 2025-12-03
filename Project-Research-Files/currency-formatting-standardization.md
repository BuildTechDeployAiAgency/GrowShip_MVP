# Currency Formatting Standardization

## Overview

This document describes the centralized currency formatting system implemented across the GrowShip application.

## Implementation

### Centralized Utility: `lib/formatters.ts`

```typescript
// Format currency with proper symbol, commas, and decimals
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "USD"
): string {
  const value = amount ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format numbers with thousand separators
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 0
): string {
  const num = value ?? 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Format percentage values
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1
): string {
  const num = value ?? 0;
  return `${num.toFixed(decimals)}%`;
}
```

## Usage

### Basic Currency Formatting

```tsx
import { formatCurrency } from "@/lib/formatters";

// Standard usage
formatCurrency(1234.56);          // "$1,234.56"
formatCurrency(1234.56, "EUR");   // "€1,234.56"
formatCurrency(1234.56, "GBP");   // "£1,234.56"

// Handles null/undefined
formatCurrency(null);             // "$0.00"
formatCurrency(undefined);        // "$0.00"
```

### Number Formatting

```tsx
import { formatNumber } from "@/lib/formatters";

formatNumber(1234567);            // "1,234,567"
formatNumber(1234.567, 2);        // "1,234.57"
```

### Percentage Formatting

```tsx
import { formatPercentage } from "@/lib/formatters";

formatPercentage(12.345);         // "12.3%"
formatPercentage(12.345, 2);      // "12.35%"
```

## Format Specifications

| Aspect | Value |
|--------|-------|
| Currency Symbol | Single symbol prefix (e.g., `$`) |
| Thousands Separator | Comma (`,`) |
| Decimal Separator | Period (`.`) |
| Decimal Places | 2 (always) |
| Missing Values | `$0.00` |
| Locale | `en-US` |

## Components Using This System

### Products & Inventory
- `product-details-content.tsx`
- `inventory-products-list.tsx`
- `products-list.tsx`
- `inventory-dashboard.tsx`

### Distributors & Manufacturers
- `distributor-details-dialog.tsx`
- `manufacturers/[id]/page.tsx`

### Forecasting & Targets
- `forecast-table.tsx`
- `forecast-chart.tsx`
- `target-upload-dialog.tsx`
- `targets-list.tsx`

### Sales & Dashboard
- `seasonal-analysis-chart.tsx`
- `top-regions-countries-chart.tsx`
- `top-skus-table.tsx`
- `top-customers-distributors-chart.tsx`
- `targets-vs-actuals-chart.tsx`
- `sales-by-category-chart.tsx`
- `revenue-comparison-chart.tsx`
- `sales-by-territory-chart.tsx`

## Migration Notes

When adding new components that display currency:

1. Import the utility:
   ```tsx
   import { formatCurrency } from "@/lib/formatters";
   ```

2. Use `formatCurrency()` instead of:
   - Manual `$` + `toLocaleString()`
   - Local `formatCurrency` helper functions
   - `Intl.NumberFormat` directly

3. For multi-currency support, pass the currency code:
   ```tsx
   formatCurrency(amount, product.currency || "USD")
   ```

## Scalability Considerations

For the ExcelJS import feature (bulk order imports):

- The `formatCurrency` utility can be used to display imported monetary values consistently
- Currency parsing for imports is handled separately in `lib/excel/product-parser.ts` (removes symbols before parsing)
- Consider adding locale-aware parsing if supporting international formats in imports

