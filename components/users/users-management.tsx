"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  Download,
  MoreHorizontal,
  Grid3X3,
  List,
  ChevronDown,
  Check,
  Building2,
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
import { UsersList } from "@/components/users/users-list";
import { CustomersList } from "@/components/customers/customers-list";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import { InviteDistributorDialog } from "@/components/users/invite-distributor-dialog";
import { InviteCustomerDialog } from "@/components/customers/invite-customer-dialog";
import { ExportUsersDialog } from "@/components/users/export-users-dialog";
import { ExportCustomersDialog } from "@/components/customers/export-customers-dialog";
import { useUsers } from "@/hooks/use-users";
import { useCustomers } from "@/hooks/use-customers";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { MainLayout } from "@/components/layout/main-layout";
import { useOrganizations } from "@/hooks/use-organizations";
import { toast } from "react-toastify";

type TabType = "users" | "customers";

export function UsersManagement() {
  const { currentOrganization, profile, profileLoading } = useEnhancedAuth();
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showInviteDistributorDialog, setShowInviteDistributorDialog] =
    useState(false);
  const [showInviteCustomerDialog, setShowInviteCustomerDialog] =
    useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [passwordResettingUserId, setPasswordResettingUserId] = useState<
    string | null
  >(null);

  // Users filters
  const [usersFilters, setUsersFilters] = useState({
    role: "all",
    status: "all",
    company: "all",
    organization: "all",
  });

  // Customers filters
  const [customersFilters, setCustomersFilters] = useState({
    status: "all",
    company: "all",
  });

  // Fetch users data
  // Super admins should see all users (brandId = undefined), brand admins see only their brand
  const isSuperAdmin = profile?.role_name === "super_admin";
  
  // Debug logging
  useEffect(() => {
    if (profile) {
      console.log("[UsersManagement] Profile loaded:", {
        userId: profile.user_id,
        role_name: profile.role_name,
        role_type: profile.role_type,
        brand_id: profile.brand_id,
        isSuperAdmin,
        profileLoading,
      });
    }
  }, [profile, isSuperAdmin, profileLoading]);
  
  const { organizations: allOrganizations, loading: organizationsLoading } =
    useOrganizations({ enabled: isSuperAdmin });
  const organizationMap = useMemo(() => {
    return new Map(allOrganizations.map((org) => [org.id, org]));
  }, [allOrganizations]);

  const {
    totalCount: usersTotalCount,
    users,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
    updateUserStatus,
    deleteUser,
  } = useUsers({
    searchTerm,
    filters: usersFilters,
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    isSuperAdmin: isSuperAdmin, // Pass explicit flag
    enabled: !profileLoading, // Wait for profile to load
  });

  // Fetch customers data
  // Super admins should see all customers (brandId = undefined), brand admins see only their brand
  const {
    totalCount: customersTotalCount,
    customers,
    loading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
    updateCustomerStatus,
    deleteCustomer,
  } = useCustomers({
    searchTerm,
    filters: customersFilters,
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    isSuperAdmin: isSuperAdmin, // Pass explicit flag
    enabled: !profileLoading, // Wait for profile to load
  });

  const usersStatusCounts = users.reduce((acc, user) => {
    acc[user.user_status] = (acc[user.user_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const customersStatusCounts = customers.reduce((acc, customer) => {
    acc[customer.user_status] = (acc[customer.user_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleResetPassword = async (userId: string) => {
    if (!isSuperAdmin || !userId) {
      return;
    }

    try {
      setPasswordResettingUserId(userId);
      const response = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to trigger password reset.");
      }

      toast.success(
        result?.message || "Password reset email has been sent successfully."
      );
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      toast.error(
        error?.message ||
          "Unable to send password reset email. Please try again."
      );
    } finally {
      setPasswordResettingUserId(null);
    }
  };

  const activeFiltersCount =
    activeTab === "users"
      ? [
          usersFilters.role,
          usersFilters.status,
          usersFilters.company,
          usersFilters.organization,
        ].filter((f) => f !== "all").length
      : [customersFilters.status, customersFilters.company].filter(
          (f) => f !== "all"
        ).length;

  // Get current data based on active tab
  const currentData =
    activeTab === "users"
      ? {
          totalCount: usersTotalCount,
          data: users,
          loading: usersLoading,
          error: usersError,
          refetch: refetchUsers,
          statusCounts: usersStatusCounts,
        }
      : {
          totalCount: customersTotalCount,
          data: customers,
          loading: customersLoading,
          error: customersError,
          refetch: refetchCustomers,
          statusCounts: customersStatusCounts,
        };

  const headerActions = (
    <>
      {activeTab === "users" ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInviteDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Invite User</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInviteDistributorDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Invite Distributor</span>
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInviteCustomerDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Customer</span>
        </Button>
      )}

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
          <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
            <Download className="mr-2 h-4 w-4" />
            {activeTab === "users" ? "Export Users" : "Export Customers"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <MainLayout
      pageTitle="User Management"
      pageSubtitle="Manage users, customers, and permissions"
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Pending Approvals Banner - Show for super admins and brand admins */}
        {(isSuperAdmin || profile?.role_name === "brand_admin") && 
         currentData.statusCounts.pending > 0 && activeTab === "users" && (
          <Card className="border-l-4 border-yellow-500 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-900">
                    {currentData.statusCounts.pending} User{currentData.statusCounts.pending > 1 ? "s" : ""} Awaiting Approval
                  </h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    {isSuperAdmin 
                      ? "As a super admin, you can approve users from all brands."
                      : "Review and approve pending users for your brand."}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setUsersFilters({ ...usersFilters, status: "pending" })}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Review Pending Users
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs Section */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-0">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                  activeTab === "users"
                    ? "border-teal-500 text-teal-600 bg-teal-50/50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="font-semibold">Team Members</span>
                <Badge
                  variant={activeTab === "users" ? "default" : "secondary"}
                  className={`ml-2 ${
                    activeTab === "users" ? "bg-teal-600" : ""
                  }`}
                >
                  {usersTotalCount}
                </Badge>
              </button>
              <button
                onClick={() => setActiveTab("customers")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                  activeTab === "customers"
                    ? "border-teal-500 text-teal-600 bg-teal-50/50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span className="font-semibold">Customers</span>
                <Badge
                  variant={activeTab === "customers" ? "default" : "secondary"}
                  className={`ml-2 ${
                    activeTab === "customers" ? "bg-teal-600" : ""
                  }`}
                >
                  {customersTotalCount}
                </Badge>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    {activeTab === "users" ? "Total Team" : "Total Customers"}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {currentData.totalCount}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0 ml-2">
                  {activeTab === "users" ? (
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  ) : (
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    {activeTab === "users" ? "Approved" : "Active"}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                    {currentData.statusCounts.approved || 0}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0 ml-2">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Pending
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">
                    {currentData.statusCounts.pending || 0}
                  </p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0 ml-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Suspended
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
                    {currentData.statusCounts.suspended || 0}
                  </p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg flex-shrink-0 ml-2">
                  <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex md:flex-row flex-col gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={
                    activeTab === "users"
                      ? "Search users..."
                      : "Search customers..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 sm:h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="hidden sm:flex items-center border border-gray-200 rounded-lg p-1">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-8 w-8 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-8 w-8 p-0"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>

                {activeTab === "users" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 sm:gap-2 h-10 sm:h-11 px-2 sm:px-4 flex-1 sm:flex-none"
                      >
                        <Filter className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">Role</span>
                        {usersFilters.role !== "all" && (
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
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({ ...usersFilters, role: "all" })
                        }
                        className="flex items-center justify-between"
                      >
                        All Roles
                        {usersFilters.role === "all" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "brand_admin",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Brand Admin
                        {usersFilters.role === "brand_admin" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "brand_finance",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Brand Finance
                        {usersFilters.role === "brand_finance" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "brand_operations",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Brand Operations
                        {usersFilters.role === "brand_operations" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "brand_viewer",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Brand Viewer
                        {usersFilters.role === "brand_viewer" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "distributor_admin",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Distributor Admin
                        {usersFilters.role === "distributor_admin" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "distributor_finance",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Distributor Finance
                        {usersFilters.role === "distributor_finance" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "distributor_manager",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Distributor Manager
                        {usersFilters.role === "distributor_manager" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "manufacturer_admin",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Manufacturer Admin
                        {usersFilters.role === "manufacturer_admin" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "manufacturer_finance",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Manufacturer Finance
                        {usersFilters.role === "manufacturer_finance" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            role: "manufacturer_manager",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        Manufacturer Manager
                        {usersFilters.role === "manufacturer_manager" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {activeTab === "users" && isSuperAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 sm:gap-2 h-10 sm:h-11 px-2 sm:px-4 flex-1 sm:flex-none"
                      >
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">Organization</span>
                        {usersFilters.organization !== "all" && (
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
                    <DropdownMenuContent
                      align="end"
                      className="w-64 max-h-72 overflow-y-auto"
                    >
                      <DropdownMenuLabel>
                        Filter by Organization
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setUsersFilters({
                            ...usersFilters,
                            organization: "all",
                          })
                        }
                        className="flex items-center justify-between"
                      >
                        All Organizations
                        {usersFilters.organization === "all" && (
                          <Check className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {organizationsLoading && (
                        <DropdownMenuItem disabled className="text-gray-500">
                          Loading organizations...
                        </DropdownMenuItem>
                      )}
                      {!organizationsLoading &&
                        allOrganizations.map((organization) => (
                          <DropdownMenuItem
                            key={organization.id}
                            onClick={() =>
                              setUsersFilters({
                                ...usersFilters,
                                organization: organization.id,
                              })
                            }
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{organization.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {organization.organization_type
                                  ?.replace(/_/g, " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase()) ||
                                  "Brand"}
                              </Badge>
                              {usersFilters.organization === organization.id && (
                                <Check className="h-4 w-4" />
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 sm:gap-2 h-10 sm:h-11 px-2 sm:px-4 flex-1 sm:flex-none"
                    >
                      <Filter className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">Status</span>
                      {((activeTab === "users" &&
                        usersFilters.status !== "all") ||
                        (activeTab === "customers" &&
                          customersFilters.status !== "all")) && (
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
                      onClick={() =>
                        activeTab === "users"
                          ? setUsersFilters({ ...usersFilters, status: "all" })
                          : setCustomersFilters({
                              ...customersFilters,
                              status: "all",
                            })
                      }
                      className="flex items-center justify-between"
                    >
                      All Status
                      {((activeTab === "users" &&
                        usersFilters.status === "all") ||
                        (activeTab === "customers" &&
                          customersFilters.status === "all")) && (
                        <Check className="h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        activeTab === "users"
                          ? setUsersFilters({
                              ...usersFilters,
                              status: "approved",
                            })
                          : setCustomersFilters({
                              ...customersFilters,
                              status: "approved",
                            })
                      }
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {activeTab === "users" ? "Approved" : "Active"}
                      </div>
                      {((activeTab === "users" &&
                        usersFilters.status === "approved") ||
                        (activeTab === "customers" &&
                          customersFilters.status === "approved")) && (
                        <Check className="h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        activeTab === "users"
                          ? setUsersFilters({
                              ...usersFilters,
                              status: "pending",
                            })
                          : setCustomersFilters({
                              ...customersFilters,
                              status: "pending",
                            })
                      }
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Pending
                      </div>
                      {((activeTab === "users" &&
                        usersFilters.status === "pending") ||
                        (activeTab === "customers" &&
                          customersFilters.status === "pending")) && (
                        <Check className="h-4 w-4" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        activeTab === "users"
                          ? setUsersFilters({
                              ...usersFilters,
                              status: "suspended",
                            })
                          : setCustomersFilters({
                              ...customersFilters,
                              status: "suspended",
                            })
                      }
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Suspended
                      </div>
                      {((activeTab === "users" &&
                        usersFilters.status === "suspended") ||
                        (activeTab === "customers" &&
                          customersFilters.status === "suspended")) && (
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
                  {activeTab === "users" && usersFilters.role !== "all" && (
                    <Badge variant="outline" className="text-xs">
                      Role:{" "}
                      {usersFilters.role
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  )}
                  {activeTab === "users" && usersFilters.status !== "all" && (
                    <Badge variant="outline" className="text-xs">
                      Status:{" "}
                      {usersFilters.status.charAt(0).toUpperCase() +
                        usersFilters.status.slice(1)}
                    </Badge>
                  )}
                  {activeTab === "users" &&
                    usersFilters.organization !== "all" && (
                      <Badge variant="outline" className="text-xs">
                        Org:{" "}
                        {organizationMap.get(usersFilters.organization)?.name ||
                          "Unknown"}
                      </Badge>
                    )}
                  {activeTab === "customers" &&
                    customersFilters.status !== "all" && (
                      <Badge variant="outline" className="text-xs">
                        Status:{" "}
                        {customersFilters.status.charAt(0).toUpperCase() +
                          customersFilters.status.slice(1)}
                      </Badge>
                    )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      activeTab === "users"
                        ? setUsersFilters({
                            role: "all",
                            status: "all",
                            company: "all",
                            organization: "all",
                          })
                        : setCustomersFilters({ status: "all", company: "all" })
                    }
                    className="text-xs text-gray-500 hover:text-gray-700 h-7 px-2"
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {activeTab === "users" ? (
          <UsersList
            searchTerm={searchTerm}
            filters={usersFilters}
            viewMode={viewMode}
            users={users}
            loading={usersLoading}
            error={usersError}
            refetch={refetchUsers}
            updateUserStatus={updateUserStatus}
          deleteUser={deleteUser}
          isSuperAdmin={isSuperAdmin}
          onResetPassword={handleResetPassword}
          passwordResettingUserId={passwordResettingUserId}
          />
        ) : (
          <CustomersList
            searchTerm={searchTerm}
            filters={customersFilters}
            viewMode={viewMode}
            customers={customers}
            loading={customersLoading}
            error={customersError}
            refetch={refetchCustomers}
            updateCustomerStatus={updateCustomerStatus}
            deleteCustomer={deleteCustomer}
          />
        )}

        <InviteUserDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
        />

        <InviteDistributorDialog
          open={showInviteDistributorDialog}
          onOpenChange={setShowInviteDistributorDialog}
        />

        <InviteCustomerDialog
          open={showInviteCustomerDialog}
          onOpenChange={setShowInviteCustomerDialog}
        />

        {activeTab === "users" ? (
          <ExportUsersDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            users={users}
            totalCount={usersTotalCount}
          />
        ) : (
          <ExportCustomersDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            customers={customers}
            totalCount={customersTotalCount}
          />
        )}
      </div>
    </MainLayout>
  );
}
