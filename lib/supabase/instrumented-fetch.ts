const SHOULD_MEASURE =
  process.env.NEXT_PUBLIC_ENABLE_SUPABASE_LOGGING?.toLowerCase() === "true" ||
  process.env.NODE_ENV !== "production";

const SUPABASE_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const WARN_THRESHOLD_MS = 500;

function resolveRequestUrl(input: RequestInfo | URL): string | null {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (input instanceof Request) {
    return input.url;
  }

  return null;
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method;
  if (typeof input === "string" || input instanceof URL) return "GET";
  if (input instanceof Request && input.method) return input.method;
  return "GET";
}

export async function instrumentedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = resolveRequestUrl(input);

  const shouldTrace =
    SHOULD_MEASURE && !!url && !!SUPABASE_BASE_URL && url.startsWith(SUPABASE_BASE_URL);

  if (!shouldTrace) {
    return fetch(input as any, init);
  }

  const method = resolveMethod(input, init).toUpperCase();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();

  const response = await fetch(input as any, init);

  const end = typeof performance !== "undefined" ? performance.now() : Date.now();
  const duration = end - start;

  let path = url;
  try {
    const parsedUrl = new URL(url);
    path = `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    // keep original url string
  }

  const sizeHeader = response.headers.get("content-length");
  const size = sizeHeader ? Number(sizeHeader) : undefined;

  const logPayload = {
    method,
    path,
    status: response.status,
    duration: Number(duration.toFixed(2)),
    size,
  };

  if (duration > WARN_THRESHOLD_MS) {
    console.warn("[SupabaseFetch] slow query detected", logPayload);
  } else {
    console.debug("[SupabaseFetch]", logPayload);
  }

  return response;
}

