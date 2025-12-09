# Invoice Generation Error Fix Plan

## Root Cause Analysis

### Error Details

- **Error Message**: `null value in column "invoice_number" of relation "invoices" violates not-null constraint`
- **Error Location**: `app/api/orders/[id]/generate-invoice/route.ts` line 375
- **Trigger**: When trying to generate an invoice for a completed order

### Root Cause

The API endpoint at [`app/api/orders/[id]/generate-invoice/route.ts`](app/api/orders/[id]/generate-invoice/route.ts) is missing the `invoice_number` field when creating an invoice record. The database schema has a NOT NULL constraint on the `invoice_number` column, but the API is not providing this required field.

### Code Analysis

1. In [`hooks/use-invoices.ts`](hooks/use-invoices.ts:164), the `createInvoice` function properly generates an invoice number using `invoice_number: \`INV-${Date.now()}\``
2. However, in [`app/api/orders/[id]/generate-invoice/route.ts`](app/api/orders/[id]/generate-invoice/route.ts:78-107), the `invoiceData` object does not include the `invoice_number` field
3. When the API tries to insert this record into the database, it fails due to the NOT NULL constraint

## Solution Architecture

### 1. Invoice Number Generation Strategy

We need to implement a consistent and reliable invoice number generation system. There are several approaches:

#### Option A: Timestamp-based (Current approach in use-invoices.ts)

```typescript
invoice_number: `INV-${Date.now()}`;
```

**Pros**: Simple, unique, no database dependency
**Cons**: Not sequential, hard to read

#### Option B: Sequential with Prefix

```typescript
// Query the latest invoice number and increment
const latestInvoice = await supabase
  .from("invoices")
  .select("invoice_number")
  .eq("brand_id", order.brand_id)
  .order("invoice_number", { ascending: false })
  .limit(1)
  .single();

const nextNumber = latestInvoice
  ? parseInt(latestInvoice.invoice_number.split("-")[1]) + 1
  : 1;
invoice_number: `INV-${String(nextNumber).padStart(6, "0")}`;
```

**Pros**: Sequential, professional appearance
**Cons**: Requires database query, potential race conditions

#### Option C: UUID-based

```typescript
invoice_number: `INV-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
```

**Pros**: Guaranteed unique, no database dependency
**Cons**: Not user-friendly

### Recommended Solution

Use **Option A** (Timestamp-based) for immediate fix, but plan to implement **Option B** (Sequential) as a future improvement for better user experience.

## Implementation Plan

### Phase 1: Immediate Fix (Critical)

1. **Fix the API endpoint** to include invoice_number generation
2. **Update the invoice creation logic** to match the pattern used in use-invoices.ts
3. **Add error handling** for invoice number generation

### Phase 2: Enhanced Invoice Number System (Future)

1. **Implement sequential invoice numbering** per brand
2. **Add database function** for atomic invoice number generation
3. **Update UI** to display more user-friendly invoice numbers

## Detailed Implementation

### Phase 1: Immediate Fix

#### 1. Update app/api/orders/[id]/generate-invoice/route.ts

```typescript
// Add this function at the top of the file
function generateInvoiceNumber(): string {
  return `INV-${Date.now()}`;
}

// Update the invoiceData object (lines 78-107)
const invoiceData: Partial<Invoice> = {
  invoice_number: generateInvoiceNumber(), // ADD THIS LINE
  order_id: order.id,
  user_id: user.id,
  brand_id: order.brand_id,
  // ... rest of the fields remain the same
};
```

#### 2. Add Error Handling

```typescript
// Add validation for invoice number generation
if (!invoiceData.invoice_number) {
  return NextResponse.json(
    { error: "Failed to generate invoice number" },
    { status: 500 }
  );
}
```

### Phase 2: Enhanced System (Future)

#### 1. Create Database Function for Sequential Numbers

```sql
-- Create a function to generate sequential invoice numbers
CREATE OR REPLACE FUNCTION generate_sequential_invoice_number(brand_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  latest_number INTEGER;
  prefix TEXT := 'INV';
  next_number INTEGER;
BEGIN
  -- Get the latest invoice number for this brand
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0)
  INTO latest_number
  FROM invoices
  WHERE brand_id = brand_id_param
  AND invoice_number ~ '^INV-[0-9]+$';

  -- Increment by 1
  next_number := latest_number + 1;

  -- Return formatted invoice number
  RETURN prefix || '-' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

#### 2. Update API to Use Sequential Numbers

```typescript
// Replace the generateInvoiceNumber function with:
async function generateSequentialInvoiceNumber(
  supabase: any,
  brandId: string
): Promise<string> {
  const { data, error } = await supabase.rpc(
    "generate_sequential_invoice_number",
    { brand_id_param: brandId }
  );

  if (error) {
    // Fallback to timestamp-based generation
    console.error("Error generating sequential invoice number:", error);
    return `INV-${Date.now()}`;
  }

  return data;
}

// Update the invoice creation:
const invoice_number = await generateSequentialInvoiceNumber(
  supabase,
  order.brand_id
);
```

## Testing Strategy

### 1. Unit Tests

- Test invoice number generation function
- Test API endpoint with valid order data
- Test error handling for various scenarios

### 2. Integration Tests

- Test complete invoice generation flow
- Test with different user roles and permissions
- Test database constraints and relationships

### 3. Edge Cases to Test

- Order already has an invoice
- Order from different brand (permission check)
- Database connection issues during invoice number generation
- Concurrent invoice generation (race conditions)

## Preventive Measures

### 1. Code Review Checklist

- Always verify all NOT NULL constraints are satisfied
- Check for consistency between similar API endpoints
- Validate required fields before database operations

### 2. Database Schema Documentation

- Maintain clear documentation of all table constraints
- Include field requirements in API documentation
- Add comments to code explaining database constraints

### 3. Automated Testing

- Add database constraint validation tests
- Implement integration tests for all API endpoints
- Add CI/CD pipeline checks for schema changes

### 4. Development Tools

- Use TypeScript interfaces that match database schemas
- Implement validation libraries (like Zod) for API requests/responses
- Add database migration testing

## Rollback Plan

If the fix causes issues:

1. **Immediate Rollback**: Revert the API endpoint changes
2. **Temporary Fix**: Disable invoice generation until proper fix is deployed
3. **Data Recovery**: Any invoices created with the new system will remain valid
4. **Communication**: Notify users of any temporary service interruption

## Monitoring and Alerting

1. **Error Tracking**: Monitor for invoice generation failures
2. **Performance Metrics**: Track invoice generation response times
3. **Business Metrics**: Monitor successful invoice creation rates
4. **Alerts**: Set up alerts for increased error rates

## Implementation Timeline

### Phase 1 (Immediate - 1-2 days)

- [ ] Fix the API endpoint with invoice_number generation
- [ ] Add basic error handling
- [ ] Deploy to staging environment
- [ ] Test with various scenarios
- [ ] Deploy to production

### Phase 2 (Future - 1-2 weeks)

- [ ] Design sequential invoice number system
- [ ] Create database function
- [ ] Update API to use sequential numbers
- [ ] Implement comprehensive testing
- [ ] Deploy with proper migration plan

## Success Criteria

1. **Immediate**: Invoice generation works without errors
2. **Short-term**: All existing functionality continues to work
3. **Long-term**: Improved user experience with sequential invoice numbers
4. **Quality**: No regression in existing functionality
5. **Performance**: No significant impact on API response times

## Conclusion

The root cause is a missing `invoice_number` field in the invoice generation API. The fix is straightforward but requires careful implementation and testing. The immediate solution will resolve the error, while the enhanced system will provide better user experience in the future.

This plan ensures a systematic approach to fixing the issue while preventing similar problems in the future through improved processes and tooling.
