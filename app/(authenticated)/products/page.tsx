import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProductsPageClient } from "./products-page-client";

// Server component - handles auth check on server
export default async function ProductsPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to home if not authenticated
  if (!user) {
    redirect("/");
  }

  // Server-verified auth, render client component
  return <ProductsPageClient />;
}




