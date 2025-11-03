"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useUserMenuPermissions } from "@/hooks/use-menu-permissions";
import { getStoredUserData, getStoredProfile } from "@/lib/localStorage";
import { useState } from "react";
import {
  X,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Loader2,
  AlertCircle,
  UsersIcon,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuItem } from "@/types/menu";
import { toast } from "react-toastify";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function MenuItemComponent({
  item,
  pathname,
  isPendingUser,
}: {
  item: MenuItem;
  pathname: string;
  isPendingUser: boolean;
}) {
  const router = useRouter();
  const isActive = pathname === item.route_path;
  const isDashboard = item.route_path === "/dashboard";

  const handleClick = (e: React.MouseEvent) => {
    if (isPendingUser && !isDashboard) {
      e.preventDefault();
      toast.warning(
        "Your account is pending approval. You can only access the dashboard until approved."
      );
      return;
    }
  };

  return (
    <Link
      href={item.route_path}
      onClick={handleClick}
      className={`
        group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
        ${
          isActive
            ? "bg-teal-500 text-white shadow-md"
            : isPendingUser && !isDashboard
            ? "text-gray-400 cursor-not-allowed opacity-50"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }
      `}
    >
      <div className="flex items-center w-full">
        <item.icon
          className={`
            mr-3 h-5 w-5 flex-shrink-0
            ${
              isActive
                ? "text-white"
                : isPendingUser && !isDashboard
                ? "text-gray-300"
                : "text-gray-400 group-hover:text-gray-600"
            }
          `}
        />
        <span className="flex-1">{item.menu_label}</span>
        {isPendingUser && !isDashboard && (
          <Lock className="h-4 w-4 text-gray-300 ml-2" />
        )}
      </div>
    </Link>
  );
}

function MenuItemWithChildren({
  item,
  pathname,
  isPendingUser,
}: {
  item: MenuItem;
  pathname: string;
  isPendingUser: boolean;
}) {
  const router = useRouter();
  const isActive = pathname === item.route_path;
  const isDashboard = item.route_path === "/dashboard";
  const hasActiveChild = item.children?.some(
    (child) =>
      child.route_path === pathname ||
      (child.children &&
        child.children.some((grandChild) => grandChild.route_path === pathname))
  );
  const [isOpen, setIsOpen] = useState<boolean>(Boolean(isActive || hasActiveChild));
  const hasChildren = Boolean(item.children && item.children.length > 0);

  const handleClick = (e: React.MouseEvent) => {
    if (isPendingUser && !isDashboard) {
      e.preventDefault();
      toast.warning(
        "Your account is pending approval. You can only access the dashboard until approved."
      );
      return;
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className={`
              group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex-1 text-left
              ${
                isActive || hasActiveChild
                  ? "bg-teal-500 text-white shadow-md"
                  : isPendingUser && !isDashboard
                  ? "text-gray-400 opacity-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }
            `}
            aria-expanded={isOpen}
          >
            <item.icon
              className={`
                mr-3 h-5 w-5 flex-shrink-0
                ${
                  isActive || hasActiveChild
                    ? "text-white"
                    : isPendingUser && !isDashboard
                    ? "text-gray-300"
                    : "text-gray-400 group-hover:text-gray-600"
                }
              `}
            />
            <span className="flex-1">{item.menu_label}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
        ) : (
          <Link
            href={item.route_path}
            onClick={handleClick}
            className={`
              group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex-1
              ${
                isActive
                  ? "bg-teal-500 text-white shadow-md"
                  : isPendingUser && !isDashboard
                  ? "text-gray-400 cursor-not-allowed opacity-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }
            `}
          >
            <div className="flex items-center w-full">
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0
                  ${
                    isActive
                      ? "text-white"
                      : isPendingUser && !isDashboard
                      ? "text-gray-300"
                      : "text-gray-400 group-hover:text-gray-600"
                  }
                `}
              />
              <span className="flex-1">{item.menu_label}</span>
              {isPendingUser && !isDashboard && (
                <Lock className="h-4 w-4 text-gray-300 ml-2" />
              )}
            </div>
          </Link>
        )}
      </div>

      {hasChildren && item.children && item.children.length > 0 && (
        <div
          className={`ml-6 overflow-hidden transition-all duration-300 ${
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-1 py-1">
            {item.children.map((child) => (
              <MenuItemComponent
                key={child.id}
                item={child}
                pathname={pathname}
                isPendingUser={isPendingUser}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const { user: authUser, profile: authProfile, signOut } = useAuth();

  const user = authUser || getStoredUserData();
  const profile = authProfile || getStoredProfile();

  const {
    data: menuData,
    isLoading: loading,
    error,
    isFetching,
  } = useUserMenuPermissions(user?.id || null);

  const menuItems = menuData?.menuItems || [];
  const menuError = menuData?.error || error?.message;

  const isPendingUser = profile?.user_status === "pending";

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={onClose}
          />
        </div>
      )}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:h-full border-r border-gray-200
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm bg-teal-500 rounded-sm px-3 py-2">
                  G
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-black">GrowShip</h1>
                <p className="text-xs text-black/80">
                  {profile?.role_name
                    ? profile.role_name.split("_")[0].charAt(0).toUpperCase() +
                      profile.role_name.split("_")[0].slice(1).toLowerCase()
                    : "Business"}{" "}
                  Portal
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden h-8 w-8 text-black hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems && menuItems.length > 0 ? (
              <>
                {menuItems.map((item) => (
                  <MenuItemWithChildren
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    isPendingUser={isPendingUser}
                  />
                ))}
                {isFetching && !loading && (
                  <div className="flex items-center justify-center py-2 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin text-teal-500" />
                    <span className="ml-2 text-xs text-gray-400">
                      Refreshing...
                    </span>
                  </div>
                )}
              </>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                <span className="ml-2 text-sm text-gray-500">
                  Loading menu...
                </span>
              </div>
            ) : menuError ? (
              <div className="flex items-center justify-center py-8">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <span className="ml-2 text-sm text-red-500">{menuError}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-gray-500">
                  No menu items available
                </span>
              </div>
            )}
          </nav>

          <div className="border-t border-gray-200 p-4">
            {loading ? (
              <div className="flex items-center p-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3 animate-pulse">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <div className="flex items-center w-full">
                      <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center mr-3">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {profile?.contact_name || user?.email || "User"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {profile?.role_name
                            ? (() => {
                                const words = profile.role_name
                                  .split("_")
                                  .map(
                                    (w: string) =>
                                      w.charAt(0).toUpperCase() +
                                      w.slice(1).toLowerCase()
                                  );
                                return words.join(" ");
                              })()
                            : "user"}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-400 ml-2" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    asChild={!isPendingUser}
                    onClick={
                      isPendingUser
                        ? () =>
                            toast.warning(
                              "Your account is pending approval. You can only access the dashboard until approved."
                            )
                        : undefined
                    }
                    className={
                      isPendingUser ? "cursor-not-allowed opacity-50" : ""
                    }
                  >
                    {isPendingUser ? (
                      <div className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Profile Settings</span>
                        <Lock className="h-4 w-4 ml-2" />
                      </div>
                    ) : (
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
