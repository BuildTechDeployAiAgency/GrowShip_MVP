import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Allow access to auth pages (including password setup) without authentication
  const authPages = [
    "/auth/",
    "/auth/callback",
    "/auth/setup-password",
    "/auth/invite",
  ];
  const isAuthPage = authPages.some((page) =>
    request.nextUrl.pathname.startsWith(page)
  );

  // Allow authenticated users to access profile setup without additional DB queries
  if (user && request.nextUrl.pathname.startsWith("/profile/setup")) {
    return supabaseResponse;
  }

  // Define protected routes
  const protectedRoutes = [
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
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Protect all app routes - redirect unauthenticated users to landing page
  if (!user && !isAuthPage && isProtectedRoute) {
    // No user, redirect to home page where they can choose their role
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // If user is authenticated and accessing protected routes, check if they need to complete setup
  if (
    user &&
    isProtectedRoute &&
    !request.nextUrl.pathname.startsWith("/profile/setup")
  ) {
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile || !profile.is_profile_complete) {
        // Profile not complete, redirect to profile setup
        const url = request.nextUrl.clone();
        url.pathname = "/profile/setup";
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error("Error checking profile in middleware:", error);
      // If there's an error checking profile, redirect to profile setup
      const url = request.nextUrl.clone();
      url.pathname = "/profile/setup";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export { updateSession as middleware };
