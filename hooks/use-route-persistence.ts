"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import {
  getLastVisitedPath,
  setLastVisitedPath,
} from "@/lib/localStorage";

interface RoutePersistenceOptions {
  track?: boolean;
  ignorePrefixes?: string[];
}

const DEFAULT_IGNORE_PREFIXES = ["/auth"];

export function useRoutePersistence(
  userId?: string | null,
  { track = true, ignorePrefixes = DEFAULT_IGNORE_PREFIXES }: RoutePersistenceOptions = {}
) {
  const pathname = usePathname();
  const router = useRouter();
  const hasRestoredRef = useRef(false);

  const shouldIgnore =
    !pathname ||
    ignorePrefixes.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (!userId || !pathname || !track || shouldIgnore) {
      return;
    }
    setLastVisitedPath(userId, pathname);
  }, [userId, pathname, track, shouldIgnore]);

  const restoreLastPath = useCallback(
    (fallbackPaths: string[] = ["/"]) => {
      // Only restore from root path and only once per session
      if (!userId || hasRestoredRef.current || !pathname) {
        return;
      }

      // Only trigger restore logic when on the landing page (/)
      if (!fallbackPaths.includes(pathname)) {
        return;
      }

      const storedPath = getLastVisitedPath(userId);
      if (storedPath && storedPath !== pathname && storedPath !== "/dashboard") {
        hasRestoredRef.current = true;
        router.replace(storedPath);
      }
    },
    [pathname, router, userId]
  );

  return { restoreLastPath };
}

