"use client";

import { useQuery } from "@tanstack/react-query";
import { Region } from "@/types/geography";

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async (): Promise<Region[]> => {
      const response = await fetch("/api/geography/regions");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch regions");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRegion(regionId: string) {
  return useQuery({
    queryKey: ["region", regionId],
    queryFn: async (): Promise<Region> => {
      const response = await fetch(`/api/geography/regions/${regionId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch region");
      }
      return response.json();
    },
    enabled: !!regionId,
    staleTime: 5 * 60 * 1000,
  });
}