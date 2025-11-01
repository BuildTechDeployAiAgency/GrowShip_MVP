"use client";

import React, { useState } from "react";
import { Building2, Mail, Phone, MapPin, Globe } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

interface CreateDistributorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface DistributorFormData {
  name: string;
  slug: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  description: string;
}

export function CreateDistributorDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDistributorDialogProps) {
  const { profile } = useEnhancedAuth();
  const [formData, setFormData] = useState<DistributorFormData>({
    name: "",
    slug: "",
    contact_email: "",
    contact_phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zip_code: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    field: keyof DistributorFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate slug from name
    if (field === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }

    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name || !formData.slug) {
      setError("Organization name is required");
      return false;
    }

    if (!formData.contact_email) {
      setError("Contact email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contact_email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Check if slug already exists
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", formData.slug)
        .single();

      if (existingOrg) {
        setError("An organization with this name already exists");
        setLoading(false);
        return;
      }

      // Create distributor organization
      const { data: newOrg, error: insertError } = await supabase
        .from("organizations")
        .insert({
          name: formData.name,
          slug: formData.slug,
          organization_type: "distributor",
          parent_organization_id: profile?.organization_id || null,
          is_active: true,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          website: formData.website || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          country: formData.country || null,
          zip_code: formData.zip_code || null,
          description: formData.description || null,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      toast.success(
        `? Distributor "${formData.name}" created successfully!`,
        {
          position: "top-right",
          autoClose: 3000,
        }
      );

      // Reset form
      setFormData({
        name: "",
        slug: "",
        contact_email: "",
        contact_phone: "",
        website: "",
        address: "",
        city: "",
        state: "",
        country: "",
        zip_code: "",
        description: "",
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error creating distributor:", err);
      const errorMessage = err.message || "Failed to create distributor";
      setError(errorMessage);
      toast.error(`Failed to create distributor: ${errorMessage}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: "",
        slug: "",
        contact_email: "",
        contact_phone: "",
        website: "",
        address: "",
        city: "",
        state: "",
        country: "",
        zip_code: "",
        description: "",
      });
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-6 w-6 text-orange-600" />
            Create New Distributor Organization
          </DialogTitle>
          <DialogDescription>
            Add a new distributor organization to your network.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Organization Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization Details
            </h3>

            <div>
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                placeholder="ABC Distribution Inc."
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                placeholder="abc-distribution-inc"
                value={formData.slug}
                onChange={(e) => handleInputChange("slug", e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-generated from name, used for URLs
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the distributor..."
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Information
            </h3>

            <div>
              <Label htmlFor="contact_email">Contact Email *</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="contact@distributor.com"
                value={formData.contact_email}
                onChange={(e) =>
                  handleInputChange("contact_email", e.target.value)
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.contact_phone}
                  onChange={(e) =>
                    handleInputChange("contact_phone", e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://www.distributor.com"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </h3>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Business St"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="New York"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  placeholder="NY"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="United States"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="zip_code">ZIP/Postal Code</Label>
                <Input
                  id="zip_code"
                  placeholder="10001"
                  value={formData.zip_code}
                  onChange={(e) =>
                    handleInputChange("zip_code", e.target.value)
                  }
                />
              </div>
            </div>
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
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? "Creating..." : "Create Distributor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
