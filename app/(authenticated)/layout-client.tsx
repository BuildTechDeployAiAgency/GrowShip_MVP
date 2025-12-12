"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { HeaderProvider, useHeader } from "@/contexts/header-context";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { DateFilterProvider } from "@/contexts/date-filter-context";
import { MenuItem } from "@/types/menu";

interface AuthenticatedLayoutClientProps {
  children: React.ReactNode;
  userId: string;
  initialMenuData: MenuItem[] | null;
}

function LayoutContent({
  children,
  userId,
  initialMenuData,
}: AuthenticatedLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pageTitle, pageSubtitle, actions } = useHeader();

  return (
    <div className="h-screen bg-gray-50 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        initialMenuData={initialMenuData}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          actions={actions}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto py-4 sm:py-6 bg-gray-50">
          <div className="mx-auto max-w-8xl px-3 sm:px-6 lg:px-8 min-h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AuthenticatedLayoutClient({
  children,
  userId,
  initialMenuData,
}: AuthenticatedLayoutClientProps) {
  return (
    <EnhancedAuthProvider>
      <DateFilterProvider>
        <HeaderProvider>
          <LayoutContent userId={userId} initialMenuData={initialMenuData}>
            {children}
          </LayoutContent>
        </HeaderProvider>
      </DateFilterProvider>
    </EnhancedAuthProvider>
  );
}

