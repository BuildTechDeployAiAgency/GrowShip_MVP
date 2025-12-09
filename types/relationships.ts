// Brand-Distributor Relationship Management Types
// Comprehensive type definitions for relationship management system

export type RelationshipStatus = 
  | 'pending'      // Awaiting approval
  | 'active'       // Currently active relationship
  | 'suspended'    // Temporarily suspended
  | 'terminated';  // Permanently ended

export type TerritoryPriority = 
  | 'primary'      // Primary distributor for territory
  | 'secondary'    // Secondary/backup distributor
  | 'shared';      // Shared territory access

export type ChangeType = 
  | 'created'
  | 'updated' 
  | 'status_changed'
  | 'terminated';

export type ContractStatus = 
  | 'active'
  | 'expired'
  | 'expiring_soon';

export interface BrandDistributorRelationship {
  id: string;
  
  // Core relationship data
  brand_id: string;
  distributor_id: string;
  
  // Relationship metadata
  status: RelationshipStatus;
  territory_priority: TerritoryPriority;
  
  // Territory and business details
  assigned_territories: string[];
  commission_rate?: number;
  contract_start_date?: string;
  contract_end_date?: string;
  minimum_order_value?: number;
  credit_limit?: number;
  
  // Business terms
  payment_terms?: string;
  shipping_terms?: string;
  exclusive_territories: boolean;
  
  // Performance tracking
  total_revenue: number;
  total_orders: number;
  performance_rating?: number;
  
  // Approval and tracking
  approved_by?: string;
  approved_at?: string;
  suspended_reason?: string;
  termination_reason?: string;
  
  // Audit fields
  created_by?: string;
  created_at: string;
  updated_by?: string;
  updated_at: string;
}

export interface BrandDistributorRelationshipDetailed extends BrandDistributorRelationship {
  // Brand details
  brand_name: string;
  brand_slug: string;
  brand_type: string;
  
  // Distributor details
  distributor_name: string;
  distributor_company: string;
  distributor_email: string;
  distributor_primary_territory: string;
  distributor_territory_ids: string[];
  
  // Calculated fields
  average_order_value: number;
  relationship_age_days: number;
  contract_status: ContractStatus;
}

export interface RelationshipHistory {
  id: string;
  relationship_id: string;
  
  // Change tracking
  change_type: ChangeType;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  change_reason?: string;
  
  // Audit fields
  changed_by?: string;
  changed_at: string;
}

export interface CreateRelationshipData {
  brand_id: string;
  distributor_id: string;
  status?: RelationshipStatus;
  territory_priority?: TerritoryPriority;
  assigned_territories?: string[];
  commission_rate?: number;
  contract_start_date?: string;
  contract_end_date?: string;
  minimum_order_value?: number;
  credit_limit?: number;
  payment_terms?: string;
  shipping_terms?: string;
  exclusive_territories?: boolean;
  change_reason?: string;
}

export interface UpdateRelationshipData {
  status?: RelationshipStatus;
  territory_priority?: TerritoryPriority;
  assigned_territories?: string[];
  commission_rate?: number;
  contract_start_date?: string;
  contract_end_date?: string;
  minimum_order_value?: number;
  credit_limit?: number;
  payment_terms?: string;
  shipping_terms?: string;
  exclusive_territories?: boolean;
  performance_rating?: number;
  suspended_reason?: string;
  termination_reason?: string;
  change_reason?: string;
}

export interface RelationshipFilters {
  brand_ids?: string[];
  distributor_ids?: string[];
  status?: RelationshipStatus[];
  territory_priority?: TerritoryPriority[];
  assigned_territories?: string[];
  contract_status?: ContractStatus[];
  min_revenue?: number;
  max_revenue?: number;
  min_orders?: number;
  max_orders?: number;
  created_after?: string;
  created_before?: string;
  search_term?: string;
}

export interface RelationshipStats {
  total_relationships: number;
  active_relationships: number;
  pending_relationships: number;
  suspended_relationships: number;
  terminated_relationships: number;
  total_revenue: number;
  total_orders: number;
  average_performance_rating: number;
  expiring_contracts_count: number;
}

export interface TerritoryConflict {
  territory: string;
  conflicting_relationships: {
    id: string;
    brand_name: string;
    distributor_name: string;
    priority: TerritoryPriority;
    exclusive: boolean;
  }[];
}

export interface RelationshipBulkOperation {
  relationship_ids: string[];
  operation: 'activate' | 'suspend' | 'terminate' | 'update_territories' | 'update_commission';
  data?: Partial<UpdateRelationshipData>;
  reason?: string;
}

export interface RelationshipPerformanceMetrics {
  relationship_id: string;
  period_start: string;
  period_end: string;
  revenue: number;
  orders: number;
  average_order_value: number;
  growth_rate: number;
  performance_score: number;
  ranking: number;
}

export interface RelationshipApprovalRequest {
  id: string;
  relationship_id: string;
  requested_by: string;
  requested_at: string;
  approval_type: 'create' | 'modify' | 'terminate';
  proposed_changes: Record<string, any>;
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

// Form data interfaces for UI components
export interface RelationshipFormData {
  brand_id: string;
  distributor_id: string;
  status: RelationshipStatus;
  territory_priority: TerritoryPriority;
  assigned_territories: string[];
  commission_rate: string;
  contract_start_date: string;
  contract_end_date: string;
  minimum_order_value: string;
  credit_limit: string;
  payment_terms: string;
  shipping_terms: string;
  exclusive_territories: boolean;
  change_reason: string;
}

export interface AssignDistributorFormData {
  brand_id: string;
  distributor_ids: string[];
  territory_priority: TerritoryPriority;
  assigned_territories: string[];
  commission_rate: string;
  contract_start_date: string;
  contract_end_date: string;
  exclusive_territories: boolean;
  payment_terms: string;
  shipping_terms: string;
  justification: string;
}

// API Response interfaces
export interface RelationshipsResponse {
  data: BrandDistributorRelationshipDetailed[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface RelationshipStatsResponse {
  stats: RelationshipStats;
  territory_conflicts: TerritoryConflict[];
  expiring_contracts: BrandDistributorRelationshipDetailed[];
}

// Component props interfaces
export interface RelationshipActionsMenuProps {
  relationship: BrandDistributorRelationshipDetailed;
  onEdit: (relationship: BrandDistributorRelationshipDetailed) => void;
  onChangeStatus: (relationship: BrandDistributorRelationshipDetailed, status: RelationshipStatus, reason?: string) => void;
  onViewHistory: (relationship: BrandDistributorRelationshipDetailed) => void;
  onRefresh: () => void;
}

export interface RelationshipDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationship: BrandDistributorRelationshipDetailed | null;
  onEdit: (relationship: BrandDistributorRelationshipDetailed) => void;
  onSave: (updates: UpdateRelationshipData) => void;
}

export interface AssignDistributorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselected_brand?: string;
  preselected_distributors?: string[];
  onAssign: (data: CreateRelationshipData[]) => void;
}

export interface RelationshipsListProps {
  filters?: RelationshipFilters;
  onFilterChange?: (filters: RelationshipFilters) => void;
  selectable?: boolean;
  onSelectionChange?: (selected: string[]) => void;
  showBulkActions?: boolean;
}

// Hook return types
export interface UseRelationshipsResult {
  relationships: BrandDistributorRelationshipDetailed[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  refetch: () => void;
  createRelationship: (data: CreateRelationshipData) => Promise<void>;
  updateRelationship: (id: string, data: UpdateRelationshipData) => Promise<void>;
  deleteRelationship: (id: string, reason?: string) => Promise<void>;
  bulkOperation: (operation: RelationshipBulkOperation) => Promise<void>;
}

export interface UseRelationshipStatsResult {
  stats: RelationshipStats | null;
  territoryConflicts: TerritoryConflict[];
  expiringContracts: BrandDistributorRelationshipDetailed[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseRelationshipHistoryResult {
  history: RelationshipHistory[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Utility type exports
export type RelationshipSortField = 
  | 'brand_name'
  | 'distributor_name' 
  | 'status'
  | 'total_revenue'
  | 'total_orders'
  | 'performance_rating'
  | 'contract_end_date'
  | 'created_at';

export type SortDirection = 'asc' | 'desc';

export interface RelationshipSort {
  field: RelationshipSortField;
  direction: SortDirection;
}