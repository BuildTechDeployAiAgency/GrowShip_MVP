import { createClient } from "@/lib/supabase/server";
import { fetchUserMenuPermissionsServer } from "@/lib/api/menu-permissions-server";
import { redirect } from "next/navigation";
import { AuthenticatedLayoutClient } from "./layout-client";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to home if not authenticated
  if (!user) {
    redirect("/");
  }

  // Fetch menu permissions server-side
  let initialMenuData = null;
  try {
    const menuResult = await fetchUserMenuPermissionsServer(user.id);
    if (!menuResult.error && menuResult.menuItems.length > 0) {
      initialMenuData = menuResult.menuItems;
    }
  } catch (error) {
    console.error("[SSR] Error fetching menu in layout:", error);
  }

  return (
    <AuthenticatedLayoutClient
      userId={user.id}
      initialMenuData={initialMenuData}
    >
      {children}
    </AuthenticatedLayoutClient>
  );
}

