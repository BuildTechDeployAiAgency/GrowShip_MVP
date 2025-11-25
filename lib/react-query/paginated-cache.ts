import type { QueryClient } from "@tanstack/react-query";
import type { PaginatedResponse } from "@/hooks/use-paginated-resource";

interface CacheMeta<TFilters = unknown> {
  page: number;
  pageSize: number;
  filters: TFilters | null;
  searchTerm: string;
}

function safeParseFilters<T>(serialized: unknown): T | null {
  if (typeof serialized !== "string") return null;
  try {
    return JSON.parse(serialized) as T;
  } catch {
    return null;
  }
}

export function updatePaginatedCaches<T, TFilters = unknown>(
  queryClient: QueryClient,
  baseKey: string,
  updater: (
    current: PaginatedResponse<T>,
    meta: CacheMeta<TFilters>
  ) => PaginatedResponse<T> | null
) {
  const queries = queryClient.getQueriesData<PaginatedResponse<T>>({
    queryKey: [baseKey],
  });

  queries.forEach(([key, cache]) => {
    if (
      !cache ||
      !Array.isArray(key) ||
      key[0] !== baseKey ||
      key.length < 5
    ) {
      return;
    }

    const searchTerm = key[key.length - 1];
    const serializedFilters = key[key.length - 2];
    const pageSize = key[key.length - 3];
    const page = key[key.length - 4];

    if (typeof page !== "number" || typeof pageSize !== "number") {
      return;
    }

    const next = updater(cache, {
      page,
      pageSize,
      filters: safeParseFilters<TFilters>(serializedFilters),
      searchTerm: typeof searchTerm === "string" ? searchTerm : "",
    });

    if (next) {
      queryClient.setQueryData(key, next);
    }
  });
}

