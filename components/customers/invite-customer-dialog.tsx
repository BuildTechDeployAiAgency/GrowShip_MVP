"use client";

import React, { useState } from "react";
import { Mail, Building2, User, Phone, MapPin } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";

interface InviteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InviteFormData {
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  message: string;
}

export function InviteCustomerDialog({
  open,
  onOpenChange,
}: InviteCustomerDialogProps) {
  const [formData, setFormData] = useState<InviteFormData>({
    email: "",
    companyName: "",
    contactName: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show info notification when dialog opens
  React.useEffect(() => {
    if (open) {
      toast.info(
        "💡 The invited customer will receive an email with instructions to set up their account.",
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

    if (!formData.email || !formData.companyName || !formData.contactName) {
      setError("Please fill in all required fields");
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

      const response = await fetch("/api/customers/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          company_name: formData.companyName,
          contact_name: formData.contactName,
          phone: formData.phone,
          message: formData.message,
          role: "customer", // Set role as customer
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
      toast.success(
        `✅ Customer invitation sent successfully!\n🏢 Company: ${formData.companyName}\n📧 Email: ${formData.email}`,
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
        companyName: "",
        contactName: "",
        phone: "",
        message: "",
      });
      setError(null);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error inviting customer:", err);
      const errorMessage = err.message || "Failed to send invitation";
      setError(errorMessage);

      // Dismiss loading notification if it exists
      toast.dismiss();

      // Show specific error notifications based on error type
      let notificationMessage = "";
      let notificationType: "error" | "warning" = "error";

      if (errorMessage.includes("Customer already exists")) {
        notificationMessage = `Customer with email ${formData.email} already exists in the system.`;
        notificationType = "warning";
      } else if (errorMessage.includes("Unauthorized")) {
        notificationMessage =
          "You are not authorized to send invitations. Please contact your administrator.";
      } else if (errorMessage.includes("Forbidden")) {
        notificationMessage =
          "You don't have permission to invite customers.";
      } else if (errorMessage.includes("Missing required fields")) {
        notificationMessage =
          "Please fill in all required fields before sending the invitation.";
      } else if (errorMessage.includes("Server configuration error")) {
        notificationMessage =
          "Server configuration error. Please contact support.";
      } else if (errorMessage.includes("Failed to create customer profile")) {
        notificationMessage =
          "Invitation was sent but failed to create customer profile. Please contact support.";
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
        companyName: "",
        contactName: "",
        phone: "",
        message: "",
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
            <Building2 className="h-6 w-6 text-teal-600" />
            Invite Customer
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a customer to join your platform. They will
            receive an email with instructions to set up their account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Name *
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Acme Corporation"
              value={formData.companyName}
              onChange={(e) => handleInputChange("companyName", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Name *
            </Label>
            <Input
              id="contactName"
              type="text"
              placeholder="John Doe"
              value={formData.contactName}
              onChange={(e) => handleInputChange("contactName", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="customer@company.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />
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

