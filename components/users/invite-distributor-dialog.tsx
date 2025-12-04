"use client";

import React, { useState } from "react";
import { Building2, Mail, User, Phone, MapPin, Globe } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { CountrySelect } from "@/components/ui/country-select";

interface InviteDistributorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DistributorFormData {
  // Company Information
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;

  // Primary Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactRole: string;

  // Address Information
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;

  // Additional
  message: string;
  brand_id: string;
}

export function InviteDistributorDialog({
  open,
  onOpenChange,
}: InviteDistributorDialogProps) {
  const { profile } = useEnhancedAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DistributorFormData>({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyWebsite: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactRole: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    message: "",
    brand_id: profile?.brand_id || "",
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
    setError(null);
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.companyName || !formData.companyEmail) {
        setError("Please fill in all required company information");
        return false;
      }
    } else if (step === 2) {
      if (
        !formData.contactName ||
        !formData.contactEmail ||
        !formData.contactRole
      ) {
        setError("Please fill in all required contact information");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const loadingToastId = toast.info("Sending distributor invitation...", {
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
          email: formData.contactEmail,
          role: formData.contactRole,
          brand_id: formData.brand_id,
          companyInfo: {
            name: formData.companyName,
            email: formData.companyEmail,
            phone: formData.companyPhone,
            website: formData.companyWebsite,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            zipCode: formData.zipCode,
          },
          contactInfo: {
            name: formData.contactName,
            phone: formData.contactPhone,
          },
          message: formData.message,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.dismiss(loadingToastId);
        throw new Error(
          result.error || "Failed to send distributor invitation"
        );
      }

      toast.dismiss(loadingToastId);

      toast.success(
        `✅ Distributor invitation sent successfully!\n🏢 Company: ${formData.companyName}\n👤 Contact: ${formData.contactName}`,
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
        companyName: "",
        companyEmail: "",
        companyPhone: "",
        companyWebsite: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        contactRole: "",
        address: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
        message: "",
        brand_id: "",
      });
      setCurrentStep(1);
      setError(null);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error inviting distributor:", err);
      const errorMessage =
        err.message || "Failed to send distributor invitation";
      setError(errorMessage);

      toast.dismiss();
      toast.error(`Failed to send distributor invitation: ${errorMessage}`, {
        position: "top-right",
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        companyName: "",
        companyEmail: "",
        companyPhone: "",
        companyWebsite: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        contactRole: "",
        address: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
        message: "",
        brand_id: "",
      });
      setCurrentStep(1);
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-6 w-6 text-orange-600" />
            Invite New Distributor Organization
          </DialogTitle>
          <DialogDescription>
            Add a new distributor organization to your platform. Complete all
            steps to send the invitation.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                  currentStep >= step
                    ? "bg-orange-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? "bg-orange-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <Card className="border-orange-200">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">Company Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      placeholder="ABC Distribution Inc."
                      value={formData.companyName}
                      onChange={(e) =>
                        handleInputChange("companyName", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyEmail">Company Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="companyEmail"
                        type="email"
                        className="pl-10"
                        placeholder="info@company.com"
                        value={formData.companyEmail}
                        onChange={(e) =>
                          handleInputChange("companyEmail", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="companyPhone">Company Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="companyPhone"
                        type="tel"
                        className="pl-10"
                        placeholder="+1 (555) 000-0000"
                        value={formData.companyPhone}
                        onChange={(e) =>
                          handleInputChange("companyPhone", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="companyWebsite">Company Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="companyWebsite"
                        type="url"
                        className="pl-10"
                        placeholder="https://www.company.com"
                        value={formData.companyWebsite}
                        onChange={(e) =>
                          handleInputChange("companyWebsite", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Primary Contact */}
          {currentStep === 2 && (
            <Card className="border-orange-200">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">
                    Primary Contact Person
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input
                      id="contactName"
                      placeholder="John Doe"
                      value={formData.contactName}
                      onChange={(e) =>
                        handleInputChange("contactName", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactEmail">Contact Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="contactEmail"
                        type="email"
                        className="pl-10"
                        placeholder="john@company.com"
                        value={formData.contactEmail}
                        onChange={(e) =>
                          handleInputChange("contactEmail", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="contactPhone"
                        type="tel"
                        className="pl-10"
                        placeholder="+1 (555) 000-0000"
                        value={formData.contactPhone}
                        onChange={(e) =>
                          handleInputChange("contactPhone", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="contactRole">Role *</Label>
                    <Select
                      value={formData.contactRole}
                      onValueChange={(value: string) =>
                        handleInputChange("contactRole", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distributor_admin">
                          Distributor Admin
                        </SelectItem>
                        <SelectItem value="distributor_finance">
                          Distributor Finance
                        </SelectItem>
                        <SelectItem value="distributor_manager">
                          Distributor Manager
                        </SelectItem>
                        <SelectItem value="customer_admin">
                          Customer Admin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Location & Message */}
          {currentStep === 3 && (
            <Card className="border-orange-200">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">
                    Location & Additional Info
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Business St"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
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
                        handleInputChange("city", e.target.value)
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
                        handleInputChange("state", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <CountrySelect
                      value={formData.country}
                      onChange={(value) => handleInputChange("country", value)}
                      placeholder="Select country..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="10001"
                      value={formData.zipCode}
                      onChange={(e) =>
                        handleInputChange("zipCode", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="message">Personal Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Add a personal message to the invitation..."
                      value={formData.message}
                      onChange={(e) =>
                        handleInputChange("message", e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
            </div>
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
