"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  UserPlus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  Users,
  ArrowUpDown,
  Download,
  Trash2,
  Activity,
} from "lucide-react";
import { useRelationships, useRelationshipStats } from "@/hooks/use-relationships";
import {
  BrandDistributorRelationshipDetailed,
  RelationshipFilters,
  RelationshipSort,
  RelationshipStatus,
  TerritoryPriority,
} from "@/types/relationships";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { cn } from "@/lib/utils";

interface RelationshipsListProps {
  onAssignDistributor?: () => void;
  onViewDetails?: (relationship: BrandDistributorRelationshipDetailed) => void;
  onEditRelationship?: (relationship: BrandDistributorRelationshipDetailed) => void;
}

export function RelationshipsList({
  onAssignDistributor,
  onViewDetails,
  onEditRelationship,
}: RelationshipsListProps) {
  const { profile } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedRelationships, setSelectedRelationships] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<RelationshipSort>({ field: "created_at", direction: "desc" });

  // Build filters
  const filters: RelationshipFilters = useMemo(() => {
    const baseFilters: RelationshipFilters = {};

    if (searchTerm) {
      baseFilters.search_term = searchTerm;
    }

    if (statusFilter !== "all") {
      baseFilters.status = [statusFilter as RelationshipStatus];
    }

    if (priorityFilter !== "all") {
      baseFilters.territory_priority = [priorityFilter as TerritoryPriority];
    }

    return baseFilters;
  }, [searchTerm, statusFilter, priorityFilter]);

  // Fetch data
  const {
    relationships,
    loading,
    error,
    total,
    totalPages,
    refetch,
    updateRelationship,
    bulkOperation,
  } = useRelationships({
    filters,
    sort,
    page,
    limit: 20,
  });

  const { data: statsData } = useRelationshipStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: RelationshipStatus) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "suspended":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "terminated":
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: RelationshipStatus) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-orange-100 text-orange-800";
      case "terminated":
        return "bg-red-100 text-red-800";
    }
  };

  const getPriorityIcon = (priority: TerritoryPriority) => {
    switch (priority) {
      case "primary":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "secondary":
        return <TrendingDown className="h-4 w-4 text-gray-600" />;
      case "shared":
        return <Users className="h-4 w-4 text-purple-600" />;
    }
  };

  const handleSort = (field: string) => {
    setSort(prev => ({
      field: field as any,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleStatusChange = async (
    relationship: BrandDistributorRelationshipDetailed,
    newStatus: RelationshipStatus,
    reason?: string
  ) => {
    try {
      await updateRelationship(relationship.id, {
        status: newStatus,
        ...(newStatus === "suspended" ? { suspended_reason: reason } : {}),
        ...(newStatus === "terminated" ? { termination_reason: reason } : {}),
      });
      refetch();
    } catch (error) {
      console.error("Error updating relationship status:", error);
    }
  };

  const handleBulkStatusChange = async (status: RelationshipStatus, reason?: string) => {
    if (!selectedRelationships.length) return;

    try {
      await bulkOperation({
        relationship_ids: selectedRelationships,
        operation: status === "active" ? "activate" : status === "suspended" ? "suspend" : "terminate",
        reason,
      });
      setSelectedRelationships([]);
      refetch();
    } catch (error) {
      console.error("Error performing bulk operation:", error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRelationships(relationships.map(r => r.id));
    } else {
      setSelectedRelationships([]);
    }
  };

  const handleSelectRelationship = (relationshipId: string, checked: boolean) => {
    if (checked) {
      setSelectedRelationships(prev => [...prev, relationshipId]);
    } else {
      setSelectedRelationships(prev => prev.filter(id => id !== relationshipId));
    }
  };

  const canManageRelationships = 
    profile?.role_name === "super_admin" || 
    profile?.role_name?.startsWith("brand_");

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Relationships</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.stats.total_relationships}</div>
              <p className="text-xs text-muted-foreground">
                {statsData.stats.active_relationships} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statsData.stats.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">
                {statsData.stats.total_orders} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statsData.stats.pending_relationships}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Contracts</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statsData.stats.expiring_contracts_count}
              </div>
              <p className="text-xs text-muted-foreground">
                Within 30 days
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Brand-Distributor Relationships
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage associations between brands and distributors
              </p>
            </div>
            {canManageRelationships && (
              <div className="flex gap-2">
                {selectedRelationships.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Bulk Actions ({selectedRelationships.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Bulk Operations</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBulkStatusChange("active")}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Activate Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange("suspended")}>
                        <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
                        Suspend Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange("terminated")}>
                        <XCircle className="mr-2 h-4 w-4 text-red-600" />
                        Terminate Selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button onClick={onAssignDistributor} className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Assign Distributor
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search brands, distributors, or territories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Relationships Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {canManageRelationships && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          relationships.length > 0 &&
                          selectedRelationships.length === relationships.length
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all relationships"
                      />
                    </TableHead>
                  )}
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("brand_name")}
                  >
                    <div className="flex items-center gap-1">
                      Brand
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("distributor_name")}
                  >
                    <div className="flex items-center gap-1">
                      Distributor
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Territories</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("total_revenue")}
                  >
                    <div className="flex items-center gap-1">
                      Revenue
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("total_orders")}
                  >
                    <div className="flex items-center gap-1">
                      Orders
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canManageRelationships ? 9 : 8} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                        <span className="ml-2">Loading relationships...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : relationships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageRelationships ? 9 : 8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        {searchTerm || statusFilter !== "all" || priorityFilter !== "all" ? (
                          <p>No relationships found matching your filters</p>
                        ) : (
                          <>
                            <p className="mb-2">No relationships created yet</p>
                            {canManageRelationships && (
                              <Button
                                variant="outline"
                                onClick={onAssignDistributor}
                                className="flex items-center gap-2"
                              >
                                <UserPlus className="h-4 w-4" />
                                Create First Relationship
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  relationships.map((relationship) => (
                    <TableRow key={relationship.id}>
                      {canManageRelationships && (
                        <TableCell>
                          <Checkbox
                            checked={selectedRelationships.includes(relationship.id)}
                            onCheckedChange={(checked) =>
                              handleSelectRelationship(relationship.id, checked as boolean)
                            }
                            aria-label={`Select relationship ${relationship.brand_name} - ${relationship.distributor_name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{relationship.brand_name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {relationship.brand_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{relationship.distributor_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {relationship.distributor_company}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(relationship.status)}
                          <Badge className={getStatusColor(relationship.status)}>
                            {relationship.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(relationship.territory_priority)}
                          <span className="capitalize">{relationship.territory_priority}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {relationship.assigned_territories?.length > 0 ? (
                            relationship.assigned_territories.slice(0, 2).map((territory, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {territory}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No territories</span>
                          )}
                          {relationship.assigned_territories?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{relationship.assigned_territories.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(relationship.total_revenue)}
                      </TableCell>
                      <TableCell>
                        {relationship.total_orders.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open relationship menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onViewDetails?.(relationship)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {canManageRelationships && (
                              <>
                                <DropdownMenuItem onClick={() => onEditRelationship?.(relationship)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Relationship
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {relationship.status === "pending" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(relationship, "active")}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {relationship.status === "active" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(relationship, "suspended")}
                                  >
                                    <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                {relationship.status === "suspended" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(relationship, "active")}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                    Reactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(relationship, "terminated")}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Terminate
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} relationships
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Territory Conflicts Alert */}
      {statsData?.territory_conflicts?.length > 0 && (
        <Card className="border-l-4 border-orange-500">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Territory Conflicts Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {statsData.territory_conflicts.length} territory conflicts found. Multiple distributors 
              have exclusive or overlapping territories.
            </p>
            <div className="space-y-2">
              {statsData.territory_conflicts.slice(0, 3).map((conflict: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                  <span className="font-medium">{conflict.territory}</span>
                  <span className="text-sm text-muted-foreground">
                    {conflict.conflicting_relationships.length} distributors
                  </span>
                </div>
              ))}
              {statsData.territory_conflicts.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  And {statsData.territory_conflicts.length - 3} more...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}