"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  UserPlus, 
  Users, 
  Power, 
  Shield,
  AlertTriangle
} from "lucide-react";
import type { Brand } from "@/types/auth";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

interface OrganizationActionsMenuProps {
  organization: Brand;
  onViewDetails?: (org: Brand) => void;
  onEdit?: (org: Brand) => void;
  onStatusChange?: (org: Brand) => void;
  onRefresh?: () => void;
}

export function OrganizationActionsMenu({
  organization,
  onViewDetails,
  onEdit,
  onStatusChange,
  onRefresh,
}: OrganizationActionsMenuProps) {
  const { profile, canPerformAction } = useEnhancedAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  // Check if user can manage this organization
  const canManageOrganization = 
    profile?.role_name === "super_admin" ||
    (profile?.role_name?.startsWith("brand_admin") && profile?.brand_id === organization.id);

  const handleViewDetails = () => {
    onViewDetails?.(organization);
  };

  const handleEdit = () => {
    onEdit?.(organization);
  };

  const handleInviteUser = () => {
    setInviteDialogOpen(true);
  };

  const handleManageUsers = () => {
    // Navigate to organization users page or open users dialog
    onViewDetails?.(organization);
  };

  const handleToggleStatus = () => {
    onStatusChange?.(organization);
  };

  const handleInviteSuccess = () => {
    setInviteDialogOpen(false);
    onRefresh?.();
  };

  if (!canManageOrganization) {
    return (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleViewDetails}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleViewDetails} className="cursor-pointer">
              <Eye className="mr-2 h-4 w-4" />
              <span>View Details</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Organization</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleInviteUser} className="cursor-pointer">
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Invite User</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleManageUsers} className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              <span>Manage Users</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {profile?.role_name === "super_admin" && (
              <>
                <DropdownMenuItem 
                  onClick={handleToggleStatus} 
                  className="cursor-pointer"
                >
                  {organization.is_active ? (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                      <span>Deactivate</span>
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 h-4 w-4 text-green-500" />
                      <span>Activate</span>
                    </>
                  )}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Enhanced Invite User Dialog with Organization Context */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        targetOrganization={organization}
        onSuccess={handleInviteSuccess}
      />
    </>
  );
}