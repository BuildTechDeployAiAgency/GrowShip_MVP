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
  LucideIcon,
} from "lucide-react";

import { MenuItem } from "@/types/menu";

export const iconMap: Record<string, LucideIcon> = {
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
  Users2,
  Settings,
};

/**
 * Attach icon components to menu items based on their menu_icon name.
 * Keeps menu data plain for transport/storage and hydrates icons only on the client.
 */
export function attachMenuIcons(menuItems: MenuItem[]): MenuItem[] {
  return menuItems.map((item) => ({
    ...item,
    icon: iconMap[item.menu_icon] || LayoutDashboard,
    children: item.children ? attachMenuIcons(item.children) : undefined,
  }));
}
