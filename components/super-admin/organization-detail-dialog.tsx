"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  Users,
  Calendar,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Activity,
  Shield,
  Eye,
  AlertCircle,
} from "lucide-react";
import type { Brand } from "@/types/auth";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

interface OrganizationUser {
  id: string;
  email: string;
  contact_name: string;
  role_name: string;
  user_status: "pending" | "approved" | "suspended";
  created_at: string;
  last_login?: string;
}

interface OrganizationStats {
  total_users: number;
  active_users: number;
  pending_users: number;
  suspended_users: number;
}

interface OrganizationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Brand | null;
  onEdit?: (org: Brand) => void;
}

export function OrganizationDetailDialog({
  open,
  onOpenChange,
  organization,
  onEdit,
}: OrganizationDetailDialogProps) {
  const { profile } = useEnhancedAuth();
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [stats, setStats] = useState<OrganizationStats>({
    total_users: 0,
    active_users: 0,
    pending_users: 0,
    suspended_users: 0,
  });
  const [loading, setLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Fetch organization users and stats
  useEffect(() => {
    if (open && organization?.id) {
      fetchOrganizationData();
    }
  }, [open, organization?.id]);

  const fetchOrganizationData = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/admin/organizations/${organization.id}/users`);
      // const data = await response.json();
      
      // Mock data for now
      const mockUsers: OrganizationUser[] = [
        {
          id: "1",
          email: "admin@example.com",
          contact_name: "Organization Admin",
          role_name: `${organization.organization_type}_admin`,
          user_status: "approved",
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        },
        {
          id: "2",
          email: "user@example.com",
          contact_name: "Regular User",
          role_name: `${organization.organization_type}_user`,
          user_status: "pending",
          created_at: new Date().toISOString(),
        },
      ];

      setUsers(mockUsers);
      
      // Calculate stats
      const totalUsers = mockUsers.length;
      const activeUsers = mockUsers.filter(u => u.user_status === "approved").length;
      const pendingUsers = mockUsers.filter(u => u.user_status === "pending").length;
      const suspendedUsers = mockUsers.filter(u => u.user_status === "suspended").length;

      setStats({
        total_users: totalUsers,
        active_users: activeUsers,
        pending_users: pendingUsers,
        suspended_users: suspendedUsers,
      });
    } catch (error) {
      console.error("Failed to fetch organization data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleInviteSuccess = () => {
    setInviteDialogOpen(false);
    fetchOrganizationData();
  };

  if (!organization) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-6 w-6 text-teal-600" />
              {organization.name}
            </DialogTitle>
            <DialogDescription>
              Comprehensive view of organization details, users, and settings
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Organization Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Organization Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm">{organization.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="text-sm">
                      <Badge variant="outline">{organization.organization_type}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="text-sm">
                      <Badge variant={organization.is_active ? "default" : "secondary"}>
                        {organization.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">{new Date(organization.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Slug</label>
                    <p className="text-sm font-mono">{organization.slug}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ID</label>
                    <p className="text-sm font-mono text-xs">{organization.id}</p>
                  </div>
                </CardContent>
              </Card>

              {/* User Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.total_users}</div>
                      <div className="text-sm text-muted-foreground">Total Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.active_users}</div>
                      <div className="text-sm text-muted-foreground">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.pending_users}</div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.suspended_users}</div>
                      <div className="text-sm text-muted-foreground">Suspended</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Organization Users
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setInviteDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite User
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium">{user.contact_name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{formatRole(user.role_name)}</Badge>
                            <Badge className={getStatusColor(user.user_status)}>
                              {user.user_status}
                            </Badge>
                            {user.user_status === "pending" && (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      ))}
                      {users.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No users found for this organization</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInviteDialogOpen(true)}
                            className="mt-2"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite First User
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInviteDialogOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite User
                    </Button>
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(organization)}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Edit Organization
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Activity Log
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        targetOrganization={organization}
        onSuccess={handleInviteSuccess}
      />
    </>
  );
}