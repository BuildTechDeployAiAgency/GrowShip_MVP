<!-- acea0de2-e315-4801-91c1-d855f2e90628 7a3af414-2027-488b-9ab4-ce99f82e8fa8 -->
# Import Page Diagnostics and Fixes

## Issues Identified

1. **Menu/Sidebar Missing**: Import page doesn't use `MainLayout`, so sidebar is not visible
2. **Error Handling**: Errors logged to console but not always shown to users; system errors need better logging
3. **Field Mapping Documentation**: Missing documentation file for Excel field mappings
4. **Distributor Auto-Pickup**: Distributor ID extracted from sheet but not used to auto-select distributor
5. **Silent Import Failures**: Import appears successful but data not saved (needs diagnosis)

## Implementation Plan

### 1. Fix Menu Consistency (`app/import/page.tsx`)

- Wrap page content with `MainLayout` component (like other pages)
- Ensure sidebar is visible and functional on `/import` route
- Maintain existing page functionality while adding layout wrapper

### 2. Enhance Error Handling

**Frontend (`hooks/use-import-orders.ts`)**:

- Add comprehensive error catching in `confirmImport` function
- Display user-friendly error messages via toast notifications
- Show specific error details when import fails
- Handle network errors, validation errors, and server errors separately

**Backend (`app/api/import/orders/confirm/route.ts`)**:

- Add detailed console logging for system errors (include stack traces)
- Log batch insertion failures with row numbers
- Return detailed error information in API response
- Add try-catch around database operations with proper error logging

**Backend (`app/api/import/orders/route.ts`)**:

- Improve error messages for parsing failures
- Log file parsing errors with file details

**Backend (`app/api/import/orders/validate/route.ts`)**:

- Log validation errors for debugging
- Return more detailed validation error information

### 3. Create Field Mapping Documentation (`Project-Research-Files/ORDER_IMPORT_FIELD_MAPPING.md`)

- Document all Excel column headers and their corresponding database fields
- Include field types, requirements, and validation rules
- Map Excel column names to ParsedOrder interface properties
- Document the order grouping logic (order_date + customer_name)
- Include examples and data format requirements

### 4. Implement Distributor Auto-Pickup

**Parser Enhancement (`lib/excel/parser.ts`)**:

- Extract distributor_id from first non-empty row in sheet
- Validate that all rows have the same distributor_id (enforce one distributor per upload)
- Return extracted distributor_id in parsing result

**Frontend (`app/import/page.tsx`)**:

- Use extracted distributor_id from parsed orders to auto-select distributor
- Pre-populate distributor selection in `DistributorConfirmationDialog`
- Show warning if multiple distributor IDs found in sheet
- Auto-confirm distributor if only one distributor ID found and user is not distributor user

**API Response (`app/api/import/orders/route.ts`)**:

- Include extracted distributor_id in response data
- Validate distributor_id consistency across all rows

### 5. Diagnose and Fix Silent Import Failures

**Investigation Steps**:

- Add detailed logging in `confirmImport` API route to track:
- Number of orders received
- Batch processing status
- Database insertion results
- Any errors during insertion
- Check if orders are being inserted but with wrong brand_id/distributor_id
- Verify database constraints aren't silently failing
- Add transaction logging to track import progress

**Potential Fixes**:

- Ensure `adminSupabase` client is properly configured
- Verify RLS policies allow order insertion
- Check if foreign key constraints are failing silently
- Add validation before insertion to catch issues early
- Return detailed success/failure counts in API response

**Frontend Updates**:

- Show import progress with detailed status
- Display success/failure counts after import
- Provide link to view imported orders
- Show error details if import partially fails

## Files to Modify

1. `app/import/page.tsx` - Add MainLayout wrapper, implement distributor auto-pickup
2. `hooks/use-import-orders.ts` - Enhance error handling and user feedback
3. `app/api/import/orders/confirm/route.ts` - Add detailed logging and error handling
4. `app/api/import/orders/route.ts` - Return distributor_id, improve error messages
5. `lib/excel/parser.ts` - Extract and validate distributor_id from sheet
6. `components/import/DistributorConfirmationDialog.tsx` - Auto-select distributor if found
7. `Project-Research-Files/ORDER_IMPORT_FIELD_MAPPING.md` - Create documentation file

## Testing Checklist

- [x] Sidebar visible on `/import` page
- [x] Error messages displayed to user when import fails
- [x] System errors logged to console with details
- [x] Distributor auto-selected from Excel sheet
- [x] Warning shown if multiple distributors in sheet
- [x] Import actually saves orders to database
- [x] Success message shows correct count of imported orders
- [x] Failed orders are reported with error details
- [x] Field mapping documentation is complete and accurate

### To-dos

- [x] Wrap import page with MainLayout to show sidebar consistently
- [x] Improve error handling in use-import-orders hook with user-friendly messages
- [x] Add detailed logging and error handling in import API routes
- [x] Create ORDER_IMPORT_FIELD_MAPPING.md documentation file
- [x] Extract distributor_id from Excel sheet and auto-select in dialog
- [x] Add logging and diagnose why imports are not saving data
- [x] Fix the root cause preventing orders from being saved

