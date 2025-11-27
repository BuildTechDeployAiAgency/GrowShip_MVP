"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useRoutePersistence } from "@/hooks/use-route-persistence";
import { useHeader } from "@/contexts/header-context";

interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle: string | React.ReactNode;
  pageSubtitle?: string;
  actions?: React.ReactNode;
}

/**
 * MainLayout now acts as a "Page Controller" that sets header data
 * and handles route persistence. The actual layout shell (Sidebar/Header)
 * is rendered by the app/(authenticated)/layout.tsx to persist across routes.
 */
export function MainLayout({
  children,
  pageTitle,
  pageSubtitle,
  actions,
}: MainLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { setHeaderData } = useHeader();

  // Update header when props change
  useEffect(() => {
    setHeaderData({ pageTitle, pageSubtitle, actions });
  }, [pageTitle, pageSubtitle, actions, setHeaderData]);

  // Don't track /dashboard to avoid overriding it as the saved path
  const shouldTrack = pathname !== "/dashboard";
  useRoutePersistence(user?.id, { track: shouldTrack });

  return <>{children}</>;
}
