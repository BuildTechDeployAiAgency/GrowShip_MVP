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
  CheckCircle, 
  XCircle,
  UserMinus,
  Shield,
  AlertTriangle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import type { UserProfile } from "@/types/auth";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { createClient } from "@/lib/supabase/client";

interface UserActionsMenuProps {
  user: UserProfile;
  onRefresh?: () => void;
}

export function UserActionsMenu({
  user,
  onRefresh,
}: UserActionsMenuProps) {
  const { profile } = useEnhancedAuth();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  
  // Check if current user can manage this user
  const canManageUser = 
    profile?.role_name === "super_admin" ||
    (profile?.role_name?.startsWith("brand_admin") && profile?.brand_id === user.brand_id);

  const handleApproveUser = async () => {
    if (!canManageUser) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("user_profiles")
        .update({ user_status: "approved" })
        .eq("user_id", user.user_id);

      if (error) throw error;

      toast.success(`${user.contact_name} has been approved successfully!`);
      onRefresh?.();
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!canManageUser) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("user_profiles")
        .update({ user_status: "suspended" })
        .eq("user_id", user.user_id);

      if (error) throw error;

      toast.success(`${user.contact_name} has been suspended.`);
      onRefresh?.();
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Failed to suspend user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateUser = async () => {
    if (!canManageUser) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("user_profiles")
        .update({ user_status: "approved" })
        .eq("user_id", user.user_id);

      if (error) throw error;

      toast.success(`${user.contact_name} has been reactivated.`);
      onRefresh?.();
    } catch (error) {
      console.error("Error reactivating user:", error);
      toast.error("Failed to reactivate user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!canManageUser) return;
    
    if (!confirm(`Are you sure you want to delete ${user.contact_name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Delete user profile
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", user.user_id);

      if (error) throw error;

      toast.success(`${user.contact_name} has been deleted.`);
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = () => {
    console.log("View user details:", user);
    // TODO: Implement user detail view
    toast.info("User details view coming soon!");
  };

  const handleEditUser = () => {
    console.log("Edit user:", user);
    // TODO: Implement user edit functionality
    toast.info("User edit functionality coming soon!");
  };

  if (!canManageUser) {
    return (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleViewUser}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            disabled={loading}
          >
            <span className="sr-only">Open user menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>User Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleViewUser} className="cursor-pointer">
            <Eye className="mr-2 h-4 w-4" />
            <span>View Details</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleEditUser} className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit User</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Status-specific actions */}
          {user.user_status === "pending" && (
            <DropdownMenuItem 
              onClick={handleApproveUser} 
              className="cursor-pointer text-green-600"
              disabled={loading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              <span>Approve User</span>
            </DropdownMenuItem>
          )}
          
          {user.user_status === "approved" && (
            <DropdownMenuItem 
              onClick={handleSuspendUser} 
              className="cursor-pointer text-orange-600"
              disabled={loading}
            >
              <Clock className="mr-2 h-4 w-4" />
              <span>Suspend User</span>
            </DropdownMenuItem>
          )}
          
          {user.user_status === "suspended" && (
            <DropdownMenuItem 
              onClick={handleReactivateUser} 
              className="cursor-pointer text-green-600"
              disabled={loading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              <span>Reactivate User</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Only super admin can delete users */}
          {profile?.role_name === "super_admin" && (
            <DropdownMenuItem 
              onClick={handleDeleteUser} 
              className="cursor-pointer text-red-600"
              disabled={loading}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              <span>Delete User</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}