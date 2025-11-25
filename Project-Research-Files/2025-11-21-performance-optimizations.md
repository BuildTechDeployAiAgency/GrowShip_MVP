## 2025-11-21 — Performance & Navigation Optimizations

### Instrumentation & Telemetry
- Added `app/reportWebVitals.ts` and `/api/analytics/perf` endpoint to capture client web vitals with alert thresholds.  
- Enabled Next.js analytics attribution plus new `/api/analytics/queries` endpoint backed by `pg_stat_statements` (migration `035_enable_pg_stat_statements.sql`).  
- Wrapped Supabase browser/server clients with an instrumented fetch (`lib/supabase/instrumented-fetch.ts`) to log latency, payload size, and warn when calls exceed 500 ms.

### Data Access Refactor
- Introduced `usePaginatedResource` hook and API routes for orders, purchase orders, and products (`/api/orders/list`, `/api/purchase-orders/list`, `/api/products/list`).  
- Added explicit column projections, pagination ranges, and Supabase indexes (`036_optimize_order_po_indexes.sql`).  
- Hooks now return page controls plus total counts, allowing list components to paginate cheaply even at hundreds of rows.

### React Query Enhancements
- Centralized fetch retry logic via `lib/api/json-client.ts` (exponential backoff for 5xx/429).  
- Added optimistic cache helpers so create/update/delete mutations update React Query caches immediately before invalidation.  
- Query keys now include brand/distributor identity tokens to prevent cache collisions across tenants.

### Virtualized Tables & Skeleton States
- Added `@tanstack/react-virtual` across Orders, Purchase Orders, and Products tables.  
- Implemented shared `TableSkeleton` for consistent loading states.  
- Each table renders only the visible rows (sticky headers + scroll container) keeping DOM weight O(visible rows) and maintaining smooth scroll at 100s of records—critical ahead of monthly ExcelJS imports.

### Route Persistence & Middleware
- Created `useRoutePersistence` hook plus storage helpers to track last permitted route per user (localStorage + `growship_lp_<userId>` cookie).  
- `MainLayout` tracks every authenticated page, while `AuthProvider` restores the last route after login/refresh; middleware now reads the cookie to redirect away from `/` or `/dashboard` when a saved path exists.  
- Sign-out clears cached route state to avoid leaking previous destinations.

### Next Steps / ExcelJS Alignment
- With pagination + virtualization in place, the UI can sustain large importer batches without repaint storms.  
- Remaining tasks: background queueing & progress UX for ExcelJS uploads, plus extending the performance dashboard to surface API latency percentiles during import windows.

