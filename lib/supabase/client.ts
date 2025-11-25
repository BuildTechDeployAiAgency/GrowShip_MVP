import { createBrowserClient } from "@supabase/ssr";
import { instrumentedFetch } from "./instrumented-fetch";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: instrumentedFetch as typeof fetch,
      },
    }
  );
}
