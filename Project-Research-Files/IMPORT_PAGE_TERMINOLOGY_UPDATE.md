# Import Page Terminology Update

**Date:** November 23, 2025  
**Status:** ✅ Completed

## Overview

Updated the Import Data page to use dynamic terminology (Orders, Sales, Products) based on the active tab. This ensures that all labels, messages, and UI text match the context of what the user is importing.

## Problem Statement

The Import page was displaying hardcoded "Orders" terminology throughout the interface, regardless of which tab (Orders, Sales, or Products) the user was working in. This created confusion as users would see "Total Orders" when importing sales data or products.

## Solution Implemented

### 1. ValidationResultsPanel Component (`components/import/ValidationResultsPanel.tsx`)

**Changes:**
- Added `entityName` prop (optional, defaults to "Orders")
- Updated "Total Orders" label to use dynamic `Total {entityName}`
- Updated success message to use `{entityName.toLowerCase()}`
- Updated proceed button text to use `Proceed with {count} {entityName}`

**Code Changes:**
```typescript
interface ValidationResultsPanelProps {
  results: ValidationResult;
  onDownloadErrors?: () => void;
  onProceed?: () => void;
  loading?: boolean;
  entityName?: string; // NEW
}

export function ValidationResultsPanel({
  results,
  onDownloadErrors,
  onProceed,
  loading = false,
  entityName = "Orders", // NEW with default
}: ValidationResultsPanelProps) {
  // ... component uses entityName in:
  // - "Total {entityName}" label
  // - Validation success message
  // - Proceed button text
}
```

### 2. Main Import Page (`app/import/page.tsx`)

**Changes:**
- Added `entityName` computed value based on `activeTab`
- Passed `entityName` to `ValidationResultsPanel`
- Updated import completion summary messages to use `entityName`
- Updated summary stats label from "Total Orders" to `Total {entityName}`
- Updated action buttons to use dynamic text:
  - "View Imported {entityName}"
  - "Import More {entityName}"
- Updated `ImportProgressDialog` props to include `entityName`
- Updated progress dialog titles and descriptions to use `entityName`

**Key Logic:**
```typescript
const entityName = activeTab === "products" ? "Products" : activeTab === "sales" ? "Sales" : "Orders";
```

**Usage Examples:**
- Success message: `All ${importSummary.successful} ${entityName.toLowerCase()} were imported successfully.`
- Button text: `View Imported ${entityName}`
- Progress dialog: `Importing ${entityName}...`

### 3. ImportProgressDialog Component (`components/import/ImportProgressDialog.tsx`)

**Changes:**
- Added `entityName` prop (optional, defaults to "Orders")
- Updated default dialog descriptions to use `entityName.toLowerCase()`

**Code Changes:**
```typescript
interface ImportProgressDialogProps {
  open: boolean;
  progress: number;
  status: "processing" | "completed" | "failed";
  summary?: ImportSummary;
  onClose: () => void;
  title?: string;
  description?: string;
  entityName?: string; // NEW
}

// Updated default descriptions:
// - `All ${summary.successful} ${entityName.toLowerCase()} were imported successfully`
// - `${summary.successful} ${entityName.toLowerCase()} imported, ${summary.failed} failed`
// - `Your ${entityName.toLowerCase()} have been imported`
```

### 4. InstructionsBanner Component (`components/import/InstructionsBanner.tsx`)

**Changes:**
- Made "Important Requirements" section dynamic based on `importType`
- Added conditional requirements for Products import:
  - SKU must be unique
  - Upsert behavior
  - Price validation
- Updated Orders/Sales requirements:
  - Removed "calculate order totals" for Sales
  - Added "Sales Date normalization" for Sales
  - Kept "calculate order totals" for Orders only

**Code Changes:**
```typescript
{isProducts ? (
  <>
    <li>• SKU must be unique across all products for your brand</li>
    <li>• If a product with the same SKU exists, it will be updated (upsert)</li>
    <li>• All prices must be 0 or greater</li>
    <li>• Products must have status = 'active'</li>
    <li>• Do not modify column headers in the template</li>
  </>
) : (
  <>
    <li>• All SKUs must exist in your products catalog before importing</li>
    <li>• Products must have status = 'active'</li>
    <li>• Dates should be in format: YYYY-MM-DD (e.g., 2025-11-08)</li>
    <li>• Do not modify column headers in the template</li>
    {!isSales && <li>• The system will automatically calculate order totals</li>}
    {isSales && <li>• Sales Date will be normalized to the first day of the month</li>}
  </>
)}
```

## Files Modified

1. `components/import/ValidationResultsPanel.tsx`
2. `app/import/page.tsx`
3. `components/import/ImportProgressDialog.tsx`
4. `components/import/InstructionsBanner.tsx`

## Testing Verification

### Orders Import Tab
- ✅ Banner shows "How to Import Orders"
- ✅ Validation panel shows "Total Orders"
- ✅ Progress dialog shows "Importing Orders..."
- ✅ Completion shows "Total Orders" in stats
- ✅ Button shows "View Imported Orders"
- ✅ Button shows "Import More Orders"
- ✅ Requirements include "calculate order totals"

### Sales Import Tab
- ✅ Banner shows "How to Import Sales Data"
- ✅ Validation panel shows "Total Sales"
- ✅ Progress dialog shows "Importing Sales..."
- ✅ Completion shows "Total Sales" in stats
- ✅ Button shows "View Imported Sales"
- ✅ Button shows "Import More Sales"
- ✅ Requirements include "Sales Date normalization"
- ✅ Requirements exclude "calculate order totals"

### Products Import Tab
- ✅ Banner shows "How to Import Products"
- ✅ Validation panel shows "Total Products"
- ✅ Progress dialog shows "Importing Products..."
- ✅ Completion shows "Total Products" in stats
- ✅ Button shows "View Imported Products"
- ✅ Button shows "Import More Products"
- ✅ Requirements show Products-specific rules (SKU uniqueness, upsert, etc.)

## Benefits

1. **Improved UX**: Users see context-appropriate terminology throughout their workflow
2. **Reduced Confusion**: No more seeing "Orders" when working with Sales or Products
3. **Consistency**: All components now dynamically adapt to the import context
4. **Maintainability**: Single source of truth for entity names based on active tab
5. **Scalability**: Easy to add new import types in the future

## Related Features

This change aligns with the existing import infrastructure:
- Orders Import Hook (`hooks/use-import-orders.ts`)
- Sales Import Hook (`hooks/use-import-sales.ts`)
- Products Import Hook (`hooks/use-import-products.ts`)
- Import Type Tabs Component (`components/import/ImportTypeTabs.tsx`)

## Notes

- All changes maintain backward compatibility
- Default values ensure existing code continues to work
- No breaking changes to component interfaces
- Linter checks passed on all modified files

## Future Considerations

When implementing bulk import features using ExcelJS library for Distributors (monthly orders), ensure:
- The same dynamic terminology pattern is applied
- Batch processing messages use appropriate entity names
- Error messages reference the correct entity type
- Template generation respects the entity context

