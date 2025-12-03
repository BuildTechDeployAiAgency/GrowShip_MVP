import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdersPageClient } from "./orders-page-client";

// Server component - handles auth check on server
export default async function OrdersPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to home if not authenticated
  if (!user) {
    redirect("/");
  }

  // Server-verified auth, render client component
  return <OrdersPageClient />;
}

