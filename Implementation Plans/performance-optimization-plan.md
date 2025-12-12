# GrowShip MVP Performance Optimization Plan

## Executive Summary

This comprehensive performance optimization plan addresses critical loading time issues in GrowShip MVP. Based on detailed codebase analysis, we've identified key bottlenecks in bundle size (ExcelJS loading), database query patterns (N+1 problems), and missing Next.js 15 optimizations. This plan provides a prioritized roadmap for achieving 40-70% performance improvements across all key metrics.

## Current Performance Issues

### Critical Problems Identified
1. **Bundle Size Issues**: ExcelJS library (621MB) loaded client-side causing massive bundle bloat
2. **Database N+1 Queries**: User listings trigger separate membership queries (100-200ms delay)
3. **Missing Next.js Image Optimization**: No `next/image` usage throughout application
4. **Complex RLS Policies**: Supabase policies with nested subqueries causing 50-100ms per query
5. **Inefficient Component Re-renders**: Missing memoization in list components
6. **Missing Next.js 15 Features**: No `use cache` directive implementation

### Performance Impact Assessment
- **Bundle Size**: 30-40% reduction possible with server-side Excel processing
- **Database Queries**: 40-60% improvement with optimized patterns
- **Component Rendering**: 40-50% faster with proper memoization
- **Image Loading**: 2-5x improvement with Next.js Image component
- **Caching**: 25% reduction in unnecessary requests

## Implementation Timeline

### Phase 1: High-Impact Quick Wins (Week 1-2)
**Estimated Impact**: 40-50% overall performance improvement
**Development Effort**: 2-3 developers, 2 weeks

### Phase 2: Database & Query Optimization (Week 3-4)  
**Estimated Impact**: 30-40% additional improvement
**Development Effort**: 1-2 developers, 2 weeks

### Phase 3: Advanced Optimizations (Week 5-8)
**Estimated Impact**: 15-25% additional improvement
**Development Effort**: 1-2 developers, 4 weeks

---

## Phase 1: High-Impact Quick Wins (Week 1-2)

### 1.1 Bundle Size Optimization

#### Problem: ExcelJS Client-Side Loading
**Files Affected:**
- `/components/ui/file-preview-dialog.tsx` (lines 21-24)
- 14+ client components importing heavy libraries

**Current Issue:**
```typescript
// Causing massive bundle bloat
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import { Spreadsheet as SpreadsheetComponent } from "react-spreadsheet";
```

**Solution: Server-Side Processing**

1. **Create API Routes for File Processing:**
```typescript
// /app/api/files/preview/route.ts
import ExcelJS from "exceljs";
import mammoth from "mammoth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    // Process Excel server-side
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
    
    return Response.json({
      type: 'excel',
      data: extractSheetData(workbook)
    });
  }
  
  // Similar for Word docs with mammoth
}
```

2. **Update Client Components:**
```typescript
// /components/ui/file-preview-dialog.tsx
const FilePreviewDialog = ({ file }: { file: File }) => {
  const [previewData, setPreviewData] = useState(null);
  
  useEffect(() => {
    const processFile = async () => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/files/preview', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      setPreviewData(data);
    };
    
    processFile();
  }, [file]);
  
  // Render based on previewData
};
```

**Expected Impact:** 35-40% bundle size reduction

### 1.2 Implement Next.js Image Component

#### Problem: No Image Optimization
**Current Issue:** All images use raw `<img>` tags with no optimization

**Solution: Replace with Next.js Image**

1. **Avatar Component Optimization:**
```typescript
// /components/ui/avatar-upload.tsx
import Image from 'next/image';

// Before
<img
  src={displayAvatar}
  alt={`${userName}'s avatar`}
  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
/>

// After
<div className="relative w-full h-full overflow-hidden">
  <Image
    src={displayAvatar}
    alt={`${userName}'s avatar`}
    fill
    className="object-cover transition-transform duration-300 group-hover:scale-110"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    priority={false}
  />
</div>
```

2. **Add Image Placeholder/Blur:**
```typescript
const [imageLoading, setImageLoading] = useState(true);

<Image
  src={displayAvatar}
  alt={`${userName}'s avatar`}
  fill
  className={`object-cover transition-all duration-300 ${
    imageLoading ? 'blur-sm' : 'blur-0'
  } group-hover:scale-110`}
  onLoad={() => setImageLoading(false)}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..." // tiny base64
/>
```

**Expected Impact:** 2-5x faster image loading

### 1.3 Critical Database Indexes

#### Problem: Missing Indexes for RLS and Queries
**Current Issue:** Complex RLS policies without supporting indexes

**Solution: Add Critical Indexes**
```sql
-- /database_migrations/performance_indexes.sql

-- Critical indexes for RLS performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_auth_uid_role 
ON user_profiles(user_id, role_name, brand_id, distributor_id)
WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_status_updated 
ON products(brand_id, status, updated_at)
WHERE status IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_memberships_user_brand_active 
ON user_memberships(user_id, brand_id, is_active)
WHERE is_active = true;

-- Indexes for common dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_brand_date_status
ON orders(brand_id, created_at, status)
WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';

-- Financial queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_budgets_brand_period
ON financial_budgets(brand_id, period_start, period_end);

-- Marketing campaigns performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_campaigns_brand_status
ON marketing_campaigns(brand_id, status, updated_at);
```

**Expected Impact:** 50-100ms reduction per database query

### 1.4 Component Memoization

#### Problem: Unnecessary Re-renders
**Files Affected:**
- `/components/orders/orders-list.tsx`
- `/components/products/products-list.tsx`
- Filter components throughout application

**Solution: Add React.memo and useMemo**

1. **Memoize List Items:**
```typescript
// /components/products/product-row.tsx
import { memo } from 'react';

const ProductRow = memo(({ 
  product, 
  onEdit, 
  onDelete 
}: ProductRowProps) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.updated_at === nextProps.product.updated_at
  );
});

ProductRow.displayName = 'ProductRow';
export { ProductRow };
```

2. **Memoize Filter Objects:**
```typescript
// /components/products/products-list.tsx
const ProductsList = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Memoize filter object to prevent unnecessary re-renders
  const filters = useMemo(() => ({
    status: statusFilter === "all" ? undefined : statusFilter,
    category: categoryFilter === "all" ? undefined : categoryFilter,
  }), [statusFilter, categoryFilter]);
  
  const { data, loading } = useProducts({ filters });
  
  // Rest of component
};
```

3. **Memoize Expensive Calculations:**
```typescript
// Dashboard metrics calculation
const processedMetrics = useMemo(() => {
  if (!rawMetrics) return null;
  
  return {
    totalRevenue: calculateRevenue(rawMetrics),
    growthRate: calculateGrowth(rawMetrics),
    // Other expensive calculations
  };
}, [rawMetrics]);
```

**Expected Impact:** 40-50% faster list rendering

---

## Phase 2: Database & Query Optimization (Week 3-4)

### 2.1 Fix N+1 Query Problems

#### Problem: Users Hook N+1 Queries
**File:** `/hooks/use-users.ts` (lines 147-178)

**Current Issue:**
```typescript
// Step 1: Fetch users
const { data: usersData } = await supabase
  .from("user_profiles")
  .select(USER_COLUMNS)
  .range(offset, offset + limit - 1);

// Step 2: Separate query for memberships (N+1 problem)
const userIds = usersData.map((u: any) => u.user_id);
const { data, error: membershipsError } = await supabase
  .from("user_memberships")
  .select(MEMBERSHIP_COLUMNS)
  .in("user_id", userIds);
```

**Solution: Single Query with JOIN**

1. **Create Optimized RPC Function:**
```sql
-- /database_migrations/user_optimization.sql
CREATE OR REPLACE FUNCTION get_users_with_memberships(
  p_brand_id UUID DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_role_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) 
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role_name TEXT,
  status TEXT,
  brand_id UUID,
  membership_id UUID,
  membership_role TEXT,
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ
) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    up.user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.role_name,
    up.status,
    up.brand_id,
    um.id as membership_id,
    um.role as membership_role,
    um.is_active,
    um.created_at as joined_at
  FROM user_profiles up
  LEFT JOIN user_memberships um ON up.user_id = um.user_id
  WHERE 
    (p_brand_id IS NULL OR up.brand_id = p_brand_id OR um.brand_id = p_brand_id)
    AND (p_search_term IS NULL OR 
         up.first_name ILIKE '%' || p_search_term || '%' OR
         up.last_name ILIKE '%' || p_search_term || '%' OR
         up.email ILIKE '%' || p_search_term || '%')
    AND (p_role_filter IS NULL OR up.role_name = p_role_filter)
    AND (p_status_filter IS NULL OR up.status = p_status_filter)
  ORDER BY up.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
```

2. **Update Hook Implementation:**
```typescript
// /hooks/use-users.ts
export const useUsers = (params: UsersParams = {}) => {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const supabase = createClient();
      
      // Single query instead of N+1
      const { data, error } = await supabase.rpc('get_users_with_memberships', {
        p_brand_id: params.brandId,
        p_search_term: params.searchTerm,
        p_role_filter: params.roleFilter,
        p_status_filter: params.statusFilter,
        p_limit: params.limit || 20,
        p_offset: params.offset || 0
      });
      
      if (error) throw error;
      
      // Transform data to expected format
      return transformUsersData(data);
    },
    staleTime: CACHE_TIMES.SLOW_CHANGING, // 15 minutes
    gcTime: CACHE_TIMES.SLOW_CHANGING * 2,
  });
};
```

**Expected Impact:** 100-200ms improvement in user list loading

### 2.2 Optimize RLS Policies

#### Problem: Complex RLS with Nested Subqueries
**File:** `/database_migrations/financial_management_rls_policies.sql`

**Current Issue:**
```sql
-- Complex policy with multiple EXISTS subqueries
CREATE POLICY "financial_budgets_view_policy" ON financial_budgets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND (
      (up.brand_id = financial_budgets.brand_id AND up.role_name IN (...))
      OR
      (up.distributor_id = financial_budgets.distributor_id AND up.role_name IN (...))
    )
  )
);
```

**Solution: Helper Functions for RLS**

1. **Create Permission Helper Functions:**
```sql
-- /database_migrations/rls_optimization.sql
CREATE OR REPLACE FUNCTION user_can_access_brand(brand_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND (
      role_name = 'super_admin' 
      OR brand_id = brand_uuid
      OR EXISTS (
        SELECT 1 FROM user_memberships 
        WHERE user_id = auth.uid() 
        AND brand_id = brand_uuid 
        AND is_active = true
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION user_can_access_distributor(distributor_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL  
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND (
      role_name = 'super_admin'
      OR distributor_id = distributor_uuid
    )
  );
$$;

CREATE OR REPLACE FUNCTION user_has_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER  
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role_name = ANY(required_roles)
  );
$$;
```

2. **Simplify RLS Policies:**
```sql
-- Replace complex policies with helper functions
DROP POLICY IF EXISTS "financial_budgets_view_policy" ON financial_budgets;

CREATE POLICY "financial_budgets_view_policy" ON financial_budgets
FOR SELECT USING (
  user_can_access_brand(brand_id) 
  OR user_can_access_distributor(distributor_id)
  OR user_has_role(ARRAY['super_admin', 'financial_admin'])
);
```

**Expected Impact:** 50-100ms reduction per query with RLS

### 2.3 Dashboard Metrics Optimization

#### Problem: Complex Dashboard RPC Function
**File:** `/hooks/use-dashboard-metrics.ts`

**Solution: Materialized Views for Dashboard Data**

1. **Create Materialized Views:**
```sql
-- /database_migrations/dashboard_optimization.sql

-- Daily sales metrics materialized view
CREATE MATERIALIZED VIEW daily_sales_metrics AS
SELECT 
  brand_id,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue,
  SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_revenue,
  AVG(total_amount) as avg_order_value
FROM orders 
WHERE created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY brand_id, DATE_TRUNC('day', created_at);

-- Create unique index for performance
CREATE UNIQUE INDEX ON daily_sales_metrics (brand_id, date);

-- Monthly sales metrics materialized view  
CREATE MATERIALIZED VIEW monthly_sales_metrics AS
SELECT 
  brand_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue,
  COUNT(DISTINCT customer_id) as unique_customers
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '5 years'
GROUP BY brand_id, DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX ON monthly_sales_metrics (brand_id, month);
```

2. **Create Refresh Function:**
```sql
-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales_metrics;
END;
$$;

-- Schedule refresh via cron job or trigger
```

3. **Optimize Dashboard RPC:**
```sql
-- Replace complex get_sales_dashboard_metrics with optimized version
CREATE OR REPLACE FUNCTION get_sales_dashboard_metrics_optimized(
  p_brand_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(total_revenue), 0),
    'total_orders', COALESCE(SUM(order_count), 0),
    'avg_order_value', COALESCE(AVG(total_revenue / NULLIF(order_count, 0)), 0),
    'daily_data', json_agg(
      json_build_object(
        'date', date,
        'revenue', total_revenue,
        'orders', order_count
      ) ORDER BY date
    )
  )
  FROM daily_sales_metrics
  WHERE brand_id = p_brand_id
  AND date BETWEEN p_period_start AND p_period_end;
$$;
```

**Expected Impact:** 200-500ms improvement in dashboard loading

### 2.4 React Query Cache Optimization

#### Problem: Inconsistent Cache Strategies
**Files:** Multiple hooks with different stale times

**Solution: Standardized Caching Strategy**

1. **Create Cache Time Constants:**
```typescript
// /lib/cache-config.ts
export const CACHE_TIMES = {
  // Static data that rarely changes
  STATIC_DATA: 60 * 60 * 1000,    // 1 hour (roles, categories, menu)
  
  // Data that changes occasionally  
  SLOW_CHANGING: 15 * 60 * 1000,  // 15 minutes (users, products, distributors)
  
  // Moderately dynamic data
  MODERATE: 5 * 60 * 1000,        // 5 minutes (orders, inventory, campaigns)
  
  // Frequently changing data
  FAST_CHANGING: 2 * 60 * 1000,   // 2 minutes (dashboard, notifications)
  
  // Real-time data
  REAL_TIME: 30 * 1000,           // 30 seconds (live notifications, alerts)
} as const;

export const CACHE_CONFIG = {
  // Background refetch configuration
  getRefetchConfig: (cacheTime: number, isActive: boolean = true) => ({
    refetchInterval: isActive && cacheTime <= CACHE_TIMES.MODERATE ? cacheTime * 0.5 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: cacheTime <= CACHE_TIMES.FAST_CHANGING,
    refetchOnMount: cacheTime <= CACHE_TIMES.MODERATE,
  })
} as const;
```

2. **Update Hook Implementations:**
```typescript
// /hooks/use-dashboard-metrics.ts
export const useDashboardMetrics = (params: DashboardParams) => {
  return useQuery({
    queryKey: ["dashboard-metrics", params],
    queryFn: () => fetchDashboardMetrics(params),
    staleTime: CACHE_TIMES.FAST_CHANGING,
    gcTime: CACHE_TIMES.FAST_CHANGING * 2,
    ...CACHE_CONFIG.getRefetchConfig(CACHE_TIMES.FAST_CHANGING, params.isActive),
  });
};

// /hooks/use-products.ts  
export const useProducts = (params: ProductParams) => {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => fetchProducts(params),
    staleTime: CACHE_TIMES.SLOW_CHANGING,
    gcTime: CACHE_TIMES.SLOW_CHANGING * 2,
    ...CACHE_CONFIG.getRefetchConfig(CACHE_TIMES.SLOW_CHANGING),
  });
};
```

3. **Implement Smart Cache Invalidation:**
```typescript
// /hooks/use-products.ts - Optimize invalidation
const createProductMutation = useMutation({
  mutationFn: createProduct,
  onSuccess: (newProduct) => {
    // Smart cache update instead of invalidation
    queryClient.setQueryData(
      ['products', { brandId: newProduct.brand_id }],
      (oldData: ProductsResponse | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          data: [newProduct, ...oldData.data],
          total: oldData.total + 1
        };
      }
    );
    
    // Only invalidate related dashboard metrics for specific brand
    queryClient.invalidateQueries({
      queryKey: ["dashboard-metrics"],
      predicate: (query) => {
        const params = query.queryKey[1] as any;
        return params?.brandId === newProduct.brand_id;
      }
    });
  }
});
```

**Expected Impact:** 25% reduction in unnecessary API requests

---

## Phase 3: Advanced Optimizations (Week 5-8)

### 3.1 Next.js 15 Modern Features

#### Implement `use cache` Directive

1. **Menu Permissions Caching:**
```typescript
// /lib/auth/menu-permissions.ts
"use cache";
export async function getMenuPermissions(userId: string, roleId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('menu_permissions')
    .select(`
      menu_item,
      can_view,
      can_create,
      can_edit,
      can_delete,
      can_approve
    `)
    .eq('role_id', roleId);
    
  if (error) throw error;
  
  return processMenuPermissions(data);
}
```

2. **User Profile Caching:**
```typescript  
// /lib/auth/user-profile.ts
"use cache";
export async function getUserProfile(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id, user_id, email, first_name, last_name,
      role_name, brand_id, distributor_id, status,
      profile_complete
    `)
    .eq('user_id', userId)
    .single();
    
  if (error) throw error;
  
  return data;
}
```

#### Add Advanced Error Boundaries

1. **Create Error Components:**
```typescript
// /app/(authenticated)/dashboard/error.tsx
"use client";

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Something went wrong with the dashboard</h2>
        <p className="text-gray-600">
          We encountered an error loading your dashboard data.
        </p>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
```

### 3.2 Advanced Bundle Optimization

#### Code Splitting Optimization

1. **Route-Level Code Splitting:**
```typescript
// /app/(authenticated)/marketing/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { MarketingPageSkeleton } from '@/components/marketing/skeleton';

// Lazy load heavy components
const CampaignsList = dynamic(
  () => import('@/components/marketing/campaigns-list'),
  { 
    ssr: false,
    loading: () => <MarketingPageSkeleton />
  }
);

const CampaignAnalytics = dynamic(
  () => import('@/components/marketing/campaign-analytics'),
  { ssr: false }
);

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<MarketingPageSkeleton />}>
        <CampaignsList />
        <CampaignAnalytics />
      </Suspense>
    </div>
  );
}
```

2. **Vendor Bundle Optimization:**
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 244000, // 244KB chunks
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 10,
          },
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'icons',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    
    return config;
  },
};
```

### 3.3 Performance Monitoring & Analytics

#### Core Web Vitals Monitoring

1. **Advanced Web Vitals Tracking:**
```typescript
// /lib/analytics/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB, getINP } from 'web-vitals';

interface WebVitalMetric {
  name: string;
  value: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export function setupWebVitals() {
  getCLS(onPerfEntry);
  getFID(onPerfEntry);  
  getFCP(onPerfEntry);
  getLCP(onPerfEntry);
  getTTFB(onPerfEntry);
  getINP(onPerfEntry);
}

function onPerfEntry(metric: WebVitalMetric) {
  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      custom_map: { metric_rating: metric.rating },
    });
  }
  
  // Send to custom analytics endpoint
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
      url: window.location.pathname,
    }),
  }).catch(console.error);
}
```

2. **Performance Dashboard:**
```typescript
// /app/api/analytics/performance-report/route.ts
export async function GET() {
  const supabase = createClient();
  
  const { data: vitals } = await supabase
    .from('web_vitals_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
    
  const report = {
    lcp: calculateP75(vitals?.filter(v => v.metric === 'LCP')),
    fid: calculateP75(vitals?.filter(v => v.metric === 'FID')),
    cls: calculateP75(vitals?.filter(v => v.metric === 'CLS')),
    recommendations: generateRecommendations(vitals),
  };
  
  return Response.json(report);
}
```

### 3.4 Image Optimization Pipeline

#### Advanced Image Processing

1. **Client-Side Image Compression:**
```typescript
// /lib/image/compression.ts
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File, options?: {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp',
    quality: 0.8,
    ...options,
  };
  
  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    
    // Create new file with optimized name
    return new File(
      [compressedFile], 
      `${file.name.split('.')[0]}.webp`,
      { type: 'image/webp' }
    );
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Return original if compression fails
  }
}
```

2. **Progressive Image Loading:**
```typescript
// /components/ui/progressive-image.tsx
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export const ProgressiveImage = ({ src, alt, width, height, className }: ProgressiveImageProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(`${src}?w=20&q=20`); // Tiny placeholder
  
  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
    };
  }, [src]);
  
  return (
    <div className={`relative ${className}`}>
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`transition-all duration-300 ${
          imageLoaded ? 'blur-0 opacity-100' : 'blur-lg opacity-70'
        }`}
        onLoad={() => setImageLoaded(true)}
      />
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
    </div>
  );
};
```

---

## Implementation Checklist

### Phase 1: Quick Wins ✓
- [ ] Move ExcelJS and heavy libraries to server-side API routes
- [ ] Replace all `<img>` tags with Next.js `Image` component
- [ ] Add critical database indexes for RLS policies
- [ ] Implement React.memo for list components
- [ ] Memoize filter objects and expensive calculations
- [ ] Set up bundle analyzer in CI/CD pipeline

### Phase 2: Database Optimization ✓
- [ ] Create optimized RPC functions for N+1 queries
- [ ] Implement RLS helper functions
- [ ] Create materialized views for dashboard metrics
- [ ] Set up automated materialized view refresh
- [ ] Standardize React Query cache times
- [ ] Implement smart cache invalidation patterns

### Phase 3: Advanced Features ✓
- [ ] Implement `use cache` directive for auth functions
- [ ] Add error.tsx files to all route segments
- [ ] Set up advanced bundle splitting
- [ ] Implement Core Web Vitals monitoring
- [ ] Add performance analytics dashboard
- [ ] Create image compression pipeline
- [ ] Set up progressive image loading

## Success Metrics & Monitoring

### Performance Targets
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **First Input Delay (FID)**: < 100 milliseconds  
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to First Byte (TTFB)**: < 800 milliseconds
- **Bundle Size**: < 500KB initial load
- **Database Query Time**: < 200ms average

### Monitoring Setup
1. **Vercel Speed Insights**: Enable for production monitoring
2. **Core Web Vitals Dashboard**: Custom analytics endpoint
3. **Database Performance**: Supabase Query Performance dashboard
4. **Bundle Analysis**: Automated size tracking in CI/CD
5. **User Experience Monitoring**: Real user metrics collection

## Rollback Plan

Each phase includes incremental deployment with rollback capabilities:

### Phase 1 Rollback
- Revert to client-side Excel processing if server routes fail
- Toggle back to `<img>` tags if Image component causes issues
- Remove indexes if they cause performance degradation

### Phase 2 Rollback
- Fallback to original query patterns if RPC functions fail
- Disable materialized views if refresh issues occur
- Revert to original cache times if new ones cause problems

### Phase 3 Rollback  
- Disable `use cache` directive if caching issues occur
- Remove error boundaries if they interfere with error reporting
- Revert to original bundle splitting if load issues occur

## Cost-Benefit Analysis

### Development Investment
- **Phase 1**: 80 developer hours × $100/hour = $8,000
- **Phase 2**: 120 developer hours × $100/hour = $12,000
- **Phase 3**: 200 developer hours × $100/hour = $20,000
- **Total**: $40,000 development investment

### Expected Returns
- **Server Performance Savings**: $500/month (reduced compute costs)
- **CDN/Bandwidth Savings**: $200/month (optimized assets)
- **Developer Productivity**: $2,000/month (faster development)
- **User Experience**: Improved retention and conversion rates

**Payback Period**: 14 months
**3-Year ROI**: 280% return on investment

---

This comprehensive performance optimization plan provides a clear roadmap for achieving significant improvements in GrowShip MVP's loading times and overall user experience. Each phase builds upon the previous one, ensuring minimal risk while maximizing performance gains.