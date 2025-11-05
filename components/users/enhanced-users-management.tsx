"use client";

import { useState, useEffect } from "react";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { createClient } from "@/lib/supabase/client";
import { UserProfile, Organization, UserMembership } from "@/types/auth";
import {
  createPermissionChecker,
  getRoleDisplayName,
  isAdminLevel,
} from "@/lib/permissions";
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
  Shield,
  Globe,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface UserWithMembership extends UserProfile {
  memberships?: UserMembership[];
  organization?: Organization;
}

interface UserFilters {
  role: string;
  status: string;
  organization: string;
  roleType: string;
}

export function EnhancedUsersManagement() {
  const {
    user,
    profile,
    organizations,
    currentOrganization,
    canManageUser,
    canPerformAction,
    getAccessibleOrganizations,
  } = useEnhancedAuth();

  const [users, setUsers] = useState<UserWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<UserFilters>({
    role: "all",
    status: "all",
    organization: "all",
    roleType: "all",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithMembership | null>(
    null
  );
  const [showUserDetails, setShowUserDetails] = useState(false);

  const supabase = createClient();

  // Check if user can manage users
  if (!canPerformAction("manage_users")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Access Denied
            </CardTitle>
            <CardDescription className="text-center">
              You don&apos;t have permission to manage users.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, [searchTerm, filters, currentOrganization]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      let query = supabase.from("user_profiles").select(`
          *,
          user_memberships!inner(
            id,
            brand_id,
            role_name,
            is_active,
            organizations!inner(
              id,
              name,
              organization_type
            )
          )
        `);

      // Apply organization filter based on user's access level
      if (currentOrganization && !canPerformAction("view_all_users")) {
        query = query.eq(
          "user_memberships.brand_id",
          currentOrganization.id
        );
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(
          `contact_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`
        );
      }

      // Apply role filter
      if (filters.role !== "all") {
        query = query.eq("role_name", filters.role);
      }

      // Apply status filter
      if (filters.status !== "all") {
        query = query.eq("user_status", filters.status);
      }

      // Apply role type filter
      if (filters.roleType !== "all") {
        query = query.eq("role_type", filters.roleType);
      }

      // Apply organization filter
      if (filters.organization !== "all") {
        query = query.eq(
          "user_memberships.brand_id",
          filters.organization
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading users:", error);
        toast.error("Failed to load users");
        return;
      }

      // Transform data to include organization info
      const usersWithMemberships: UserWithMembership[] = (data || []).map(
        (user: any) => ({
          ...user,
          organization: user.user_memberships?.[0]?.organizations,
          memberships: user.user_memberships || [],
        })
      );

      setUsers(usersWithMemberships);
    } catch (error) {
      console.error("Error in loadUsers:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ user_status: newStatus })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`User status updated to ${newStatus}`);
      loadUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast.success("User deleted successfully");
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const userStats = {
    total: filteredUsers.length,
    active: filteredUsers.filter((u) => u.user_status === "approved").length,
    pending: filteredUsers.filter((u) => u.user_status === "pending").length,
    suspended: filteredUsers.filter((u) => u.user_status === "suspended")
      .length,
  };

  const getRoleBadgeVariant = (roleName: string) => {
    if (roleName === "super_admin") return "destructive";
    if (roleName.includes("_admin")) return "default";
    if (roleName.includes("_finance")) return "secondary";
    if (roleName.includes("_manager")) return "outline";
    return "outline";
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage users in{" "}
                {currentOrganization?.name || "your organization"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowInviteDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {userStats.active}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {userStats.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {userStats.suspended}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, email, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={filters.role}
                  onValueChange={(value) =>
                    setFilters({ ...filters, role: value })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="brand_admin">Brand Admin</SelectItem>
                    <SelectItem value="brand_finance">Brand Finance</SelectItem>
                    <SelectItem value="brand_manager">Brand Manager</SelectItem>
                    <SelectItem value="brand_user">Brand User</SelectItem>
                    <SelectItem value="distributor_admin">
                      Distributor Admin
                    </SelectItem>
                    <SelectItem value="distributor_finance">
                      Distributor Finance
                    </SelectItem>
                    <SelectItem value="distributor_manager">
                      Distributor Manager
                    </SelectItem>
                    <SelectItem value="distributor_user">
                      Distributor User
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

                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.roleType}
                  onValueChange={(value) =>
                    setFilters({ ...filters, roleType: value })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="brand">Brand</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  </SelectContent>
                </Select>

                {canPerformAction("view_all_users") && (
                  <Select
                    value={filters.organization}
                    onValueChange={(value) =>
                      setFilters({ ...filters, organization: value })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {getAccessibleOrganizations().map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.organization_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-r-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-l-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Users Table/Grid */}
        <Card>
          <CardContent className="p-0">
            {viewMode === "list" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.contact_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.contact_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role_name)}>
                          {getRoleDisplayName(user.role_name)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {user.organization && (
                            <>
                              {user.organization.organization_type ===
                                "brand" && (
                                <Shield className="h-4 w-4 text-blue-500" />
                              )}
                              {user.organization.organization_type ===
                                "distributor" && (
                                <Globe className="h-4 w-4 text-green-500" />
                              )}
                              {user.organization.organization_type ===
                                "manufacturer" && (
                                <Building2 className="h-4 w-4 text-purple-500" />
                              )}
                              <span className="text-sm">
                                {user.organization.name}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(user.user_status)}
                        >
                          {user.user_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserDetails(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canManageUser(
                              user.role_name,
                              user.brand_id
                            ) && (
                              <>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.user_status === "approved" ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUserStatusUpdate(
                                        user.id,
                                        "suspended"
                                      )
                                    }
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Suspend User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUserStatusUpdate(
                                        user.id,
                                        "approved"
                                      )
                                    }
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Approve User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filteredUsers.map((user) => (
                  <Card
                    key={user.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.contact_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.contact_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserDetails(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canManageUser(
                              user.role_name,
                              user.brand_id
                            ) && (
                              <>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.user_status === "approved" ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUserStatusUpdate(
                                        user.id,
                                        "suspended"
                                      )
                                    }
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Suspend User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUserStatusUpdate(
                                        user.id,
                                        "approved"
                                      )
                                    }
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Approve User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Role</span>
                          <Badge variant={getRoleBadgeVariant(user.role_name)}>
                            {getRoleDisplayName(user.role_name)}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Status</span>
                          <Badge
                            variant={getStatusBadgeVariant(user.user_status)}
                          >
                            {user.user_status}
                          </Badge>
                        </div>

                        {user.organization && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              Organization
                            </span>
                            <div className="flex items-center space-x-1">
                              {user.organization.organization_type ===
                                "brand" && (
                                <Shield className="h-3 w-3 text-blue-500" />
                              )}
                              {user.organization.organization_type ===
                                "distributor" && (
                                <Globe className="h-3 w-3 text-green-500" />
                              )}
                              {user.organization.organization_type ===
                                "manufacturer" && (
                                <Building2 className="h-3 w-3 text-purple-500" />
                              )}
                              <span className="text-sm">
                                {user.organization.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                View detailed information about this user
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Name
                    </label>
                    <p className="text-sm">{selectedUser.contact_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Email
                    </label>
                    <p className="text-sm">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Company
                    </label>
                    <p className="text-sm">{selectedUser.company_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Role
                    </label>
                    <p className="text-sm">
                      <Badge
                        variant={getRoleBadgeVariant(selectedUser.role_name)}
                      >
                        {getRoleDisplayName(selectedUser.role_name)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Status
                    </label>
                    <p className="text-sm">
                      <Badge
                        variant={getStatusBadgeVariant(
                          selectedUser.user_status
                        )}
                      >
                        {selectedUser.user_status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Organization
                    </label>
                    <p className="text-sm">
                      {selectedUser.organization?.name || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
