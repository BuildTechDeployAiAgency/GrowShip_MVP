"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  FileText,
  Globe,
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
import {
  useManufacturers,
  Manufacturer,
  ManufacturerStatus,
} from "@/hooks/use-manufacturers";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "react-toastify";

interface ManufacturerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manufacturer?: Manufacturer | null;
  onSuccess?: (manufacturer: Manufacturer) => void;
}

interface ManufacturerFormData {
  name: string;
  code: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  status: ManufacturerStatus;
  currency: string;
  tax_id: string;
  payment_terms: string;
  orders_count: string;
  revenue_to_date: string;
  margin_percent: string;
  contract_start: string;
  contract_end: string;
  notes: string;
}

export function ManufacturerFormDialog({
  open,
  onOpenChange,
  manufacturer,
  onSuccess,
}: ManufacturerFormDialogProps) {
  const { profile } = useEnhancedAuth();
  const { createManufacturer, updateManufacturer, getNextManufacturerCode } = useManufacturers({
    searchTerm: "",
    filters: {},
    brandId: profile?.brand_id,
  });

  const isEditing = !!manufacturer;

  const [formData, setFormData] = useState<ManufacturerFormData>({
    name: "",
    code: "",
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
    orders_count: "0",
    revenue_to_date: "0",
    margin_percent: "",
    contract_start: "",
    contract_end: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadFormData = async () => {
      if (manufacturer) {
        setFormData({
          name: manufacturer.name || "",
          code: manufacturer.code || "",
          contact_name: manufacturer.contact_name || "",
          contact_email: manufacturer.contact_email || "",
          contact_phone: manufacturer.contact_phone || "",
          address_line1: manufacturer.address_line1 || "",
          address_line2: manufacturer.address_line2 || "",
          city: manufacturer.city || "",
          state: manufacturer.state || "",
          postal_code: manufacturer.postal_code || "",
          country: manufacturer.country || "",
          latitude: manufacturer.latitude?.toString() || "",
          longitude: manufacturer.longitude?.toString() || "",
          status: manufacturer.status || "active",
          currency: manufacturer.currency || "USD",
          tax_id: manufacturer.tax_id || "",
          payment_terms: manufacturer.payment_terms || "",
          orders_count: manufacturer.orders_count?.toString() || "0",
          revenue_to_date: manufacturer.revenue_to_date?.toString() || "0",
          margin_percent: manufacturer.margin_percent?.toString() || "",
          contract_start: manufacturer.contract_start || "",
          contract_end: manufacturer.contract_end || "",
          notes: manufacturer.notes || "",
        });
      } else {
        // Generate next code for new manufacturer
        let nextCode = "";
        if (profile?.brand_id) {
          nextCode = await getNextManufacturerCode(profile.brand_id);
        }
        
        // Reset form for new manufacturer
        setFormData({
          name: "",
          code: nextCode,
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
          orders_count: "0",
          revenue_to_date: "0",
          margin_percent: "",
          contract_start: "",
          contract_end: "",
          notes: "",
        });
      }
      setErrors({});
    };

    if (open) {
      loadFormData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manufacturer, open, profile?.brand_id]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Manufacturer name is required";
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = "Valid email is required";
    }

    if (formData.margin_percent && (parseFloat(formData.margin_percent) < 0 || parseFloat(formData.margin_percent) > 100)) {
      newErrors.margin_percent = "Margin must be between 0 and 100";
    }

    if (formData.latitude && (parseFloat(formData.latitude) < -90 || parseFloat(formData.latitude) > 90)) {
      newErrors.latitude = "Latitude must be between -90 and 90";
    }

    if (formData.longitude && (parseFloat(formData.longitude) < -180 || parseFloat(formData.longitude) > 180)) {
      newErrors.longitude = "Longitude must be between -180 and 180";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    // Safety check - this should not happen if button is properly disabled
    if (!profile?.brand_id) {
      toast.error("Unable to save. Please refresh the page and try again.");
      return;
    }

    setLoading(true);

    try {
      const manufacturerData: Partial<Manufacturer> = {
        brand_id: profile.brand_id, // Auto-populated from logged-in user
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
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
        currency: formData.currency || undefined,
        tax_id: formData.tax_id.trim() || undefined,
        payment_terms: formData.payment_terms.trim() || undefined,
        orders_count: formData.orders_count ? parseInt(formData.orders_count) : 0,
        revenue_to_date: formData.revenue_to_date ? parseFloat(formData.revenue_to_date) : 0,
        margin_percent: formData.margin_percent ? parseFloat(formData.margin_percent) : undefined,
        contract_start: formData.contract_start || undefined,
        contract_end: formData.contract_end || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditing && manufacturer) {
        await updateManufacturer(manufacturer.id, manufacturerData);
        onSuccess?.(manufacturer);
      } else {
        const newManufacturer = await createManufacturer(manufacturerData);
        onSuccess?.(newManufacturer);
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving manufacturer:", error);
      toast.error(error.message || "Failed to save manufacturer");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof ManufacturerFormData,
    value: string | ManufacturerStatus
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Manufacturer" : "Add New Manufacturer"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update manufacturer information and details"
              : "Create a new manufacturer in your network"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Manufacturer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter manufacturer name"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Manufacturer Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="Auto-generated"
                    readOnly
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                    title="Manufacturer code is auto-generated (e.g., MFR-001, MFR-002)"
                  />
                  <p className="text-xs text-gray-500">
                    Auto-generated in format MFR-001, MFR-002, etc.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value as ManufacturerStatus)}
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
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Contact Information</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => handleChange("contact_name", e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange("contact_email", e.target.value)}
                    placeholder="contact@example.com"
                    className={errors.contact_email ? "border-red-500" : ""}
                  />
                  {errors.contact_email && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.contact_email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => handleChange("contact_phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
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
                <h3 className="text-lg font-semibold">Address</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address_line1">Address Line 1</Label>
                  <Input
                    id="address_line1"
                    value={formData.address_line1}
                    onChange={(e) => handleChange("address_line1", e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    value={formData.address_line2}
                    onChange={(e) => handleChange("address_line2", e.target.value)}
                    placeholder="Suite 100"
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="New York"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      placeholder="NY"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => handleChange("postal_code", e.target.value)}
                      placeholder="10001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleChange("country", e.target.value)}
                      placeholder="USA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="0.000001"
                      min="-90"
                      max="90"
                      value={formData.latitude}
                      onChange={(e) => handleChange("latitude", e.target.value)}
                      placeholder="40.7128"
                      className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.latitude ? "border-red-500" : ""}`}
                    />
                    {errors.latitude && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.latitude}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="0.000001"
                      min="-180"
                      max="180"
                      value={formData.longitude}
                      onChange={(e) => handleChange("longitude", e.target.value)}
                      placeholder="-74.0060"
                      className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.longitude ? "border-red-500" : ""}`}
                    />
                    {errors.longitude && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.longitude}
                      </p>
                    )}
                  </div>
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleChange("currency", value)}
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
                      <SelectItem value="AED">AED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => handleChange("tax_id", e.target.value)}
                    placeholder="12-3456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Input
                    id="payment_terms"
                    value={formData.payment_terms}
                    onChange={(e) => handleChange("payment_terms", e.target.value)}
                    placeholder="Net 30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orders_count">Orders Count</Label>
                  <Input
                    id="orders_count"
                    type="number"
                    min="0"
                    value={formData.orders_count}
                    onChange={(e) => handleChange("orders_count", e.target.value)}
                    placeholder="0"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="revenue_to_date">Revenue to Date</Label>
                  <Input
                    id="revenue_to_date"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.revenue_to_date}
                    onChange={(e) => handleChange("revenue_to_date", e.target.value)}
                    placeholder="0.00"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="margin_percent">Margin Percent</Label>
                  <Input
                    id="margin_percent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.margin_percent}
                    onChange={(e) => handleChange("margin_percent", e.target.value)}
                    placeholder="0.00"
                    className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.margin_percent ? "border-red-500" : ""}`}
                  />
                  {errors.margin_percent && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.margin_percent}
                    </p>
                  )}
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
                <div className="space-y-2">
                  <Label htmlFor="contract_start">Contract Start Date</Label>
                  <Input
                    id="contract_start"
                    type="date"
                    value={formData.contract_start}
                    onChange={(e) => handleChange("contract_start", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_end">Contract End Date</Label>
                  <Input
                    id="contract_end"
                    type="date"
                    value={formData.contract_end}
                    onChange={(e) => handleChange("contract_end", e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Additional notes about this manufacturer"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !profile?.brand_id}
              title={!profile?.brand_id ? "Please wait while your profile loads..." : ""}
            >
              {loading
                ? "Saving..."
                : isEditing
                ? "Update Manufacturer"
                : "Create Manufacturer"}
            </Button>
            {!profile?.brand_id && !loading && (
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

