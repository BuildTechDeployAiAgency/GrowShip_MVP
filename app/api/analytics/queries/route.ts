import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, message: "Service role key is not configured" },
      { status: 503 }
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Number(limitParam ?? 10);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_top_query_stats", {
      limit_count: Number.isFinite(limit) && limit > 0 ? limit : 10,
    });

    if (error) {
      console.error("[QueryStats] RPC error", error);
      return NextResponse.json(
        { ok: false, message: "Unable to fetch query stats" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("[QueryStats] Unexpected error", error);
    return NextResponse.json(
      { ok: false, message: "Unexpected error fetching query stats" },
      { status: 500 }
    );
  }
}

