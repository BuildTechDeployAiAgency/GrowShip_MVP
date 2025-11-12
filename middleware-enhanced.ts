import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Role-based route access configuration
const ROLE_ROUTES = {
  super_admin: [
    "/dashboard",
    "/profile",
    "/settings",
    "/users",
    "/sales",
    "/orders",
    "/purchase-orders",
    "/shipments",
    "/invoices",
    "/reports",
    "/financials",
    "/marketing",
    "/calendar",
    "/notifications",
    "/distributors",
    "/manufacturers",
    "/super-admin", // Super admin specific routes
  ],
  brand_admin: [
    "/dashboard",
    "/profile",
    "/settings",
    "/users",
    "/sales",
    "/orders",
    "/purchase-orders",
    "/shipments",
    "/invoices",
    "/reports",
    "/financials",
    "/marketing",
    "/calendar",
    "/notifications",
    "/distributors", // Can see associated distributors
  ],
  brand_finance: [
    "/dashboard",
    "/profile",
    "/settings",
    "/financials",
    "/invoices",
    "/reports",
    "/calendar",
    "/notifications",
  ],
  brand_manager: [
    "/dashboard",
    "/profile",
    "/settings",
    "/sales",
    "/orders",
    "/purchase-orders",
    "/shipments",
    "/reports",
    "/marketing",
    "/calendar",
    "/notifications",
  ],
  brand_user: [
    "/dashboard",
    "/profile",
    "/settings",
    "/calendar",
    "/notifications",
  ],
  distributor_admin: [
    "/dashboard",
    "/profile",
    "/settings",
    "/users",
    "/sales",
    "/orders",
    "/shipments",
    "/invoices",
    "/reports",
    "/financials",
    "/calendar",
    "/notifications",
  ],
  distributor_finance: [
    "/dashboard",
    "/profile",
    "/settings",
    "/financials",
    "/invoices",
    "/reports",
    "/calendar",
    "/notifications",
  ],
  distributor_manager: [
    "/dashboard",
    "/profile",
    "/settings",
    "/sales",
    "/orders",
    "/shipments",
    "/reports",
    "/calendar",
    "/notifications",
  ],
  distributor_user: [
    "/dashboard",
    "/profile",
    "/settings",
    "/calendar",
    "/notifications",
  ],
  manufacturer_admin: [
    "/dashboard",
    "/profile",
    "/settings",
    "/users",
    "/orders",
    "/purchase-orders",
    "/shipments",
    "/invoices",
    "/reports",
    "/financials",
    "/calendar",
    "/notifications",
  ],
  manufacturer_finance: [
    "/dashboard",
    "/profile",
    "/settings",
    "/financials",
    "/invoices",
    "/reports",
    "/calendar",
    "/notifications",
  ],
  manufacturer_manager: [
    "/dashboard",
    "/profile",
    "/settings",
    "/orders",
    "/purchase-orders",
    "/shipments",
    "/reports",
    "/calendar",
    "/notifications",
  ],
};

export async function updateSession(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow access to auth pages without authentication
  const authPages = [
    "/auth/",
    "/auth/callback",
    "/auth/setup-password",
    "/auth/invite",
    "/auth/reset-password",
  ];
  const isAuthPage = authPages.some((page) =>
    request.nextUrl.pathname.startsWith(page)
  );

  // Allow access to public pages
  const publicPages = ["/", "/about", "/contact", "/pricing"];
  const isPublicPage = publicPages.includes(request.nextUrl.pathname);

  // Allow authenticated users to access profile setup without additional DB queries
  if (user && request.nextUrl.pathname.startsWith("/profile/setup")) {
    return supabaseResponse;
  }

  // If it's a public page or auth page, allow access
  if (isPublicPage || isAuthPage) {
    return supabaseResponse;
  }

  // Check if the route requires authentication
  const allProtectedRoutes = Object.values(ROLE_ROUTES).flat();
  const isProtectedRoute = allProtectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // If not a protected route, allow access
  if (!isProtectedRoute) {
    return supabaseResponse;
  }

  // Protect all app routes - redirect unauthenticated users to landing page
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // If user is authenticated and accessing protected routes, check profile and permissions
  if (user && isProtectedRoute && !request.nextUrl.pathname.startsWith("/profile/setup")) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // If there's an error fetching profile, allow access but log it
      // This prevents redirect loops if there's a temporary DB issue
      if (profileError) {
        console.error("[Middleware Enhanced] Error checking profile:", {
          userId: user.id,
          error: profileError.message,
          path: request.nextUrl.pathname,
        });
        // Only redirect if it's a "not found" error, otherwise allow access
        if (profileError.code === "PGRST116") {
          // Profile not found - redirect to setup
          const url = request.nextUrl.clone();
          url.pathname = "/profile/setup";
          return NextResponse.redirect(url);
        }
        // For other errors, allow access to prevent loops
        return supabaseResponse;
      }

      // Only redirect if profile is explicitly incomplete
      // Use strict equality check to avoid issues with null/undefined
      if (!profile || profile.is_profile_complete === false) {
        // Profile not complete, redirect to profile setup
        const url = request.nextUrl.clone();
        url.pathname = "/profile/setup";
        return NextResponse.redirect(url);
      }

      // Check if user has access to the requested route based on their role
      const userRole = profile.role_name;
      const allowedRoutes = ROLE_ROUTES[userRole as keyof typeof ROLE_ROUTES];

      if (!allowedRoutes) {
        console.error(`Unknown role: ${userRole}`);
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      // Check if the current path is allowed for this role
      const isRouteAllowed = allowedRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
      );

      if (!isRouteAllowed) {
        // User doesn't have permission for this route, redirect to dashboard
        console.log(`Access denied for role ${userRole} to ${request.nextUrl.pathname}`);
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      // Special handling for super admin routes
      if (request.nextUrl.pathname.startsWith("/super-admin") && userRole !== "super_admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      // Special handling for organization-specific routes
      if (request.nextUrl.pathname.startsWith("/users") && userRole !== "super_admin") {
        // Non-super admins can only access users in their organization
        // This will be handled by the component level, but we can add additional checks here if needed
      }

    } catch (error) {
      console.error("[Middleware Enhanced] Unexpected error checking profile:", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
        path: request.nextUrl.pathname,
      });
      // On unexpected errors, allow access to prevent redirect loops
      // The client-side check will handle the redirect if needed
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}

export { updateSession as middleware };


