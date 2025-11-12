"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Mail,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Shield,
  AlertCircle,
  Users,
  Building,
  Filter,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserProfile, UserStatus } from "@/types/auth";
import { EditUserDialog } from "./edit-user-dialog";

interface UsersListProps {
  searchTerm: string;
  filters: {
    role: string;
    status: string;
    company: string;
    organization?: string;
  };
  viewMode?: "grid" | "list";
  users: UserProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  isSuperAdmin?: boolean;
  onResetPassword?: (userId: string) => Promise<void> | void;
  passwordResettingUserId?: string | null;
}

export function UsersList({
  searchTerm,
  filters,
  viewMode = "list",
  users,
  loading,
  error,
  refetch,
  updateUserStatus,
  deleteUser,
  isSuperAdmin = false,
  onResetPassword,
  passwordResettingUserId,
}: UsersListProps) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getRoleBadgeVariant = (roleName: string) => {
    if (roleName.includes("admin")) return "default";
    if (roleName.includes("finance")) return "secondary";
    if (roleName.includes("manager")) return "outline";
    return "secondary";
  };

  const getStatusBadge = (user: UserProfile) => {
    switch (user.user_status) {
      case "approved":
        return (
          <Badge
            variant="default"
            className="bg-green-500 text-white text-xs px-2 py-1 rounded-full"
          >
            <UserCheck className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "suspended":
        return (
          <Badge
            variant="destructive"
            className="bg-red-500 text-white text-xs px-2 py-1 rounded-full"
          >
            <UserX className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full"
          >
            Unknown
          </Badge>
        );
    }
  };

  const formatOrganizationType = (type?: string | null) => {
    if (!type) return null;
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getPrimaryOrganization = (user: UserProfile) => {
    if (user.brand_name) {
      return {
        name: user.brand_name,
        type: user.organization_type || null,
      };
    }

    const memberships = user.memberships || [];
    const activeMembership =
      memberships.find((membership) => membership.is_active) || memberships[0];

    if (activeMembership?.brand) {
      return {
        name: activeMembership.brand.name,
        type: activeMembership.brand.organization_type || null,
      };
    }

    return null;
  };

  const getAdditionalOrganizationsCount = (user: UserProfile) => {
    const memberships = user.memberships || [];
    if (memberships.length <= 1) {
      return 0;
    }
    return memberships.length - 1;
  };

  const handleUserAction = async (action: string, userId: string) => {
    try {
      setActionLoading(action + userId);

      switch (action) {
        case "edit":
          const userToEdit = users.find((u) => u.user_id === userId);
          if (userToEdit) {
            setEditingUser(userToEdit);
            setShowEditDialog(true);
          }
          setActionLoading(null);
          return;

        case "approve":
          await updateUserStatus(userId, "approved");
          break;

        case "suspend":
          await updateUserStatus(userId, "suspended");
          break;

        case "delete":
          const userForDelete = users.find((u) => u.user_id === userId);
          if (userForDelete) {
            setUserToDelete(userForDelete);
            setShowDeleteDialog(true);
          }
          setActionLoading(null);
          return;
      }
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setActionLoading(`delete${userToDelete.user_id}`);
      await deleteUser(userToDelete.user_id);
      setShowDeleteDialog(false);
      setUserToDelete(null);
    } catch (err) {
      console.error("Error deleting user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-gray-600">Loading users...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-8">
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-red-500 mb-4">
              <AlertCircle className="h-full w-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error Loading Users
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-600" />
            <span>Users</span>
            <Badge variant="secondary" className="text-xs">
              {users.length} {users.length === 1 ? "user" : "users"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {users.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
              <Users className="h-full w-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No users found
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              {searchTerm ||
              filters.role !== "all" ||
              filters.status !== "all" ||
              filters.company !== "all" ||
              (filters.organization && filters.organization !== "all")
                ? "Try adjusting your search or filters to find users"
                : "Get started by inviting your first user to the platform"}
            </p>
            {(searchTerm ||
              filters.role !== "all" ||
              filters.status !== "all" ||
              filters.company !== "all" ||
              (filters.organization && filters.organization !== "all")) && (
              <Button variant="outline" onClick={() => {}} className="gap-2">
                <Filter className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        ) : viewMode === "list" ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const primaryOrganization = getPrimaryOrganization(user);
                const additionalOrganizations =
                  getAdditionalOrganizationsCount(user);
                const organizationTypeLabel = formatOrganizationType(
                  primaryOrganization?.type || null
                );
                const isPasswordResetting =
                  passwordResettingUserId === user.user_id;

                return (
                  <TableRow key={user.id} className="group">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                          {user.contact_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user.contact_name || "Unknown User"}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getRoleBadgeVariant(user.role_name)}
                      className="text-xs font-medium"
                    >
                      {user.role_name
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.company_name ? (
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Building className="h-3 w-3 text-gray-500" />
                        <span className="truncate">{user.company_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                      {primaryOrganization ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-xs font-medium"
                          >
                            {primaryOrganization.name}
                          </Badge>
                          {organizationTypeLabel && (
                            <span className="text-xs text-gray-500">
                              {organizationTypeLabel}
                            </span>
                          )}
                          {additionalOrganizations > 0 && (
                            <span className="text-xs text-gray-400">
                              +{additionalOrganizations} more
                            </span>
                          )}
                        </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="text-xs text-gray-500">
                          User Actions
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleUserAction("edit", user.user_id)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit User
                        </DropdownMenuItem>

                        {user.user_status !== "approved" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUserAction("approve", user.user_id)
                            }
                            className="gap-2 text-green-700 focus:text-green-700"
                            disabled={
                              actionLoading === `approve${user.user_id}`
                            }
                          >
                            <UserCheck className="h-4 w-4" />
                            Approve Access
                          </DropdownMenuItem>
                        )}

                        {user.user_status !== "suspended" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUserAction("suspend", user.user_id)
                            }
                            className="gap-2 text-orange-700 focus:text-orange-700"
                            disabled={
                              actionLoading === `suspend${user.user_id}`
                            }
                          >
                            <UserX className="h-4 w-4" />
                            Suspend User
                          </DropdownMenuItem>
                        )}

                        {isSuperAdmin && onResetPassword && (
                          <DropdownMenuItem
                            onClick={() => onResetPassword(user.user_id)}
                            className="gap-2"
                            disabled={isPasswordResetting}
                          >
                            <KeyRound className="h-4 w-4" />
                            {isPasswordResetting
                              ? "Sending reset link..."
                              : "Send Password Reset"}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() =>
                            handleUserAction("delete", user.user_id)
                          }
                          className="gap-2 text-red-600 focus:text-red-600"
                          disabled={actionLoading === `delete${user.user_id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {users.map((user) => {
              const primaryOrganization = getPrimaryOrganization(user);
              const additionalOrganizations =
                getAdditionalOrganizationsCount(user);
              const organizationTypeLabel = formatOrganizationType(
                primaryOrganization?.type || null
              );
              const isPasswordResetting =
                passwordResettingUserId === user.user_id;

              return (
                <Card
                  key={user.id}
                  className="hover:shadow-lg transition-all duration-200 group border-gray-200"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative">
                        <Avatar className="h-20 w-20 ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                            {user.contact_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="space-y-2 w-full">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {user.contact_name || "Unknown User"}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {user.email}
                        </p>
                      </div>

                      <div className="w-full space-y-3">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Badge
                            variant={getRoleBadgeVariant(user.role_name)}
                            className="text-xs font-medium"
                          >
                            {user.role_name
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                          {getStatusBadge(user)}
                        </div>

                        {user.company_name && (
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                            <Building className="h-3 w-3" />
                            <span className="truncate">{user.company_name}</span>
                          </div>
                        )}

                        {primaryOrganization && (
                          <div className="flex items-center justify-center gap-2 text-xs text-gray-600 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {primaryOrganization.name}
                            </Badge>
                            {organizationTypeLabel && (
                              <span className="text-[11px] text-gray-500">
                                {organizationTypeLabel}
                              </span>
                            )}
                            {additionalOrganizations > 0 && (
                              <span className="text-[11px] text-gray-400">
                                +{additionalOrganizations} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          Joined{" "}
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="w-full pt-4 border-t border-gray-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-52">
                            <DropdownMenuLabel className="text-xs text-gray-500">
                              User Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() =>
                                handleUserAction("edit", user.user_id)
                              }
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>

                            {user.user_status !== "approved" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUserAction("approve", user.user_id)
                                }
                                className="gap-2 text-green-700 focus:text-green-700"
                                disabled={
                                  actionLoading === `approve${user.user_id}`
                                }
                              >
                                <UserCheck className="h-4 w-4" />
                                Approve Access
                              </DropdownMenuItem>
                            )}

                            {user.user_status !== "suspended" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUserAction("suspend", user.user_id)
                                }
                                className="gap-2 text-orange-700 focus:text-orange-700"
                                disabled={
                                  actionLoading === `suspend${user.user_id}`
                                }
                              >
                                <UserX className="h-4 w-4" />
                                Suspend User
                              </DropdownMenuItem>
                            )}

                            {isSuperAdmin && onResetPassword && (
                              <DropdownMenuItem
                                onClick={() => onResetPassword(user.user_id)}
                                className="gap-2"
                                disabled={isPasswordResetting}
                              >
                                <KeyRound className="h-4 w-4" />
                                {isPasswordResetting
                                  ? "Sending reset link..."
                                  : "Send Password Reset"}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() =>
                                handleUserAction("delete", user.user_id)
                              }
                              className="gap-2 text-red-600 focus:text-red-600"
                              disabled={
                                actionLoading === `delete${user.user_id}`
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Edit User Dialog */}
      <EditUserDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={editingUser}
        onUserUpdated={refetch}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">
                  {userToDelete?.contact_name || userToDelete?.email}
                </span>
                ?
              </p>
              <p className="text-red-600 font-medium">
                This action cannot be undone. All user data will be permanently
                removed from the system.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setUserToDelete(null);
              }}
              disabled={actionLoading === `delete${userToDelete?.user_id}`}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={actionLoading === `delete${userToDelete?.user_id}`}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {actionLoading === `delete${userToDelete?.user_id}`
                ? "Deleting..."
                : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
