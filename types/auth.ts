export type UserRole = "super_admin" | "brand" | "distributor" | "manufacturer";
export type UserRoleName =
  | "super_admin"
  | "brand_admin"
  | "brand_finance"
  | "brand_manager"
  | "brand_user"
  | "distributor_admin"
  | "distributor_finance"
  | "distributor_manager"
  | "distributor_user"
  | "manufacturer_admin"
  | "manufacturer_finance"
  | "manufacturer_manager";

export type UserStatus = "pending" | "approved" | "suspended";

export interface UserProfile {
  id: string;
  user_id: string;
  role_name: UserRoleName;
  role_type: UserRole;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  description?: string;
  avatar?: string;
  is_profile_complete: boolean;
  user_status: UserStatus;
  brand_id?: string;
  parent_brand_id?: string;
  created_at: string;
  updated_at: string;
}

// Brand interface (formerly Organization)
export interface Brand {
  id: string;
  name: string;
  slug: string;
  organization_type: "super_admin" | "brand" | "distributor" | "manufacturer";
  parent_organization_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Keep Organization as alias for backward compatibility during transition
export type Organization = Brand;

export interface UserMembership {
  id: string;
  user_id: string;
  brand_id: string;
  role_name: UserRoleName;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionLevel {
  level: number;
  name: string;
  description: string;
  can_access_all_brands: boolean;
  can_manage_users: boolean;
  can_manage_brands: boolean;
  can_view_financials: boolean;
  can_manage_products: boolean;
  can_manage_orders: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  profile?: UserProfile;
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<UserProfile, "id" | "user_id" | "created_at" | "updated_at">
        >;
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
    };
  };
}
