"use client";

import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  pageTitle: string | React.ReactNode;
  pageSubtitle?: string;
  actions?: React.ReactNode;
  onMenuClick: () => void;
}

export function Header({
  pageTitle,
  pageSubtitle,
  actions,
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          <div className="flex items-center min-w-0 flex-1">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 mr-2 flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate hidden sm:block">
                  {pageSubtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {actions && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {actions}
              </div>
            )}

            <Button variant="outline" size="sm" className="hidden md:flex">
              <Bell className="w-4 h-4 sm:mr-2" />
              <span className="hidden lg:inline">Notifications</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
