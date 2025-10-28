"use client";

import { X, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface UserFiltersProps {
  filters: {
    role: string;
    status: string;
    company: string;
  };
  onFiltersChange: (filters: {
    role: string;
    status: string;
    company: string;
  }) => void;
  onClose: () => void;
  totalCount?: number;
  filteredCount?: number;
}

export function UserFilters({
  filters,
  onFiltersChange,
  onClose,
  totalCount = 0,
  filteredCount = 0,
}: UserFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      role: "all",
      status: "all",
      company: "all",
    });
  };

  const hasActiveFilters =
    filters.role !== "all" ||
    filters.status !== "all" ||
    filters.company !== "all";

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card className="w-full shadow-lg border border-gray-200 bg-white">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Filters
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {totalCount > 0 && (
          <div className="text-sm text-gray-600">
            Showing {filteredCount} of {totalCount} users
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {hasActiveFilters && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Active Filters
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs h-7 px-2 hover:bg-white"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.role !== "all" && (
                <Badge variant="outline" className="text-xs">
                  Role: {getRoleDisplayName(filters.role)}
                </Badge>
              )}
              {filters.status !== "all" && (
                <Badge
                  variant={getStatusBadgeVariant(filters.status)}
                  className="text-xs"
                >
                  Status: {getRoleDisplayName(filters.status)}
                </Badge>
              )}
              {filters.company !== "all" && (
                <Badge variant="outline" className="text-xs">
                  Company: {filters.company}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <Select
              value={filters.role}
              onValueChange={(value: string) =>
                handleFilterChange("role", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="brand_admin">Brand Admin</SelectItem>
                <SelectItem value="brand_finance">Brand Finance</SelectItem>
                <SelectItem value="brand_operations">
                  Brand Operations
                </SelectItem>
                <SelectItem value="brand_viewer">Brand Viewer</SelectItem>
                <SelectItem value="distributor_admin">
                  Distributor Admin
                </SelectItem>
                <SelectItem value="distributor_finance">
                  Distributor Finance
                </SelectItem>
                <SelectItem value="distributor_manager">
                  Distributor Manager
                </SelectItem>
                <SelectItem value="manufacturer_admin">
                  Manufacturer Admin
                </SelectItem>
                <SelectItem value="manufacturer_finance">
                  Manufacturer Finance
                </SelectItem>
                <SelectItem value="manufacturer_manager">
                  Manufacturer Manager
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select
              value={filters.status}
              onValueChange={(value: string) =>
                handleFilterChange("status", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Approved
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    Pending
                  </div>
                </SelectItem>
                <SelectItem value="suspended">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Suspended
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Company</label>
            <Input
              placeholder="Search by company name..."
              value={filters.company === "all" ? "" : filters.company}
              onChange={(e) =>
                handleFilterChange("company", e.target.value || "all")
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
