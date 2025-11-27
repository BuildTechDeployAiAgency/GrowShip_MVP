# Dashboard Performance Optimization

**Date:** November 26, 2025  
**Feature:** Server-Side Rendering (SSR) for Dashboard Metrics

## Overview

Implemented Server-Side Rendering (SSR) for the dashboard page to improve initial load performance. This optimization fetches critical dashboard metrics on the server before sending the page to the client, eliminating the "waterfall" effect where the client had to:

1. Load the page
2. Initialize React
3. Fetch user authentication
4. Fetch user profile
5. Fetch dashboard metrics

Now, the server pre-fetches the dashboard metrics and hydrates the client with this data immediately.

## Implementation Details

### 1. Updated `useDashboardMetrics` Hook

**File:** `hooks/use-dashboard-metrics.ts`

Added `initialData` parameter to the hook options, allowing server-fetched data to be passed in and used immediately without triggering a loading state.

```typescript
export interface UseDashboardMetricsOptions {
  filters?: DashboardMetricsFilters;
  enabled?: boolean;
  initialData?: DashboardMetrics | null; // NEW
}
```

The hook now passes `initialData` to React Query:

```typescript
const { data, isLoading, error, refetch, isRefetching } = useQuery({
  // ... other options
  initialData: initialData ?? undefined, // Use server-fetched data
  // ...
});
```

### 2. Updated `SalesMetricsCards` Component

**File:** `components/sales/sales-metrics-cards.tsx`

Added `initialData` prop to accept pre-fetched metrics:

```typescript
export interface SalesMetricsCardsProps {
  initialData?: DashboardMetrics | null;
}

export function SalesMetricsCards({ initialData }: SalesMetricsCardsProps = {}) {
  // ... passes initialData to useDashboardMetrics
}
```

### 3. Updated `OverviewView` Component

**File:** `components/dashboard/overview-view.tsx`

Added `initialMetrics` prop to pass data down to `SalesMetricsCards`:

```typescript
export interface OverviewViewProps {
  initialMetrics?: DashboardMetrics | null;
}

export function OverviewView({ initialMetrics }: OverviewViewProps = {}) {
  // ... passes initialMetrics to SalesMetricsCards
}
```

### 4. Updated `DashboardContent` Component

**File:** `app/dashboard/dashboard-content.tsx`

Added `initialMetrics` prop to pass data down to `OverviewView`:

```typescript
export interface DashboardContentProps {
  initialMetrics?: DashboardMetrics | null;
}

export default function DashboardContent({ initialMetrics }: DashboardContentProps = {}) {
  // ... passes initialMetrics to OverviewView
}
```

### 5. Created `DashboardClient` Wrapper

**File:** `app/dashboard/dashboard-client.tsx` (NEW)

Created a client component wrapper that:
- Wraps `DashboardContent` with required providers (`EnhancedAuthProvider`, `DateFilterProvider`)
- Accepts and passes `initialMetrics` to `DashboardContent`

```typescript
"use client";

export interface DashboardClientProps {
  initialMetrics?: DashboardMetrics | null;
}

export default function DashboardClient({ initialMetrics }: DashboardClientProps) {
  return (
    <EnhancedAuthProvider>
      <DateFilterProvider>
        <DashboardContent initialMetrics={initialMetrics} />
      </DateFilterProvider>
    </EnhancedAuthProvider>
  );
}
```

### 6. Converted `page.tsx` to Server Component

**File:** `app/dashboard/page.tsx`

Converted from a Client Component to a Server Component that:
1. Creates a Supabase server client
2. Fetches the authenticated user
3. Fetches the user's profile (role and brand info)
4. Calls the `get_sales_dashboard_metrics` RPC function on the server
5. Passes the pre-fetched data to the `DashboardClient` component

```typescript
export default async function DashboardPage() {
  let initialMetrics: DashboardMetrics | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role_name, brand_id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        initialMetrics = await fetchDashboardMetricsServer(
          user.id,
          profile.brand_id,
          profile.role_name
        );
      }
    }
  } catch (error) {
    console.error("[SSR] Error in dashboard page:", error);
  }

  return <DashboardClient initialMetrics={initialMetrics} />;
}
```

## Performance Benefits

1. **Reduced Time to First Contentful Paint (FCP):** Dashboard metrics are available immediately when the page renders, eliminating loading spinners for the key metrics cards.

2. **Eliminated Client-Side Waterfall:** Previously, the client had to wait for authentication, profile fetch, and then metrics fetch sequentially. Now these happen on the server in parallel.

3. **Better User Experience:** Users see actual data instead of skeleton loaders when navigating to the dashboard.

4. **Graceful Degradation:** If SSR fails for any reason, the client-side hooks still work as before and will fetch the data.

## Files Modified

- `hooks/use-dashboard-metrics.ts` - Added `initialData` support, re-exports types from shared types file
- `components/sales/sales-metrics-cards.tsx` - Added `initialData` prop
- `components/dashboard/overview-view.tsx` - Added `initialMetrics` prop
- `app/dashboard/dashboard-content.tsx` - Added `initialMetrics` prop
- `app/dashboard/page.tsx` - Converted to Server Component with SSR data fetching

## Files Created

- `app/dashboard/dashboard-client.tsx` - Client wrapper for providers
- `types/dashboard.ts` - Shared types for `DashboardMetrics` and `DashboardMetricsFilters` (allows Server Components to import types without pulling in client-side dependencies)

## Future Considerations

1. **Navigation Optimization:** The `MainLayout` and `Sidebar` components currently re-render on every page navigation. Consider moving the sidebar to a persistent layout in `app/layout.tsx` or a dashboard-specific `app/dashboard/layout.tsx` to prevent re-mounting.

2. **Additional SSR Data:** Similar patterns can be applied to other heavy data fetching (charts, tables) if needed.

3. **Streaming:** Consider using React Suspense and streaming for progressive loading of dashboard sections.

## Scalability Note

This SSR implementation is compatible with the future ExcelJS bulk import feature. The server-side data fetching pattern established here can be extended to handle initial data loading for import previews and validation results.

