"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, UseQueryResult } from "@tanstack/react-query";

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
}

interface UsePaginatedResourceOptions<TFilters, TResult> {
  queryKey: string;
  filters: TFilters;
  searchTerm?: string;
  enabled?: boolean;
  initialPage?: number;
  initialPageSize?: number;
  identityKey?: unknown[];
  fetcher: (params: {
    page: number;
    pageSize: number;
    filters: TFilters;
    searchTerm?: string;
  }) => Promise<PaginatedResponse<TResult>>;
}

export interface PaginatedResourceResult<TData> {
  page: number;
  pageSize: number;
  pageCount: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  totalCount: number;
  data: TData[];
  query: UseQueryResult<PaginatedResponse<TData>, Error>;
}

export function usePaginatedResource<TFilters, TResult>({
  queryKey,
  filters,
  searchTerm,
  enabled = true,
  initialPage = 0,
  initialPageSize = 25,
  fetcher,
  identityKey = [],
}: UsePaginatedResourceOptions<TFilters, TResult>): PaginatedResourceResult<TResult> {
  const [pageState, setPageState] = useState(initialPage);
  const [pageSizeState, setPageSizeState] = useState(initialPageSize);

  const serializedFilters = useMemo(() => JSON.stringify(filters), [filters]);

  const query = useQuery({
    queryKey: [
      queryKey,
      ...identityKey,
      pageState,
      pageSizeState,
      serializedFilters,
      searchTerm ?? "",
    ],
    queryFn: () =>
      fetcher({
        page: pageState,
        pageSize: pageSizeState,
        filters,
        searchTerm,
      }),
    placeholderData: (previousData) => previousData,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const totalCount = query.data?.totalCount ?? 0;
  const pageCount =
    totalCount === 0 ? 0 : Math.ceil(totalCount / pageSizeState);

  useEffect(() => {
    setPageState(0);
  }, [serializedFilters, searchTerm]);

  const setPage = useCallback((nextPage: number) => {
    setPageState(Math.max(0, nextPage));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageState(0);
    setPageSizeState(size);
  }, []);

  return {
    page: pageState,
    pageSize: pageSizeState,
    pageCount,
    setPage,
    setPageSize,
    totalCount,
    data: query.data?.data ?? [],
    query,
  };
}

