import { LucideIcon } from "lucide-react";

// Database table types based on your ERD
export interface Role {
  id: string;
  role_name: string;
  role_description: string | null;
  role_type: string;
  permission_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SidebarMenu {
  id: string;
  parent_id: string | null;
  menu_label: string;
  menu_icon: string;
  route_path: string;
  menu_order: number;
  is_active: boolean;
  requires_permission: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleMenuPermission {
  id: string;
  role_id: string;
  menu_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  created_at: string;
}

// Extended menu item with permissions and icon component
export interface MenuItem extends SidebarMenu {
  // Icon is optional because server responses strip functions before crossing to the client
  icon?: LucideIcon;
  permissions?: RoleMenuPermission;
  children?: MenuItem[];
}

// Menu permission levels
export type PermissionLevel = "view" | "edit" | "delete" | "approve";

// Hook return type
export interface UseMenuPermissionsReturn {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  hasPermission: (menuId: string, permission: PermissionLevel) => boolean;
}
