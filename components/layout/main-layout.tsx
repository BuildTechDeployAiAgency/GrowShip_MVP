"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useRoutePersistence } from "@/hooks/use-route-persistence";

interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle: string | React.ReactNode;
  pageSubtitle?: string;
  actions?: React.ReactNode;
}

export function MainLayout({
  children,
  pageTitle,
  pageSubtitle,
  actions,
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  useRoutePersistence(user?.id, { track: true });

  return (
    <div className="h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          actions={actions}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto py-4 sm:py-6">
          <div className="mx-auto max-w-8xl px-3 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
