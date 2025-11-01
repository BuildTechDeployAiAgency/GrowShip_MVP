export interface Distributor {
  id: string;
  name: string;
  slug: string;
  organization_type: "distributor";
  parent_organization_id: string | null;
  is_active: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields from joins
  user_count?: number;
  sales_report_count?: number;
}

export interface DistributorStats {
  active: number;
  inactive: number;
  totalUsers: number;
  totalSalesReports: number;
}

export interface DistributorFilters {
  status: "all" | "active" | "inactive";
}
