"use client";

import { MenuItem } from "@/types/menu";
import { UserProfile } from "@/types/auth";
import {
  LayoutDashboard,
  Upload,
  ShoppingCart,
  Truck,
  FileText,
  Receipt,
  BarChart3,
  Users,
  DollarSign,
  Megaphone,
  Bell,
  Calendar,
  Settings,
  Users2,
} from "lucide-react";

const iconMap: Record<string, any> = {
  LayoutDashboard: LayoutDashboard,
  Upload: Upload,
  ShoppingCart: ShoppingCart,
  Truck: Truck,
  FileText: FileText,
  Receipt: Receipt,
  BarChart3: BarChart3,
  Users: Users,
  DollarSign: DollarSign,
  Megaphone: Megaphone,
  Bell: Bell,
  Calendar: Calendar,
  Users2: Users2,
  Settings: Settings,
};

function reconstructMenuIcons(menuItems: MenuItem[]): MenuItem[] {
  return menuItems.map((item) => ({
    ...item,
    icon: iconMap[item.menu_icon] || LayoutDashboard,
    children: item.children ? reconstructMenuIcons(item.children) : undefined,
  }));
}

const MENU_STORAGE_KEY = "growship_menu_data";
const PROFILE_STORAGE_KEY = "growship_user_profile";
const USER_STORAGE_KEY = "growship_user_data";

export function getStoredMenuData(userId: string): MenuItem[] | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(MENU_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const storedTime = data._storedAt;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (data.userId === userId && now - storedTime < maxAge) {
        return reconstructMenuIcons(data.menuItems);
      } else {
        localStorage.removeItem(MENU_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error("Error reading menu data from localStorage:", error);
    localStorage.removeItem(MENU_STORAGE_KEY);
  }

  return null;
}

export function setStoredMenuData(userId: string, menuItems: MenuItem[]): void {
  if (typeof window === "undefined") return;

  try {
    const dataWithTimestamp = {
      userId,
      menuItems,
      _storedAt: Date.now(),
    };
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(dataWithTimestamp));
  } catch (error) {
    console.error("Error storing menu data to localStorage:", error);
  }
}

export function clearStoredMenuData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MENU_STORAGE_KEY);
}

export function getStoredProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      const profile = JSON.parse(stored);
      const storedTime = profile._storedAt;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - storedTime < maxAge) {
        return profile;
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        }
      }
    }
  } catch (error) {
    console.error("Error reading profile from localStorage:", error);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  }

  return null;
}

export function setStoredProfile(profile: UserProfile | null): void {
  if (typeof window === "undefined") return;

  try {
    if (profile) {
      const profileWithTimestamp = {
        ...profile,
        _storedAt: Date.now(),
      };
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify(profileWithTimestamp)
      );
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error("Error storing profile to localStorage:", error);
  }
}

export function getStoredUserData(): { id: string; email: string } | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      const storedTime = user._storedAt;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - storedTime < maxAge) {
        return { id: user.id, email: user.email };
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    }
  } catch (error) {
    console.error("Error reading user data from localStorage:", error);
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  return null;
}

export function setStoredUserData(
  user: { id: string; email: string } | null
): void {
  if (typeof window === "undefined") return;

  try {
    if (user) {
      const userWithTimestamp = {
        ...user,
        _storedAt: Date.now(),
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithTimestamp));
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error("Error storing user data to localStorage:", error);
  }
}

export function clearAllStoredData(): void {
  if (typeof window === "undefined") return;

  if (typeof window !== "undefined") {
    localStorage.removeItem(MENU_STORAGE_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}
