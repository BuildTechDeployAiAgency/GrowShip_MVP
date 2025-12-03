# Changelog - December 3, 2025 - Fix Shipment Products Type Error

## Summary

Fixed a TypeScript compilation error that was causing Vercel deployment to fail.

## Problem

The Vercel build failed with the following error:

```
Property 'products' does not exist on type 'OrderLineWithInventory'.
```

**Location**: `components/shipments/create-shipment-dialog.tsx:155`

The Supabase query fetches order lines with a joined `products` relation containing inventory data, but the `OrderLineWithInventory` TypeScript interface did not include this property.

## Solution

Updated the `OrderLineWithInventory` interface to include the `products` property with the correct nested type structure.

## Changes

### File Modified

- `components/shipments/create-shipment-dialog.tsx`

### Code Change

Added `products` property to the `OrderLineWithInventory` interface:

```typescript
interface OrderLineWithInventory extends OrderLine {
  available_stock?: number;
  quantity_in_stock?: number;
  products?: {
    id: string;
    sku: string;
    quantity_in_stock: number;
    available_stock: number;
    allocated_stock: number;
  } | null;
}
```

This matches the structure returned by the Supabase query that joins order lines with product inventory data.

## Impact

- Fixes Vercel deployment build error
- No functional changes to application behavior
- Type safety improved for shipment creation dialog

