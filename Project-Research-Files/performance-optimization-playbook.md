# Performance & Scalability Playbook

**Version**: 1.0  
**Last Updated**: 2025-11-21  
**Status**: Production-Ready ✅

This playbook serves as a comprehensive reference for building performant, scalable features in the GrowShip application. All new sections must follow these guidelines to ensure consistent user experience and system stability, especially when handling high-volume data operations like monthly ExcelJS bulk imports.

---

## Table of Contents

1. [Performance Budget & Monitoring](#1-performance-budget--monitoring)
2. [Data Fetching Architecture](#2-data-fetching-architecture)
3. [React Query Configuration](#3-react-query-configuration)
4. [UI Performance Patterns](#4-ui-performance-patterns)
5. [Route Persistence & Navigation](#5-route-persistence--navigation)
6. [ExcelJS Import Readiness](#6-exceljs-import-readiness)
7. [Error Handling & Retry Logic](#7-error-handling--retry-logic)
8. [Checklist for New Features](#8-checklist-for-new-features)
9. [Future Enhancements](#9-future-enhancements)
10. [Related Documentation](#10-related-documentation)

---

## 1. Performance Budget & Monitoring

### Alert Thresholds

Define and enforce performance budgets for all new features:

| Metric | Target | Critical |
|--------|--------|----------|
| List Fetch Time | < 1.0s | < 1.5s |
| Single Query Latency | < 300ms | < 500ms |
| Time to First Byte (TTFB) | < 500ms | < 800ms |
| Cumulative Layout Shift (CLS) | < 0.05 | < 0.1 |
| First Contentful Paint (FCP) | < 1.2s | < 1.8s |
| Largest Contentful Paint (LCP) | < 1.8s | < 2.5s |

### Instrumentation Requirements

Every new feature must include:

#### 1. Client-Side Telemetry

```typescript
// Already configured in app/reportWebVitals.ts
// Automatically captures Web Vitals for all pages
// No additional setup required
```

#### 2. Server-Side Query Logging

```typescript
// Use instrumented fetch wrapper
import { instrumentedFetch } from '@/lib/supabase/instrumented-fetch';

// Automatically logs:
// - Query duration
// - Payload size
// - Warning for queries > 500ms
```

#### 3. API Route Performance

```typescript
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    // ... your logic
    
    const duration = performance.now() - startTime;
    return NextResponse.json(data, {
      headers: { 'X-Response-Time': `${duration}ms` }
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error('[API Error]', {
      endpoint: request.url,
      duration: `${duration}ms`,
      error: error.message,
    });
    throw error;
  }
}
```

### Monitoring Endpoints

- **`/api/analytics/perf`** - Client-side web vitals ingestion
- **`/api/analytics/queries`** - Database query performance statistics (pg_stat_statements)

---

## 2. Data Fetching Architecture

### Pagination Contract

**All list views with potentially > 50 records MUST implement server-side pagination.**

#### ✅ Correct Pattern: Using `usePaginatedResource`

```typescript
// hooks/use-your-entity.ts
import { usePaginatedResource } from '@/hooks/use-paginated-resource';

export function useYourEntities({
  brandId,
  distributorId,
  filters,
}: {
  brandId: string;
  distributorId?: string;
  filters?: YourEntityFilters;
}) {
  const { data, isLoading, error, pagination, refetch } = usePaginatedResource<YourEntity>({
    queryKey: ['your-entities', brandId, distributorId, filters],
    identityKey: 'id',
    endpoint: '/api/your-entities/list',
    params: {
      brandId,
      distributorId,
      ...filters,
    },
    pageSize: 50,
    enabled: !!brandId,
  });

  return {
    entities: data,
    isLoading,
    error,
    ...pagination,
    refetch,
  };
}
```

#### API Route Implementation

```typescript
// app/api/your-entities/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '0');
  const limit = parseInt(searchParams.get('limit') || '50');
  const brandId = searchParams.get('brandId');
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
  }

  const supabase = await createClient();
  
  // Explicit column selection - NEVER use select('*')
  let query = supabase
    .from('your_entities')
    .select(`
      id,
      name,
      status,
      created_at,
      brand_id,
      distributor_id,
      related_entity:related_entities(id, name)
    `, { count: 'exact' })
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  // Apply additional filters
  if (searchParams.get('status')) {
    query = query.eq('status', searchParams.get('status'));
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[YourEntities List] Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    limit,
  });
}
```

### Column-Level Selection

**Never** use `select('*')` for list queries. Always specify exactly which columns are needed:

```typescript
// ❌ BAD - Fetches all columns including large text fields
.select('*')

// ✅ GOOD - Only fetches displayed columns
.select('id, name, status, created_at, brand_id')

// ✅ EXCELLENT - Includes necessary relations
.select(`
  id,
  name,
  status,
  created_at,
  brand:brands(id, name),
  distributor:distributors(id, company_name)
`)
```

### Database Indexing

For every paginated entity, create composite indexes that match your query patterns:

```sql
-- Migration: XXX_optimize_your_entity_indexes.sql

-- Primary list query index
CREATE INDEX IF NOT EXISTS idx_your_entities_list_query 
ON your_entities(brand_id, distributor_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_your_entities_status_filter
ON your_entities(brand_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- Full-text search (if applicable)
CREATE INDEX IF NOT EXISTS idx_your_entities_search
ON your_entities USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

#### Index Guidelines:

- ✅ Include `brand_id` as the first column (tenant isolation)
- ✅ Add `distributor_id` second if filtering by distributor
- ✅ Include sort column last (typically `created_at DESC` or `order_date DESC`)
- ✅ Add `WHERE deleted_at IS NULL` for soft-deleted tables
- ✅ Keep index count reasonable (< 5 per table to avoid write overhead)
- ❌ Don't index low-cardinality columns (e.g., boolean flags) alone
- ❌ Don't create redundant indexes (PostgreSQL uses index prefixes)

---

## 3. React Query Configuration

### Query Options Best Practices

```typescript
// ✅ GOOD - Respects global defaults, adds specific needs
const { data } = useQuery({
  queryKey: ['entity', id],
  queryFn: fetchEntity,
  // Don't override staleTime: 0 - let global config handle it
  // Don't set refetchOnWindowFocus: false unless absolutely necessary
});

// ❌ BAD - Overrides global settings unnecessarily
const { data } = useQuery({
  queryKey: ['entity', id],
  queryFn: fetchEntity,
  staleTime: 0,           // Forces refetch every time
  refetchOnWindowFocus: false,  // Disables helpful behavior
});
```

### Optimistic Updates Pattern

```typescript
// hooks/use-your-entity.ts
import { updatePaginatedCaches } from '@/lib/react-query/paginated-cache';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateYourEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateYourEntityInput) => {
      const response = await fetch('/api/your-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create entity');
      return response.json();
    },
    onMutate: async (newEntity) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['your-entities'] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['your-entities'] });
      
      // Optimistically update cache
      updatePaginatedCaches(queryClient, ['your-entities'], (old) => {
        const tempId = `temp-${Date.now()}`;
        return [{ ...newEntity, id: tempId, created_at: new Date().toISOString() }, ...old];
      });
      
      return { previousData };
    },
    onError: (err, newEntity, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error('Failed to create entity');
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['your-entities'] });
    },
  });
}
```

### Query Key Normalization

```typescript
// ✅ GOOD - Includes all identity tokens
const queryKey = ['orders', brandId, distributorId, { status, dateFrom, dateTo }];

// ❌ BAD - Missing tenant context
const queryKey = ['orders', { status }];

// ✅ EXCELLENT - Serialized filters prevent duplicate caches
const queryKey = [
  'orders', 
  brandId, 
  distributorId, 
  JSON.stringify({ status, dateFrom, dateTo })
];
```

**Key Guidelines:**
- Always include tenant identifiers (brandId, distributorId) first
- Include filter objects last
- Serialize complex filters to prevent cache misses from object reference changes
- Use consistent order across all query keys for the same entity

---

## 4. UI Performance Patterns

### Table Virtualization

**All tables with > 50 rows MUST use `@tanstack/react-virtual`:**

```typescript
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function YourEntitiesList({ entities }: { entities: YourEntity[] }) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: entities.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60, // Estimated row height in pixels
    overscan: 10, // Render 10 extra rows above/below viewport
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 
    ? totalHeight - virtualRows[virtualRows.length - 1].end 
    : 0;

  return (
    <div ref={tableContainerRef} className="h-[600px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            {/* ... other columns */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const entity = entities[virtualRow.index];
            return (
              <TableRow key={entity.id}>
                <TableCell>{entity.name}</TableCell>
                <TableCell>{entity.status}</TableCell>
                {/* ... other cells */}
              </TableRow>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: `${paddingBottom}px` }} />
            </tr>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Skeleton Loaders

Use the shared `TableSkeleton` component for all list loading states:

```typescript
import { TableSkeleton } from '@/components/ui/table-skeleton';

export function YourEntitiesPage() {
  const { entities, isLoading } = useYourEntities({ brandId });
  
  if (isLoading) {
    return <TableSkeleton rows={10} columns={5} />;
  }
  
  return <YourEntitiesList entities={entities} />;
}
```

**Rules:**
- ✅ Always use skeleton loaders for initial loads
- ❌ Never show empty state or "Loading..." text for initial loads
- ✅ Show spinner only for mutations or background refetches

### Memoization Guidelines

```typescript
// ✅ GOOD - Memoize expensive row components
const EntityRow = memo(({ entity }: { entity: YourEntity }) => {
  return (
    <TableRow>
      <TableCell>{entity.name}</TableCell>
      {/* ... other cells with complex rendering */}
    </TableRow>
  );
});

// ✅ GOOD - Memoize expensive calculations
const sortedEntities = useMemo(() => {
  return entities.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}, [entities]);

// ❌ BAD - Over-memoization
const name = useMemo(() => entity.name, [entity.name]); // Unnecessary
```

**When to memoize:**
- ✅ Row components in virtualized lists
- ✅ Expensive array operations (sort, filter, map with complex logic)
- ✅ Complex calculations that run on every render
- ❌ Simple property access
- ❌ Primitive values

---

## 5. Route Persistence & Navigation

### Automatic Route Tracking

Route persistence is handled automatically by `useRoutePersistence` in `MainLayout`. No additional setup needed for new pages.

**How it works:**
1. `useRoutePersistence` tracks every route change in authenticated pages
2. Stores last route in `localStorage` and secure cookie
3. On page refresh, `AuthProvider` restores the last route
4. Middleware reads cookie to prevent dashboard fallback

### Opt-Out for Specific Routes

If a page should NOT be persisted (e.g., one-time setup pages):

```typescript
// In your page component
import { useRoutePersistence } from '@/hooks/use-route-persistence';

export default function YourPage() {
  useRoutePersistence({ skipPersistence: true });
  
  return <YourPageContent />;
}
```

### Protected Route Checklist

For new protected pages:

- [ ] Ensure `MainLayout` wraps the page
- [ ] Use `useRequireAuth()` or `useRequireProfile()` if needed
- [ ] Add appropriate role checks (`useAuth()` for role-based access)
- [ ] Verify middleware rules in `middleware.ts` allow the route
- [ ] Test refresh behavior (should stay on page, not redirect to dashboard)

---

## 6. ExcelJS Import Readiness

### Current Import Infrastructure

- **`lib/excel/`** - Parser, validator, and mapper utilities
- **`utils/import-log.ts`** - Import tracking and logging
- **`app/api/import/orders/`** - Validation and confirmation endpoints

### Scalability Considerations for Bulk Imports

When implementing new import features (e.g., monthly distributor order uploads), follow these patterns:

#### 1. Validate Before Importing

```typescript
// app/api/import/your-entity/validate/route.ts
export async function POST(request: NextRequest) {
  const { fileData } = await request.json();
  
  // Parse Excel file
  const parsed = await parseYourEntityFile(fileData);
  
  // Validate all rows
  const validation = await validateYourEntities(parsed, {
    brandId: user.brand_id,
    distributorId: user.distributor_id,
  });
  
  // Return validation results WITHOUT importing
  return NextResponse.json({
    valid: validation.valid,
    validCount: validation.validEntities.length,
    invalidCount: validation.invalidEntities.length,
    errors: validation.errors,
    warnings: validation.warnings,
  });
}
```

#### 2. Batch Processing for Large Imports

```typescript
// app/api/import/your-entity/confirm/route.ts
import { chunk } from 'lodash';

export async function POST(request: NextRequest) {
  const { validationResult } = await request.json();
  
  // Create import log entry
  const importLogId = await createImportLog({
    userId: user.id,
    entityType: 'your_entity',
    totalRows: validationResult.validEntities.length,
  });
  
  // Process in batches to avoid memory issues
  const BATCH_SIZE = 100;
  const batches = chunk(validationResult.validEntities, BATCH_SIZE);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const batch of batches) {
    try {
      const { error } = await supabase
        .from('your_entities')
        .insert(batch);
        
      if (error) throw error;
      successCount += batch.length;
      
      // Update progress
      await updateImportProgress(importLogId, {
        processed: successCount + errorCount,
        succeeded: successCount,
        failed: errorCount,
      });
    } catch (error) {
      errorCount += batch.length;
      console.error(`Batch failed:`, error);
    }
  }
  
  // Mark import complete
  await finalizeImportLog(importLogId, {
    status: errorCount > 0 ? 'completed_with_errors' : 'completed',
    successCount,
    errorCount,
  });
  
  return NextResponse.json({ importLogId, successCount, errorCount });
}
```

#### 3. Background Processing for Very Large Files

For imports > 1000 rows, consider background job processing:

```typescript
// Option A: Next.js API route with streaming response
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Start processing in background
  processImportWithUpdates(data, writer, encoder);
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Option B: Queue-based processing (requires external service)
// - Queue import job with Redis/BullMQ
// - Worker processes batches
// - Client polls status endpoint
```

#### 4. Import Progress UI

```typescript
'use client';

import { useImportProgress } from '@/hooks/use-import-progress';

export function ImportProgressDialog({ importLogId }: { importLogId: string }) {
  const { progress, status, error } = useImportProgress(importLogId);
  
  return (
    <Dialog open={!!importLogId}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importing Entities</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Progress value={(progress.processed / progress.total) * 100} />
          <div className="text-sm text-muted-foreground">
            {progress.processed} / {progress.total} processed
            {progress.succeeded > 0 && (
              <span className="text-green-600 ml-2">
                ✓ {progress.succeeded} succeeded
              </span>
            )}
            {progress.failed > 0 && (
              <span className="text-red-600 ml-2">
                ✗ {progress.failed} failed
              </span>
            )}
          </div>
          {status === 'completed' && (
            <Button onClick={onClose}>Done</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 5. Performance Impact Mitigation

When bulk imports run:

**Cache Invalidation**
```typescript
// ✅ GOOD - Targeted invalidation
queryClient.invalidateQueries({ 
  queryKey: ['orders', brandId, distributorId] 
});

// ❌ BAD - Nuclear option
queryClient.invalidateQueries();
```

**Background Revalidation**
```typescript
// Don't refetch immediately during import
queryClient.invalidateQueries({ 
  queryKey: ['orders'],
  refetchType: 'none'
});
```

**UI Debouncing**
```typescript
// Pause queries during import
const { data } = useOrders({
  enabled: !isImporting,
});
```

#### 6. ExcelJS Memory Management

```typescript
import * as XLSX from 'xlsx';

// ✅ GOOD - Stream large files
export async function parseExcelStream(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { 
    type: 'array',
    sheetRows: 1000, // Limit rows parsed at once
  });
  
  // Process in chunks
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  const chunks: any[][] = [];
  for (let R = range.s.r + 1; R <= range.e.r; R += 100) {
    const chunk = XLSX.utils.sheet_to_json(sheet, {
      range: R,
      header: 1,
    });
    chunks.push(chunk);
  }
  
  return chunks;
}

// ❌ BAD - Load entire file into memory
const json = XLSX.utils.sheet_to_json(sheet); // Can crash on large files
```

---

## 7. Error Handling & Retry Logic

### API Client Configuration

The shared `lib/api/json-client.ts` handles:
- Exponential backoff for 5xx errors
- Retry on 429 (rate limit)
- Timeout after 30s
- Automatic error logging

```typescript
import { fetchJSON } from '@/lib/api/json-client';

// Automatically retries on failure
const data = await fetchJSON('/api/your-endpoint', {
  method: 'POST',
  body: { ... },
});
```

### React Query Error Boundaries

```typescript
// Wrap lists in error boundaries
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

export function YourEntitiesPage() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4">Failed to load entities</p>
              <Button onClick={resetErrorBoundary}>Try Again</Button>
            </div>
          )}
        >
          <YourEntitiesList />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

### User-Friendly Error Messages

```typescript
// ✅ GOOD - Specific, actionable errors
toast.error('Failed to save order. Please check all required fields.');

// ❌ BAD - Technical jargon
toast.error('POST /api/orders returned 422');
```

---

## 8. Checklist for New Features

Before marking a new section as complete, verify:

### Performance
- [ ] List views use `usePaginatedResource` with page size ≤ 50
- [ ] API routes include only necessary columns (no `select('*')`)
- [ ] Database indexes created for query patterns
- [ ] Table virtualization implemented for > 50 rows
- [ ] Skeleton loaders used instead of spinners
- [ ] Initial load time < 1.5s with 100 records
- [ ] Smooth scrolling with 500+ records

### Caching
- [ ] Query keys include all identity tokens (brandId, distributorId)
- [ ] Optimistic updates implemented for mutations
- [ ] Cache invalidation is targeted, not global
- [ ] `staleTime` not overridden without reason

### Navigation
- [ ] Route persistence works automatically (test refresh)
- [ ] No redirect to dashboard after page reload
- [ ] Protected routes use proper auth checks
- [ ] Middleware allows the route

### Error Handling
- [ ] API routes return proper HTTP status codes
- [ ] User-facing error messages via `toast`
- [ ] Error boundaries wrap list components
- [ ] Retry logic enabled for transient failures

### Import Features (if applicable)
- [ ] Validation endpoint before import
- [ ] Batch processing for > 100 rows
- [ ] Progress tracking via import log
- [ ] Memory-efficient ExcelJS parsing
- [ ] UI doesn't block during import
- [ ] Import completes successfully with 1000 rows

### Code Quality
- [ ] TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Proper loading/error states
- [ ] Responsive design on mobile
- [ ] Accessibility (ARIA labels, keyboard navigation)

---

## 9. Future Enhancements

### Short-term (Next 2 Sprints)

1. **Performance Dashboard**: Build `/dashboard/performance` to visualize:
   - API latency percentiles (P50, P95, P99)
   - Slow query log from `pg_stat_statements`
   - Client web vitals trends
   - Import job success/failure rates

2. **Import Queue**: Implement background job processing for imports > 1000 rows
   - Use Redis + BullMQ or Vercel Queues
   - Real-time progress via WebSocket/SSE
   - Email notification on completion
   - Retry failed batches

3. **Prefetching**: Add hover-based prefetching for detail pages
   ```typescript
   <TableRow
     onMouseEnter={() => queryClient.prefetchQuery({
       queryKey: ['order', order.id],
       queryFn: () => fetchOrder(order.id),
     })}
   >
   ```

4. **Infinite Scroll**: Upgrade from pagination to infinite scroll for long lists
   ```typescript
   const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
     queryKey: ['orders', brandId],
     queryFn: ({ pageParam = 0 }) => fetchOrdersPage(pageParam),
     getNextPageParam: (lastPage, pages) => lastPage.nextCursor,
   });
   ```

### Long-term (6 Months)

1. **Edge Caching**: Move API routes to Edge Runtime where possible
2. **Incremental Static Regeneration**: Pre-render public-facing pages
3. **Service Worker**: Cache API responses for offline capability
4. **Database Replicas**: Read from Supabase replicas for list queries
5. **CDN Integration**: Serve static assets via CDN
6. **GraphQL Layer**: Consider Apollo or Relay for more efficient data fetching

---

## 10. Related Documentation

### Implementation Files
- **Pagination Hook**: `hooks/use-paginated-resource.ts`
- **Cache Utilities**: `lib/react-query/paginated-cache.ts`
- **Route Persistence**: `hooks/use-route-persistence.ts`
- **Import Logging**: `utils/import-log.ts`
- **Instrumented Fetch**: `lib/supabase/instrumented-fetch.ts`
- **JSON Client**: `lib/api/json-client.ts`
- **Table Skeleton**: `components/ui/table-skeleton.tsx`

### Database Migrations
- **35**: Enable `pg_stat_statements`
- **36**: Optimize order/PO indexes

### Example Implementations
- **Orders**: `hooks/use-orders.ts`, `components/orders/orders-list.tsx`
- **Purchase Orders**: `hooks/use-purchase-orders.ts`, `components/purchase-orders/po-list.tsx`
- **Products**: `hooks/use-products.ts`, `components/products/products-list.tsx`

### Configuration Files
- **React Query Provider**: `lib/query-provider.tsx`
- **Middleware**: `middleware.ts`
- **Auth Context**: `contexts/auth-context.tsx`
- **Web Vitals**: `app/reportWebVitals.ts`

---

## Contact & Questions

For questions about implementing these patterns:
1. Refer to this playbook (authoritative source)
2. Review example implementations in existing hooks
3. Check related documentation files
4. Consult team lead for architectural decisions

---

**Remember**: Performance is a feature. Every new section must meet these standards to ensure a consistently fast, reliable user experience across the entire application.


