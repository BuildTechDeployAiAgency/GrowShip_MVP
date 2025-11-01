"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Building2,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  MoreHorizontal,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DistributorsList } from "@/components/distributors/distributors-list";
import { CreateDistributorDialog } from "@/components/distributors/create-distributor-dialog";
import { useDistributors } from "@/hooks/use-distributors";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { MainLayout } from "@/components/layout/main-layout";

export function DistributorsManagement() {
  const { profile } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
  });

  // Fetch distributors data
  const {
    distributors,
    loading,
    error,
    refetch,
    totalCount,
    stats,
    updateDistributorStatus,
    deleteDistributor,
  } = useDistributors({
    searchTerm,
    filters,
    parentOrganizationId: profile?.organization_id,
  });

  const activeFiltersCount = filters.status !== "all" ? 1 : 0;

  const headerActions = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCreateDialog(true)}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Distributor</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Download className="mr-2 h-4 w-4" />
            Export Distributors
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <MainLayout
      pageTitle="Distributors"
      pageSubtitle="Manage distributor organizations and their data"
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Total Distributors
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {totalCount}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0 ml-2">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Active
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                    {stats.active || 0}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0 ml-2">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Total Users
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-1">
                    {stats.totalUsers || 0}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0 ml-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Inactive
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
                    {stats.inactive || 0}
                  </p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg flex-shrink-0 ml-2">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex md:flex-row flex-col gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search distributors by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 sm:h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 sm:gap-2 h-10 sm:h-11 px-2 sm:px-4 flex-1 sm:flex-none"
                    >
                      <Filter className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">Status</span>
                      {filters.status !== "all" && (
                        <Badge
                          variant="secondary"
                          className="ml-1 h-4 sm:h-5 px-1.5 sm:px-2 text-xs"
                        >
                          1
                        </Badge>
                      )}
                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setFilters({ ...filters, status: "all" })}
                      className="flex items-center justify-between"
                    >
                      All Status
                      {filters.status === "all" && (
                        <Check className="h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setFilters({ ...filters, status: "active" })
                      }
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Active
                      </div>
                      {filters.status === "active" && (
                        <Check className="h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setFilters({ ...filters, status: "inactive" })
                      }
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Inactive
                      </div>
                      {filters.status === "inactive" && (
                        <Check className="h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm text-gray-600">
                    Active filters:
                  </span>
                  {filters.status !== "all" && (
                    <Badge variant="outline" className="text-xs">
                      Status:{" "}
                      {filters.status.charAt(0).toUpperCase() +
                        filters.status.slice(1)}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ status: "all" })}
                    className="text-xs text-gray-500 hover:text-gray-700 h-7 px-2"
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distributors List */}
        <DistributorsList
          distributors={distributors}
          loading={loading}
          error={error}
          refetch={refetch}
          updateDistributorStatus={updateDistributorStatus}
          deleteDistributor={deleteDistributor}
        />

        {/* Create Distributor Dialog */}
        <CreateDistributorDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={refetch}
        />
      </div>
    </MainLayout>
  );
}
