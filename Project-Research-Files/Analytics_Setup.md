# Analytics System Setup & Architecture

**Last Updated:** January 2025  
**Status:** ✅ Fully Operational  
**System:** Comprehensive Sales Analytics Dashboard

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Flow](#data-flow)
4. [Database Functions (RPCs)](#database-functions-rpcs)
5. [Frontend Hooks](#frontend-hooks)
6. [Components](#components)
7. [Date Filtering System](#date-filtering-system)
8. [Key Features](#key-features)
9. [User Roles & Data Access](#user-roles--data-access)
10. [Performance Optimizations](#performance-optimizations)

---

## Overview

The Analytics System is a comprehensive sales performance analysis platform that provides real-time insights into revenue, profit margins, target achievement, and sales trends. The system is built on a multi-layered architecture using Supabase PostgreSQL RPC functions, React Query for state management, and Recharts for data visualization.

### Core Capabilities

- **Real-time Dashboard Metrics**: Total revenue, profit margin, target achievement, pending orders
- **Revenue Comparison**: Year-over-year monthly revenue comparisons
- **Seasonal Analysis**: Quarterly revenue trends with growth percentages
- **Sales by Category**: Product category performance breakdown
- **Sales by Territory**: Geographic sales distribution
- **Top SKUs**: Best-performing products by revenue
- **Target vs Actual**: SKU-level target tracking and variance analysis

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Components │  │     Hooks   │  │   Contexts   │      │
│  │  (Charts)    │→ │ (React Query)│→ │ (Date Filter)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Supabase Client
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         RPC Functions (Stored Procedures)            │  │
│  │  • get_sales_dashboard_metrics                        │  │
│  │  • get_monthly_yoy_revenue                           │  │
│  │  • get_seasonal_analysis                             │  │
│  │  • get_sales_by_category                             │  │
│  │  • get_sales_by_territory                             │  │
│  │  • get_top_products_by_revenue1                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Data Tables                              │  │
│  │  • sales_documents (user-specific)                  │  │
│  │  • sales_documents_view_{brand_id} (brand-wide)     │  │
│  │  • orders, order_items                               │  │
│  │  • sales_targets                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework**: Next.js 14+ (App Router)
- **State Management**: React Query (@tanstack/react-query)
- **Charts**: Recharts
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with Enhanced Auth Context
- **Data Fetching**: Supabase RPC (Remote Procedure Calls)

---

## Data Flow

### 1. User Interaction Flow

```
User selects date filter
    ↓
DateFilterContext updates filters
    ↓
All hooks detect filter change via React Query queryKey
    ↓
React Query triggers refetch
    ↓
Hook calls Supabase RPC function
    ↓
Database executes function with filters
    ↓
Results returned to hook
    ↓
Component receives updated data
    ↓
Charts/components re-render with new data
```

### 2. Data Access Pattern

**Brand Admins:**

- Use organization-wide table: `sales_documents_view_{brand_id}`
- See aggregated data for entire brand
- Access all distributors' data within brand

**Other Users (Distributors, etc.):**

- Use personal table: `sales_documents_{user_id}`
- See only their own sales data
- Brand-scoped access via RLS policies

### 3. Filter Propagation

All analytics hooks subscribe to the `DateFilterContext`:

- When filters change, React Query automatically refetches data
- Query keys include filter values for proper cache invalidation
- Components receive updated data reactively

---

## Database Functions (RPCs)

### 1. `get_sales_dashboard_metrics`

**Purpose**: Returns key performance metrics for the dashboard cards

**Parameters**:

- `p_table_suffix` (text): Table name suffix (`sales_documents_view_{brand_id}` or `sales_documents_{user_id}`)
- `p_user_id` (uuid): User ID (nullable)
- `p_year` (int): Year to analyze
- `p_month` (int): Month to analyze (1-12)
- `p_user_role` (text): User's role name
- `p_brand_id` (uuid): Brand ID (nullable)

**Returns**:

```typescript
{
  total_revenue: number;
  total_revenue_display: string; // Formatted: "$123,456"
  revenue_growth_percentage: number;
  revenue_growth_display: string; // Formatted: "+15.5%"

  profit_margin: number;
  profit_margin_display: string; // Formatted: "23.5%"
  profit_margin_growth_percentage: number;
  profit_margin_growth_display: string;

  target_achievement: number;
  target_achievement_display: string;
  target_period: string;

  pending_orders_count: number;
  pending_orders_count_display: string;
  pending_orders_value: number;
  pending_orders_value_display: string;
}
```

**Usage**: Called by `useDashboardMetrics` hook

---

### 2. `get_monthly_yoy_revenue`

**Purpose**: Returns monthly revenue comparison between current year and previous year

**Parameters**:

- `p_table_suffix` (text)
- `p_user_id` (uuid)
- `p_year` (int): Current year
- `p_user_role` (text)
- `p_brand_id` (uuid)

**Returns**: Array of monthly data points

```typescript
[
  {
    month: number; // 1-12
    current_year_revenue: number;
    previous_year_revenue: number;
    growth_percentage: number;
  }
]
```

**Usage**: Called by `useRevenueComparison` hook

---

### 3. `get_seasonal_analysis`

**Purpose**: Returns quarterly revenue analysis with seasonal trends

**Parameters**:

- `p_table_suffix` (text)
- `p_user_id` (uuid)
- `p_year` (int)
- `p_user_role` (text)
- `p_brand_id` (uuid)

**Returns**: Array of quarterly data points

```typescript
[
  {
    quarter: string; // "Q1", "Q2", etc.
    quarter_num: number; // 1-4
    revenue: number;
    revenue_display: string;
    previous_year_revenue: number;
    growth_percentage: number;
    growth_display: string;
    season: string; // "Spring", "Summer", etc.
  }
]
```

**Usage**: Called by `useSeasonalAnalysis` hook

---

### 4. `get_sales_by_category`

**Purpose**: Returns sales breakdown by product category

**Parameters**:

- `p_table_suffix` (text)
- `p_user_id` (uuid)
- `p_year` (int)
- `p_month` (int, nullable): Optional month filter
- `p_user_role` (text)
- `p_brand_id` (uuid)

**Returns**: Array of category data points

```typescript
[
  {
    category: string;
    revenue: number;
    percentage: number; // Percentage of total
    revenue_display: string;
  }
]
```

**Usage**: Called by `useSalesByCategory` hook

---

### 5. `get_sales_by_territory`

**Purpose**: Returns sales breakdown by geographic territory

**Parameters**:

- `p_table_suffix` (text)
- `p_user_id` (uuid)
- `p_year` (int)
- `p_month` (int, nullable)
- `p_user_role` (text)
- `p_brand_id` (uuid)

**Returns**: Array of territory data points

```typescript
[
  {
    territory: string;
    revenue: number;
    previous_revenue: number;
    growth_percentage: number;
    revenue_growth_percentage: number;
    revenue_display: string;
    country_count: number;
    countries: string; // Comma-separated list
  }
]
```

**Usage**: Called by `useSalesByTerritory` hook

---

### 6. `get_top_products_by_revenue1`

**Purpose**: Returns top-performing SKUs by revenue

**Parameters**:

- `p_table_suffix` (text)
- `p_user_id` (uuid)
- `p_year` (int)
- `p_limit` (int): Number of top products to return (default: 10)
- `p_user_role` (text)
- `p_brand_id` (uuid)

**Returns**: Array of top SKU data points

```typescript
[
  {
    rank_position: number;
    product_name: string;
    country: string;
    year: number;
    month: number | null;
    week: number | null;
    revenue: number;
    previous_period_revenue: number | null;
    growth_percentage: number | null;
    current_soh: number; // Stock on hand
    type: string;
  }
]
```

**Usage**: Called by `useTopSkus` hook

---

## Frontend Hooks

All hooks follow a consistent pattern using React Query for caching and state management.

### Hook Pattern

```typescript
export function use[Feature]({
  filters = {},
  enabled = true,
}: Use[Feature]Options = {}): Use[Feature]Return {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      "[feature-name]",
      filters,
      profile?.role_name,
      profile?.brand_id,
    ],
    queryFn: () =>
      fetch[Feature](
        filters,
        profile?.role_name,
        profile?.brand_id
      ),
    enabled: enabled && !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  return {
    data: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}
```

### Available Hooks

#### 1. `useDashboardMetrics`

**File**: `hooks/use-dashboard-metrics.ts`

**Purpose**: Fetches key performance metrics for dashboard cards

**Usage**:

```typescript
const { data, isLoading, error } = useDashboardMetrics({
  filters: {
    tableSuffix: "sales_documents_view_brand123",
    userId: user.id,
    brandId: profile.brand_id,
    userRole: profile.role_name,
    year: 2025,
    month: 1,
  },
});
```

**Returns**: `DashboardMetrics` object with formatted display strings

---

#### 2. `useRevenueComparison`

**File**: `hooks/use-revenue-comparison.ts`

**Purpose**: Fetches year-over-year monthly revenue comparison

**Usage**:

```typescript
const { data, isLoading } = useRevenueComparison({
  filters: {
    tableSuffix: "...",
    userId: user.id,
    year: 2025,
  },
});
```

**Returns**: Array of `RevenueMonthPoint` objects

---

#### 3. `useSeasonalAnalysis`

**File**: `hooks/use-seasonal-analysis.ts`

**Purpose**: Fetches quarterly seasonal analysis

**Usage**:

```typescript
const { data, isLoading } = useSeasonalAnalysis({
  filters: {
    tableSuffix: "...",
    userId: user.id,
    year: 2025,
  },
});
```

**Returns**: Array of `SeasonalPoint` objects

---

#### 4. `useSalesByCategory`

**File**: `hooks/use-sales-by-category.ts`

**Purpose**: Fetches sales breakdown by product category

**Usage**:

```typescript
const { data, isLoading } = useSalesByCategory({
  filters: {
    tableSuffix: "...",
    userId: user.id,
    year: 2025,
    month: 1, // Optional
  },
});
```

**Returns**: Array of `CategoryPoint` objects

---

#### 5. `useSalesByTerritory`

**File**: `hooks/use-sales-by-territory.ts`

**Purpose**: Fetches sales breakdown by geographic territory

**Usage**:

```typescript
const { data, isLoading } = useSalesByTerritory({
  filters: {
    tableSuffix: "...",
    userId: user.id,
    year: 2025,
    month: 1, // Optional
  },
});
```

**Returns**: Array of `TerritoryPoint` objects

---

#### 6. `useTopSkus`

**File**: `hooks/use-top-skus.ts`

**Purpose**: Fetches top-performing SKUs by revenue

**Usage**:

```typescript
const { skus, isLoading } = useTopSkus({
  filters: {
    tableSuffix: "...",
    userId: user.id,
    year: 2025,
    limit: 10,
  },
});
```

**Returns**: Array of `TopSkuProduct` objects

---

#### 7. `useTargetVsActual`

**File**: `hooks/use-target-vs-actual.ts`

**Purpose**: Fetches target vs actual performance data

**Usage**:

```typescript
const { data, summary, isLoading } = useTargetVsActual({
  sku: "SKU-123",
  periodType: "monthly",
  startDate: "2025-01-01",
  endDate: "2025-12-31",
});
```

**Returns**:

- `data`: Array of `TargetVsActual` objects
- `summary`: Summary statistics

**Note**: This hook uses a REST API endpoint (`/api/analytics/target-vs-actual`) instead of RPC

---

## Components

### Main Analytics Page

**File**: `app/sales/analytics/page.tsx`

**Structure**:

```typescript
<DateFilterProvider>
  <AnalyticsContent />
</DateFilterProvider>
```

**Features**:

- Lazy-loaded chart components for performance
- Global date filter that affects all charts
- Responsive grid layout
- Loading skeletons

---

### Core Components

#### 1. `SalesMetricsCards`

**File**: `components/sales/sales-metrics-cards.tsx`

**Purpose**: Displays 4 key metric cards

- Total Revenue
- Profit Margin
- Target Achievement
- Pending Orders

**Features**:

- Color-coded cards with icons
- Growth indicators (trending up/down)
- Comparison text (vs last month)
- Loading states

**Data Source**: `useDashboardMetrics` hook

---

#### 2. `RevenueComparisonChart`

**File**: `components/sales/revenue-comparison-chart.tsx`

**Purpose**: Line chart comparing current year vs previous year revenue by month

**Chart Type**: Line chart (Recharts)

**Data Source**: `useRevenueComparison` hook

---

#### 3. `SeasonalAnalysisChart`

**File**: `components/sales/seasonal-analysis-chart.tsx`

**Purpose**: Bar chart showing quarterly revenue with growth percentages

**Chart Type**: Bar chart (Recharts)

**Data Source**: `useSeasonalAnalysis` hook

---

#### 4. `SalesByCategoryChart`

**File**: `components/sales/sales-by-category-chart.tsx`

**Purpose**: Pie/bar chart showing sales distribution by product category

**Chart Type**: Pie or Bar chart (Recharts)

**Data Source**: `useSalesByCategory` hook

---

#### 5. `RegionsAndCustomersTabs`

**File**: `components/sales/regions-and-customers-tabs.tsx`

**Purpose**: Tabbed interface showing:

- Sales by Territory (map/chart)
- Top Customers/Distributors

**Data Sources**:

- `useSalesByTerritory` hook
- Additional customer/distributor queries

---

#### 6. `TopSkusTable`

**File**: `components/sales/top-skus-table.tsx`

**Purpose**: Table displaying top-performing SKUs with:

- Rank
- Product name
- Country
- Revenue
- Growth percentage
- Stock on hand

**Data Source**: `useTopSkus` hook

---

#### 7. `GlobalDateFilter`

**File**: `components/sales/global-date-filter.tsx`

**Purpose**: Centralized date filter component that updates all charts

**Features**:

- Year selector (last 6 years)
- Month selector (optional)
- Apply/Clear buttons
- Updates `DateFilterContext`

---

## Date Filtering System

### Context Provider

**File**: `contexts/date-filter-context.tsx`

**Purpose**: Provides global date filter state to all analytics components

**Implementation**:

```typescript
interface DateFilters {
  year: number;
  month?: number;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(
  undefined
);

export function DateFilterProvider({ children }: DateFilterProviderProps) {
  const [filters, setFilters] = useState<DateFilters>({
    year: new Date().getFullYear(),
  });

  return (
    <DateFilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </DateFilterContext.Provider>
  );
}
```

### Usage Pattern

1. **Provider wraps analytics page**:

```typescript
<DateFilterProvider>
  <AnalyticsContent />
</DateFilterProvider>
```

2. **Components access filters**:

```typescript
const { filters } = useDateFilters();
// filters.year, filters.month
```

3. **Hooks include filters in query key**:

```typescript
queryKey: [
  "dashboard-metrics",
  filters, // ← Included for cache invalidation
  profile?.role_name,
  profile?.brand_id,
];
```

4. **When filters change**: React Query automatically refetches all queries with updated filters

---

## Key Features

### 1. Real-time Data Updates

- React Query manages caching (5-minute stale time)
- Automatic refetching when filters change
- Optimistic updates for better UX

### 2. Role-based Data Access

**Brand Admins**:

- See organization-wide aggregated data
- Access all distributors' sales within brand
- Use `sales_documents_view_{brand_id}` table

**Other Users**:

- See only their own sales data
- Use `sales_documents_{user_id}` table
- Brand-scoped via RLS policies

### 3. Performance Optimizations

- **Lazy Loading**: Chart components loaded on demand
- **Caching**: 5-minute cache prevents excessive API calls
- **Query Deduplication**: React Query deduplicates simultaneous requests
- **Database Indexes**: Optimized queries with proper indexes
- **Materialized Views**: Used for complex aggregations

### 4. Error Handling

- All hooks return error states
- Components display error messages
- Graceful fallbacks for missing data
- Loading states for better UX

### 5. Responsive Design

- Mobile-first approach
- Responsive grid layouts
- Adaptive chart sizing
- Touch-friendly controls

---

## User Roles & Data Access

### Super Admin

- Can access all brands' data
- Override brand filters in RPC functions
- Full system visibility

### Brand Admin

- Organization-wide view
- All distributors within brand
- Uses `sales_documents_view_{brand_id}` table

### Distributor/Other Roles

- Personal data only
- Uses `sales_documents_{user_id}` table
- Brand-scoped access

### Data Isolation

- **RLS Policies**: Row-level security ensures data isolation
- **Table Suffix**: Dynamic table selection based on role
- **Brand ID Filtering**: All queries filtered by brand_id

---

## Performance Optimizations

### 1. React Query Caching

```typescript
staleTime: 5 * 60 * 1000, // 5 minutes
refetchOnWindowFocus: false,
```

- Prevents unnecessary refetches
- Reduces database load
- Improves user experience

### 2. Lazy Loading

```typescript
const SalesMetricsCards = dynamic(
  () => import("@/components/sales/sales-metrics-cards"),
  { loading: () => <ChartSkeleton />, ssr: false }
);
```

- Reduces initial bundle size
- Faster page load
- Better code splitting

### 3. Database Optimizations

- **Indexes**: On brand_id, user_id, date columns
- **Materialized Views**: For complex aggregations
- **RPC Functions**: Pre-compiled queries
- **Efficient JSONB Queries**: For order items extraction

### 4. Query Key Strategy

```typescript
queryKey: ["feature-name", filters, profile?.role_name, profile?.brand_id];
```

- Proper cache invalidation
- Prevents stale data
- Efficient cache management

---

## File Structure

```
app/
  sales/
    analytics/
      page.tsx              # Main analytics page
  api/
    analytics/
      target-vs-actual/
        route.ts            # Target vs actual API

components/
  sales/
    sales-metrics-cards.tsx
    revenue-comparison-chart.tsx
    seasonal-analysis-chart.tsx
    sales-by-category-chart.tsx
    sales-by-territory-chart.tsx
    regions-and-customers-tabs.tsx
    top-skus-table.tsx
    global-date-filter.tsx

hooks/
  use-dashboard-metrics.ts
  use-revenue-comparison.ts
  use-seasonal-analysis.ts
  use-sales-by-category.ts
  use-sales-by-territory.ts
  use-top-skus.ts
  use-target-vs-actual.ts

contexts/
  date-filter-context.tsx   # Global date filter state

supabase_migrations/
  [Various migrations for RPC functions]
```

---

## Usage Examples

### Adding a New Analytics Chart

1. **Create hook** (`hooks/use-new-feature.ts`):

```typescript
export function useNewFeature({ filters = {} }) {
  const { user, profile } = useEnhancedAuth();
  const { filters: dateFilters } = useDateFilters();

  return useQuery({
    queryKey: ["new-feature", filters, dateFilters, profile?.brand_id],
    queryFn: () => fetchNewFeature(filters, dateFilters, profile),
    staleTime: 5 * 60 * 1000,
  });
}
```

2. **Create component** (`components/sales/new-feature-chart.tsx`):

```typescript
export function NewFeatureChart() {
  const { filters } = useDateFilters();
  const { data, isLoading } = useNewFeature({ filters });

  // Render chart
}
```

3. **Add to analytics page**:

```typescript
<NewFeatureChart />
```

---

## Troubleshooting

### Common Issues

1. **No data showing**

   - Check RPC function exists in database
   - Verify table suffix is correct
   - Check user role and brand_id
   - Verify RLS policies allow access

2. **Filters not updating charts**

   - Ensure component is wrapped in `DateFilterProvider`
   - Check hook includes filters in queryKey
   - Verify `useDateFilters()` is called correctly

3. **Performance issues**

   - Check database indexes exist
   - Verify RPC functions are optimized
   - Consider increasing cache time
   - Check for N+1 query problems

4. **Wrong data displayed**
   - Verify table suffix logic (brand_admin vs others)
   - Check brand_id filtering
   - Review RLS policies

---

## Future Enhancements

### Planned Features

1. **Real-time Updates**: WebSocket subscriptions for live data
2. **Export Functionality**: PDF/Excel export of charts
3. **Custom Date Ranges**: Beyond year/month selection
4. **Saved Filters**: User preferences for default filters
5. **Drill-down Capabilities**: Click charts to see details
6. **Comparative Analysis**: Compare multiple periods
7. **Forecasting Integration**: Show predicted vs actual trends

---

## Conclusion

The Analytics System provides a comprehensive, performant, and scalable solution for sales performance analysis. The architecture leverages Supabase RPC functions for efficient data processing, React Query for state management, and a component-based approach for maintainability.

The system is designed to handle multiple user roles, provide real-time insights, and scale with growing data volumes. All components follow consistent patterns, making it easy to extend and maintain.

---

**Documentation Version**: 1.0  
**Last Reviewed**: January 2025
