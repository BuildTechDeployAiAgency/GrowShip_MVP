"use client";

import { MenuItem } from "@/types/menu";
import { UserProfile } from "@/types/auth";
import { attachMenuIcons } from "@/lib/menu-icons";

// Remove icon functions before persisting to storage
function stripMenuIcons(menuItems: MenuItem[]): MenuItem[] {
  return menuItems.map(({ icon: _icon, children, ...item }) => ({
    ...item,
    children: children ? stripMenuIcons(children) : undefined,
  }));
}

// Safe localStorage wrapper to prevent SSR issues
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
    }
  },
  
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
    }
  },
};

const MENU_STORAGE_KEY = "growship_menu_data";
const PROFILE_STORAGE_KEY = "growship_user_profile";
const USER_STORAGE_KEY = "growship_user_data";
const LAST_PATH_STORAGE_PREFIX = "growship_last_path_";
const LAST_PATH_COOKIE_PREFIX = "growship_lp_";

export function getStoredMenuData(userId: string): MenuItem[] | null {
  try {
    const stored = safeLocalStorage.getItem(MENU_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const storedTime = data._storedAt;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (data.userId === userId && now - storedTime < maxAge) {
        return attachMenuIcons(data.menuItems);
      } else {
        safeLocalStorage.removeItem(MENU_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error("Error reading menu data from localStorage:", error);
    safeLocalStorage.removeItem(MENU_STORAGE_KEY);
  }

  return null;
}

export function setStoredMenuData(userId: string, menuItems: MenuItem[]): void {
  try {
    const sanitizedMenuItems = stripMenuIcons(menuItems);
    const dataWithTimestamp = {
      userId,
      menuItems: sanitizedMenuItems,
      _storedAt: Date.now(),
    };
    safeLocalStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(dataWithTimestamp));
  } catch (error) {
    console.error("Error storing menu data to localStorage:", error);
  }
}

export function clearStoredMenuData(): void {
  safeLocalStorage.removeItem(MENU_STORAGE_KEY);
}

export function getStoredProfile(): UserProfile | null {
  try {
    const stored = safeLocalStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      const profile = JSON.parse(stored);
      const storedTime = profile._storedAt;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - storedTime < maxAge) {
        return profile;
      } else {
        safeLocalStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error("Error reading profile from localStorage:", error);
    safeLocalStorage.removeItem(PROFILE_STORAGE_KEY);
  }

  return null;
}

export function setStoredProfile(profile: UserProfile | null): void {
  try {
    if (profile) {
      const profileWithTimestamp = {
        ...profile,
        _storedAt: Date.now(),
      };
      safeLocalStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify(profileWithTimestamp)
      );
    } else {
      safeLocalStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Error storing profile to localStorage:", error);
  }
}

export function getStoredUserData(): { id: string; email: string } | null {
  try {
    const stored = safeLocalStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      const storedTime = user._storedAt;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - storedTime < maxAge) {
        return { id: user.id, email: user.email };
      } else {
        safeLocalStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error("Error reading user data from localStorage:", error);
    safeLocalStorage.removeItem(USER_STORAGE_KEY);
  }

  return null;
}

export function setStoredUserData(
  user: { id: string; email: string } | null
): void {
  try {
    if (user) {
      const userWithTimestamp = {
        ...user,
        _storedAt: Date.now(),
      };
      safeLocalStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithTimestamp));
    } else {
      safeLocalStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Error storing user data to localStorage:", error);
  }
}

export function clearAllStoredData(): void {
  safeLocalStorage.removeItem(MENU_STORAGE_KEY);
  safeLocalStorage.removeItem(PROFILE_STORAGE_KEY);
  safeLocalStorage.removeItem(USER_STORAGE_KEY);
}

function buildLastPathKey(userId: string) {
  return `${LAST_PATH_STORAGE_PREFIX}${userId}`;
}

function buildLastPathCookieName(userId: string) {
  return `${LAST_PATH_COOKIE_PREFIX}${userId}`;
}

function setLastPathCookie(userId: string, path: string) {
  if (typeof document === "undefined") return;
  const encodedPath = encodeURIComponent(path);
  document.cookie = `${buildLastPathCookieName(
    userId
  )}=${encodedPath}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

function clearLastPathCookie(userId: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${buildLastPathCookieName(userId)}=; path=/; max-age=0`;
}

export function setLastVisitedPath(userId: string, path: string): void {
  safeLocalStorage.setItem(buildLastPathKey(userId), path);
  setLastPathCookie(userId, path);
}

export function getLastVisitedPath(userId: string): string | null {
  return safeLocalStorage.getItem(buildLastPathKey(userId));
}

export function clearLastVisitedPath(userId: string): void {
  safeLocalStorage.removeItem(buildLastPathKey(userId));
  clearLastPathCookie(userId);
}
