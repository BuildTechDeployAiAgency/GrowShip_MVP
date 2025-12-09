"use client";

import React, { useState } from "react";
import { Mail, User, Building, Building2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import type { Brand } from "@/types/auth";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetOrganization?: Brand;
  onSuccess?: () => void;
}

interface InviteFormData {
  email: string;
  role: string;
  message: string;
  brand_id: string;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  targetOrganization,
  onSuccess,
}: InviteUserDialogProps) {
  const { profile, currentOrganization, organizations, canPerformAction } = useEnhancedAuth();
  const [formData, setFormData] = useState<InviteFormData>({
    email: "",
    role: "",
    message: "",
    brand_id: targetOrganization?.id || currentOrganization?.id || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isSuperAdmin = profile?.role_name === "super_admin";

  // Get organization type for role filtering
  const organizationType = targetOrganization?.organization_type || 
    (formData.brand_id ? organizations?.find(org => org.id === formData.brand_id)?.organization_type : null);

  // Filter roles based on organization type
  const getAvailableRoles = () => {
    const baseRoles = [
      { value: "brand_admin", label: "Brand Admin" },
      { value: "brand_finance", label: "Brand Finance" },
      { value: "brand_manager", label: "Brand Manager" },
      { value: "brand_user", label: "Brand User" },
    ];

    if (organizationType === "distributor") {
      return [
        { value: "distributor_admin", label: "Distributor Admin" },
        { value: "distributor_finance", label: "Distributor Finance" },
        { value: "distributor_manager", label: "Distributor Manager" },
        { value: "distributor_user", label: "Distributor User" },
      ];
    } else if (organizationType === "manufacturer") {
      return [
        { value: "manufacturer_admin", label: "Manufacturer Admin" },
        { value: "manufacturer_finance", label: "Manufacturer Finance" },
        { value: "manufacturer_manager", label: "Manufacturer Manager" },
        { value: "manufacturer_customer", label: "Manufacturer Customer" },
      ];
    }

    return baseRoles;
  };

  // Update form data when target organization changes
  React.useEffect(() => {
    if (targetOrganization?.id) {
      setFormData(prev => ({
        ...prev,
        brand_id: targetOrganization.id
      }));
    }
  }, [targetOrganization?.id]);

  // Show info notification when dialog opens
  React.useEffect(() => {
    if (open) {
      toast.info(
        "💡 The invited user will receive an email with instructions to set up their account.",
        {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
    }
  }, [open]);

  const handleInputChange = (field: keyof InviteFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.role) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate brand selection for super admins
    if (isSuperAdmin && !formData.brand_id) {
      setError("Please select a brand for this user");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Show loading notification
      const loadingToastId = toast.info("Sending invitation...", {
        position: "top-right",
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
      });

      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
          message: formData.message,
          brand_id: formData.brand_id || currentOrganization?.id || profile?.brand_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Dismiss loading notification
        toast.dismiss(loadingToastId);
        throw new Error(result.error || "Failed to send invitation");
      }

      // Dismiss loading notification
      toast.dismiss(loadingToastId);

      // Show success notification with more details
      const roleDisplayName = formData.role
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      toast.success(
        `✅ Invitation sent successfully!\n📧 Email: ${formData.email}\n👤 Role: ${roleDisplayName}`,
        {
          position: "top-right",
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );

      // Reset form and close dialog
      setFormData({
        email: "",
        role: "",
        message: "",
        brand_id: targetOrganization?.id || currentOrganization?.id || "",
      });
      setError(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Error inviting user:", err);
      const errorMessage = err.message || "Failed to send invitation";
      setError(errorMessage);

      // Dismiss loading notification if it exists
      toast.dismiss();

      // Show specific error notifications based on error type
      let notificationMessage = "";
      let notificationType: "error" | "warning" = "error";

      if (errorMessage.includes("User already exists")) {
        notificationMessage = `User with email ${formData.email} already exists in the system.`;
        notificationType = "warning";
      } else if (errorMessage.includes("Unauthorized")) {
        notificationMessage =
          "You are not authorized to send invitations. Please contact your administrator.";
      } else if (errorMessage.includes("Forbidden")) {
        notificationMessage =
          "You don't have permission to invite users. Only brand administrators and super administrators can send invitations.";
      } else if (errorMessage.includes("Missing required fields")) {
        notificationMessage =
          "Please fill in all required fields before sending the invitation.";
      } else if (errorMessage.includes("Server configuration error")) {
        notificationMessage =
          "Server configuration error. Please contact support.";
      } else if (errorMessage.includes("Failed to create user profile")) {
        notificationMessage =
          "Invitation was sent but failed to create user profile. Please contact support.";
      } else if (errorMessage.includes("Internal server error")) {
        notificationMessage =
          "An unexpected error occurred. Please try again or contact support.";
      } else {
        notificationMessage = `Failed to send invitation: ${errorMessage}`;
      }

      // Show notification
      if (notificationType === "warning") {
        toast.warning(notificationMessage, {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.error(notificationMessage, {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        email: "",
        role: "",
        message: "",
        brand_id: currentOrganization?.id || "",
      });
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-teal-600" />
            {targetOrganization 
              ? `Invite User to ${targetOrganization.name}`
              : "Invite Team Member"
            }
          </DialogTitle>
          <DialogDescription>
            {targetOrganization 
              ? `Send an invitation to join ${targetOrganization.name} (${targetOrganization.organization_type}). They will receive an email with instructions to set up their account.`
              : "Send an invitation to a team member to join your organization. They will receive an email with instructions to set up their account."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@company.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
            />
          </div>

          {isSuperAdmin && !targetOrganization && (
            <div className="space-y-2">
              <Label htmlFor="brand" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization *
              </Label>
              <Select
                value={formData.brand_id}
                onValueChange={(value: string) =>
                  handleInputChange("brand_id", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.organization_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {targetOrganization && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization
              </Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{targetOrganization.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({targetOrganization.organization_type})
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role *
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: string) =>
                handleInputChange("role", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRoles().map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
