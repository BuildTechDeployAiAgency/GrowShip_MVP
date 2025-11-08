"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  DollarSign,
  FileText,
  Calendar,
  AlertCircle,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useDistributors, Distributor } from "@/hooks/use-distributors";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { createClient } from "@/lib/supabase/client";

interface DistributorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distributor?: Distributor | null;
  onSuccess?: (distributor: Distributor) => void;
}

interface DistributorFormData {
  // Basic info
  name: string;
  code: string;
  brand_id: string;

  // Contact info
  contact_name: string;
  contact_email: string;
  contact_phone: string;

  // Address
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;

  // Business info
  status: "active" | "inactive" | "archived";
  currency: string;
  tax_id: string;
  payment_terms: string;

  // Performance metrics
  min_purchase_target: string;
  contract_start: string;
  contract_end: string;
  notes: string;
}

export function DistributorFormDialog({
  open,
  onOpenChange,
  distributor,
  onSuccess,
}: DistributorFormDialogProps) {
  const { profile, canPerformAction } = useEnhancedAuth();
  const isSuperAdmin = canPerformAction("view_all_users");
  
  const { createDistributor, updateDistributor } = useDistributors({
    searchTerm: "",
    filters: { status: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    isSuperAdmin,
  });

  const [formData, setFormData] = useState<DistributorFormData>({
    name: "",
    code: "",
    brand_id: profile?.brand_id || "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    latitude: "",
    longitude: "",
    status: "active",
    currency: "USD",
    tax_id: "",
    payment_terms: "",
    min_purchase_target: "",
    contract_start: "",
    contract_end: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (distributor) {
        // Edit mode - populate form with existing data
        setFormData({
          name: distributor.name || "",
          code: distributor.code || "",
          brand_id: distributor.brand_id || "",
          contact_name: distributor.contact_name || "",
          contact_email: distributor.contact_email || "",
          contact_phone: distributor.contact_phone || "",
          address_line1: distributor.address_line1 || "",
          address_line2: distributor.address_line2 || "",
          city: distributor.city || "",
          state: distributor.state || "",
          postal_code: distributor.postal_code || "",
          country: distributor.country || "",
          latitude: distributor.latitude?.toString() || "",
          longitude: distributor.longitude?.toString() || "",
          status: distributor.status || "active",
          currency: distributor.currency || "USD",
          tax_id: distributor.tax_id || "",
          payment_terms: distributor.payment_terms || "",
          min_purchase_target: distributor.min_purchase_target?.toString() || "",
          contract_start: distributor.contract_start
            ? distributor.contract_start.split("T")[0]
            : "",
          contract_end: distributor.contract_end
            ? distributor.contract_end.split("T")[0]
            : "",
          notes: distributor.notes || "",
        });
      } else {
        // Create mode - reset form
        setFormData({
          name: "",
          code: "",
          brand_id: profile?.brand_id || "",
          contact_name: "",
          contact_email: "",
          contact_phone: "",
          address_line1: "",
          address_line2: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
          latitude: "",
          longitude: "",
          status: "active",
          currency: "USD",
          tax_id: "",
          payment_terms: "",
          min_purchase_target: "",
          contract_start: "",
          contract_end: "",
          notes: "",
        });
      }
      setError(null);
    }
  }, [open, distributor, profile]);

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Distributor name is required");
      return false;
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (formData.latitude && isNaN(parseFloat(formData.latitude))) {
      setError("Latitude must be a valid number");
      return false;
    }

    if (formData.longitude && isNaN(parseFloat(formData.longitude))) {
      setError("Longitude must be a valid number");
      return false;
    }

    if (
      formData.contract_start &&
      formData.contract_end &&
      new Date(formData.contract_start) > new Date(formData.contract_end)
    ) {
      setError("Contract end date must be after start date");
      return false;
    }

    // Only validate brand_id for super admins or if it's still empty for regular users
    if (isSuperAdmin && !formData.brand_id) {
      setError("Organization is required");
      return false;
    }
    
    if (!isSuperAdmin && !formData.brand_id) {
      setError("Unable to determine your organization. Please refresh the page.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const distributorData: Partial<Distributor> = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        brand_id: formData.brand_id,
        contact_name: formData.contact_name.trim() || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        contact_phone: formData.contact_phone.trim() || undefined,
        address_line1: formData.address_line1.trim() || undefined,
        address_line2: formData.address_line2.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postal_code: formData.postal_code.trim() || undefined,
        country: formData.country.trim() || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        status: formData.status,
        currency: formData.currency,
        tax_id: formData.tax_id.trim() || undefined,
        payment_terms: formData.payment_terms.trim() || undefined,
        min_purchase_target: formData.min_purchase_target
          ? parseFloat(formData.min_purchase_target)
          : undefined,
        contract_start: formData.contract_start || undefined,
        contract_end: formData.contract_end || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (distributor) {
        await updateDistributor(distributor.id, distributorData);
        onOpenChange(false);
      } else {
        const newDistributor = await createDistributor(distributorData);
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(newDistributor);
        }
      }
    } catch (err: any) {
      console.error("Error saving distributor:", err);
      setError(err?.message || "Failed to save distributor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onOpenChange(false);
    }
  };

  // Load brands for Super Admin
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);
  useEffect(() => {
    if (isSuperAdmin && open) {
      const loadBrands = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("brands")
          .select("id, name, organization_type")
          .eq("is_active", true)
          .order("name");
        
        if (error) {
          console.error("Error loading brands:", error);
          setError("Failed to load organizations. Please try again.");
        } else {
          setAvailableBrands(data || []);
        }
      };
      loadBrands();
    }
  }, [isSuperAdmin, open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-6 w-6 text-teal-600" />
            {distributor ? "Edit Distributor" : "Create New Distributor"}
          </DialogTitle>
          <DialogDescription>
            {distributor
              ? "Update distributor information below"
              : "Add a new distributor to manage relationships"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">
                    Distributor Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="ABC Distribution Inc."
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    placeholder="ABC-001"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                  />
                </div>

                {isSuperAdmin && (
                  <div>
                    <Label htmlFor="brand_id">
                      Organization <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.brand_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, brand_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBrands.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No organizations available
                          </div>
                        ) : (
                          availableBrands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name} ({brand.organization_type})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive" | "archived") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Contact Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    placeholder="John Doe"
                    value={formData.contact_name}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    placeholder="+1 (555) 123-4567"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_phone: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Address Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="address_line1">Address Line 1</Label>
                  <Input
                    id="address_line1"
                    placeholder="123 Main Street"
                    value={formData.address_line1}
                    onChange={(e) =>
                      setFormData({ ...formData, address_line1: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    placeholder="Suite 100"
                    value={formData.address_line2}
                    onChange={(e) =>
                      setFormData({ ...formData, address_line2: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="New York"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    placeholder="NY"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    placeholder="10001"
                    value={formData.postal_code}
                    onChange={(e) =>
                      setFormData({ ...formData, postal_code: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="United States"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="40.7128"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="-74.0060"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Business Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    id="tax_id"
                    placeholder="12-3456789"
                    value={formData.tax_id}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_id: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Input
                    id="payment_terms"
                    placeholder="Net 30"
                    value={formData.payment_terms}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_terms: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="min_purchase_target">Min Purchase Target</Label>
                  <Input
                    id="min_purchase_target"
                    type="number"
                    step="0.01"
                    placeholder="10000.00"
                    value={formData.min_purchase_target}
                    onChange={(e) =>
                      setFormData({ ...formData, min_purchase_target: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Contract Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract_start">Contract Start Date</Label>
                  <Input
                    id="contract_start"
                    type="date"
                    value={formData.contract_start}
                    onChange={(e) =>
                      setFormData({ ...formData, contract_start: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="contract_end">Contract End Date</Label>
                  <Input
                    id="contract_end"
                    type="date"
                    value={formData.contract_end}
                    onChange={(e) =>
                      setFormData({ ...formData, contract_end: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Additional Notes</h3>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional information about this distributor..."
                  rows={4}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (!isSuperAdmin && !profile?.brand_id)}
              title={!isSuperAdmin && !profile?.brand_id ? "Waiting for your profile to load. If this persists, please refresh the page." : ""}
            >
              {loading ? "Saving..." : distributor ? "Update Distributor" : "Create Distributor"}
            </Button>
            {!isSuperAdmin && !profile?.brand_id && !loading && (
              <p className="text-xs text-amber-600 ml-2">
                Loading your profile...
              </p>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
