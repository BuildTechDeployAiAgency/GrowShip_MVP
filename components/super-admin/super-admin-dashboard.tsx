"use client";

import { useState, useEffect } from "react";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { createClient } from "@/lib/supabase/client";
import { Organization, UserProfile, UserMembership, Brand } from "@/types/auth";
import { BrandDistributorRelationshipDetailed } from "@/types/relationships";
import { OrganizationActionsMenu } from "./organization-actions-menu";
import { OrganizationDetailDialog } from "./organization-detail-dialog";
import { UserActionsMenu } from "./user-actions-menu";
import { RelationshipsList } from "./relationships-list";
import { AssignDistributorDialog } from "./assign-distributor-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Building2, 
  Users, 
  TrendingUp, 
  Settings, 
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Shield,
  Globe,
  AlertCircle,
  Bell
} from "lucide-react";
import { toast } from "sonner";
import { NotificationSettingsMatrix } from "./notification-settings-matrix";

interface OrganizationStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalBrands: number;
  totalDistributors: number;
  totalManufacturers: number;
}

export function SuperAdminDashboard() {
  const { user, profile, organizations, canPerformAction, profileLoading } = useEnhancedAuth();
  const [stats, setStats] = useState<OrganizationStats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    totalBrands: 0,
    totalDistributors: 0,
    totalManufacturers: 0,
  });
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"brand" | "distributor" | "manufacturer">("brand");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [activeTab, setActiveTab] = useState("organizations");
  const [selectedOrganization, setSelectedOrganization] = useState<Brand | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [assignDistributorDialogOpen, setAssignDistributorDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<BrandDistributorRelationshipDetailed | null>(null);
  const [relationshipDetailDialogOpen, setRelationshipDetailDialogOpen] = useState(false);
  const supabase = createClient();

  // Define loadDashboardData BEFORE useEffect
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all organizations (brands)
      const { data: orgs, error: orgError } = await supabase
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgError) throw orgError;
      setAllOrganizations(orgs || []);

      // Load all users - order by status to show pending first
      const { data: users, error: usersError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("user_status", { ascending: true })
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;
      setAllUsers(users || []);

      // Calculate stats
      const activeOrgs = orgs?.filter(org => org.is_active) || [];
      const brands = activeOrgs.filter(org => org.organization_type === "brand");
      const distributors = activeOrgs.filter(org => org.organization_type === "distributor");
      const manufacturers = activeOrgs.filter(org => org.organization_type === "manufacturer");

      setStats({
        totalOrganizations: orgs?.length || 0,
        activeOrganizations: activeOrgs.length,
        totalUsers: users?.length || 0,
        totalBrands: brands.length,
        totalDistributors: distributors.length,
        totalManufacturers: manufacturers.length,
      });

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Create organization function
  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setCreatingOrg(true);
    try {
      const slug = orgName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const { data, error } = await supabase
        .from("brands")
        .insert({
          name: orgName.trim(),
          slug,
          organization_type: orgType,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Organization created successfully");
      setShowCreateOrgDialog(false);
      setOrgName("");
      setOrgType("brand");
      await loadDashboardData(); // Refresh the list
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(error?.message || "Failed to create organization");
    } finally {
      setCreatingOrg(false);
    }
  };

  // Show loading state while profile is loading
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has super admin access - AFTER profile is loaded
  // Only check permissions if profile exists and is not loading
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!canPerformAction("view_all_users")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You don't have permission to access the Super Admin portal.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filteredOrganizations = allOrganizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || org.organization_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = (user.company_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                         (user.contact_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                         (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || user.role_type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Organization action handlers
  const handleViewOrganization = (org: Brand) => {
    setSelectedOrganization(org);
    setDetailDialogOpen(true);
  };

  const handleEditOrganization = (org: Brand) => {
    console.log("Edit organization:", org);
    // TODO: Implement edit functionality
  };

  const handleToggleOrganizationStatus = async (org: Brand) => {
    try {
      const { error } = await supabase
        .from("brands")
        .update({ is_active: !org.is_active })
        .eq("id", org.id);

      if (error) throw error;

      // Refresh data
      await loadDashboardData();
    } catch (error) {
      console.error("Error updating organization status:", error);
    }
  };

  // Relationship action handlers
  const handleAssignDistributor = () => {
    setAssignDistributorDialogOpen(true);
  };

  const handleViewRelationshipDetails = (relationship: BrandDistributorRelationshipDetailed) => {
    setSelectedRelationship(relationship);
    setRelationshipDetailDialogOpen(true);
  };

  const handleEditRelationship = (relationship: BrandDistributorRelationshipDetailed) => {
    setSelectedRelationship(relationship);
    // TODO: Implement edit relationship dialog
    console.log("Edit relationship:", relationship);
  };

  const handleAssignmentSuccess = () => {
    setAssignDistributorDialogOpen(false);
    // Refresh any cached data if needed
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mb-6">
        <Button onClick={() => setShowCreateOrgDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
        <Button onClick={() => setShowCreateUserDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

        {/* Pending Approvals Banner */}
        {allUsers.filter(u => u.user_status === "pending").length > 0 && (
          <Card className="border-l-4 border-yellow-500 bg-yellow-50 mb-8">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-900">
                    {allUsers.filter(u => u.user_status === "pending").length} User{allUsers.filter(u => u.user_status === "pending").length > 1 ? "s" : ""} Awaiting Approval
                  </h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    Review and approve pending users from all brands.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setFilterType("all");
                    setSearchTerm("");
                    setActiveTab("users");
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Review Pending Users
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeOrganizations} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Brands</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBrands}</div>
              <p className="text-xs text-muted-foreground">
                Active brand organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distributors</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDistributors}</div>
              <p className="text-xs text-muted-foreground">
                Active distributor organizations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1.5">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Organizations</CardTitle>
                    <CardDescription>
                      Manage all organizations in the system
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search organizations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="brand">Brands</SelectItem>
                        <SelectItem value="distributor">Distributors</SelectItem>
                        <SelectItem value="manufacturer">Manufacturers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {org.organization_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.is_active ? "default" : "secondary"}>
                            {org.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(org.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <OrganizationActionsMenu
                            organization={org}
                            onViewDetails={handleViewOrganization}
                            onEdit={handleEditOrganization}
                            onStatusChange={handleToggleOrganizationStatus}
                            onRefresh={loadDashboardData}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                      Manage all users across organizations
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="brand">Brand Users</SelectItem>
                        <SelectItem value="distributor">Distributor Users</SelectItem>
                        <SelectItem value="manufacturer">Manufacturer Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.contact_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.company_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              user.user_status === "approved" 
                                ? "default" 
                                : user.user_status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                            className={
                              user.user_status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : user.user_status === "suspended"
                                ? "bg-red-100 text-red-800"
                                : ""
                            }
                          >
                            {user.user_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <UserActionsMenu
                            user={user}
                            onRefresh={loadDashboardData}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships" className="space-y-4">
            <RelationshipsList
              onAssignDistributor={handleAssignDistributor}
              onViewDetails={handleViewRelationshipDetails}
              onEditRelationship={handleEditRelationship}
            />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure which roles receive each notification type across the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationSettingsMatrix />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Organization Dialog */}
        <Dialog 
          open={showCreateOrgDialog} 
          onOpenChange={(open) => {
            setShowCreateOrgDialog(open);
            if (!open) {
              // Reset form when dialog closes
              setOrgName("");
              setOrgType("brand");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Create a new organization in the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input 
                  id="orgName" 
                  placeholder="Enter organization name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={creatingOrg}
                />
              </div>
              <div>
                <Label htmlFor="orgType">Organization Type</Label>
                <Select value={orgType} onValueChange={(value: "brand" | "distributor" | "manufacturer") => setOrgType(value)} disabled={creatingOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand">Brand</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateOrgDialog(false);
                    setOrgName("");
                    setOrgType("brand");
                  }}
                  disabled={creatingOrg}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateOrganization}
                  disabled={creatingOrg || !orgName.trim()}
                >
                  {creatingOrg ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user and assign them to an organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="userEmail">Email</Label>
                <Input id="userEmail" type="email" placeholder="Enter user email" />
              </div>
              <div>
                <Label htmlFor="userName">Full Name</Label>
                <Input id="userName" placeholder="Enter full name" />
              </div>
              <div>
                <Label htmlFor="userOrg">Organization</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {allOrganizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({org.organization_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="userRole">Role</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand_admin">Brand Admin</SelectItem>
                    <SelectItem value="distributor_admin">Distributor Admin</SelectItem>
                    <SelectItem value="manufacturer_admin">Manufacturer Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // TODO: Implement user creation
                  setShowCreateUserDialog(false);
                  toast.success("User created successfully");
                }}>
                  Create User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Organization Detail Dialog */}
        <OrganizationDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          organization={selectedOrganization}
          onEdit={handleEditOrganization}
        />

        {/* Assign Distributor Dialog */}
        <AssignDistributorDialog
          open={assignDistributorDialogOpen}
          onOpenChange={setAssignDistributorDialogOpen}
          onSuccess={handleAssignmentSuccess}
        />
    </div>
  );
}


