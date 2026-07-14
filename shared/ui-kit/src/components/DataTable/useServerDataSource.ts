"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export type ServerDataSourceParams = {
  page: number;
  limit: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filters: Record<string, any>;
};

export type ServerDataSourceResult<T> = {
  items: T[];
  total: number;
};

export type UseServerDataSourceOptions<T> = {
  fetcher: (params: ServerDataSourceParams, signal: AbortSignal) => Promise<ServerDataSourceResult<T>>;
  initialPage?: number;
  limit?: number;
  initialSortBy?: string;
  initialSortDirection?: "asc" | "desc";
  initialFilters?: Record<string, any>;
};

export function useServerDataSource<T>({
  fetcher,
  initialPage = 1,
  limit = 20,
  initialSortBy,
  initialSortDirection,
  initialFilters = {},
}: UseServerDataSourceOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [page, setPage] = useState(initialPage);
  const [sortBy, setSortBy] = useState<string | undefined>(initialSortBy);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | undefined>(initialSortDirection);
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const loadData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current(
        {
          page,
          limit,
          filters,
          ...(sortBy !== undefined ? { sortBy } : {}),
          ...(sortDirection !== undefined ? { sortDirection } : {}),
        },
        abortController.signal
      );
      setItems(result.items);
      setTotal(result.total);
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      setError(err);
    } finally {
      if (abortControllerRef.current === abortController) {
        setIsLoading(false);
      }
    }
  }, [page, limit, sortBy, sortDirection, filters]);

  useEffect(() => {
    loadData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  const setFilter = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    items,
    total,
    totalPages: Math.ceil(total / limit),
    isLoading,
    error,
    page,
    limit,
    sortBy,
    sortDirection,
    filters,
    setPage,
    setSortBy,
    setSortDirection,
    setFilter,
    setFilters,
    clearFilters,
    refresh,
  };
}
