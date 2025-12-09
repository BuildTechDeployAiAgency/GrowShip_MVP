"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Users,
  MapPin,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
  Search,
  Plus,
} from "lucide-react";
import {
  CreateRelationshipData,
  AssignDistributorFormData,
  TerritoryPriority,
  RelationshipStatus,
} from "@/types/relationships";
import { Brand } from "@/types/auth";
import { useOrganizations } from "@/hooks/use-organizations";
import { useDistributors } from "@/hooks/use-distributors";
import { useBulkAssignDistributors } from "@/hooks/use-relationships";
import { toast } from "sonner";

interface AssignDistributorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedBrand?: string;
  preselectedDistributors?: string[];
  onSuccess?: () => void;
}

export function AssignDistributorDialog({
  open,
  onOpenChange,
  preselectedBrand,
  preselectedDistributors = [],
  onSuccess,
}: AssignDistributorDialogProps) {
  const [formData, setFormData] = useState<AssignDistributorFormData>({
    brand_id: preselectedBrand || "",
    distributor_ids: preselectedDistributors,
    territory_priority: "primary",
    assigned_territories: [],
    commission_rate: "",
    contract_start_date: "",
    contract_end_date: "",
    exclusive_territories: false,
    payment_terms: "",
    shipping_terms: "",
    justification: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [territoryInput, setTerritoryInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const prevOpenRef = useRef(open);

  // Fetch data
  const { organizations, loading: organizationsLoading } = useOrganizations();
  const { distributors, loading: distributorsLoading } = useDistributors({
    searchTerm: "",
    filters: { status: "all" },
    isSuperAdmin: true // For super admin, we want to see all distributors
  });
  const bulkAssignMutation = useBulkAssignDistributors();

  // Filter brands and distributors
  const brands = organizations?.filter(org => 
    org.organization_type === "brand" || org.organization_type === "manufacturer"
  ) || [];

  const availableDistributors = distributors?.filter(distributor => {
    const matchesSearch = !searchTerm || 
      distributor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (distributor as any).company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Don't show distributors that already belong to the selected brand
    const notAlreadyAssigned = !formData.brand_id || distributor.brand_id !== formData.brand_id;
    
    return matchesSearch && notAlreadyAssigned;
  }) || [];

  const selectedBrand = brands.find(b => b.id === formData.brand_id);
  const selectedDistributors = formData.distributor_ids.map(id => 
    distributors?.find(d => d.id === id)
  ).filter(Boolean);

  // Reset form when dialog opens (only when transitioning from closed to open)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFormData({
        brand_id: preselectedBrand || "",
        distributor_ids: preselectedDistributors ? [...preselectedDistributors] : [],
        territory_priority: "primary",
        assigned_territories: [],
        commission_rate: "",
        contract_start_date: "",
        contract_end_date: "",
        exclusive_territories: false,
        payment_terms: "",
        shipping_terms: "",
        justification: "",
      });
      setSearchTerm("");
      setTerritoryInput("");
      setErrors({});
    }
    prevOpenRef.current = open;
  }, [open]); // Only depend on open state

  const handleDistributorToggle = (distributorId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      distributor_ids: checked
        ? [...prev.distributor_ids, distributorId]
        : prev.distributor_ids.filter(id => id !== distributorId)
    }));
  };

  const handleAddTerritory = () => {
    if (territoryInput.trim()) {
      setFormData(prev => ({
        ...prev,
        assigned_territories: [...prev.assigned_territories, territoryInput.trim()]
      }));
      setTerritoryInput("");
    }
  };

  const handleRemoveTerritory = (territory: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_territories: prev.assigned_territories.filter(t => t !== territory)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.brand_id) {
      newErrors.brand_id = "Please select a brand";
    }

    if (formData.distributor_ids.length === 0) {
      newErrors.distributor_ids = "Please select at least one distributor";
    }

    if (formData.commission_rate && (isNaN(Number(formData.commission_rate)) || Number(formData.commission_rate) < 0 || Number(formData.commission_rate) > 100)) {
      newErrors.commission_rate = "Commission rate must be between 0 and 100";
    }

    if (formData.contract_start_date && formData.contract_end_date) {
      const startDate = new Date(formData.contract_start_date);
      const endDate = new Date(formData.contract_end_date);
      if (endDate <= startDate) {
        newErrors.contract_end_date = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Create relationship data for each selected distributor
      const relationships: CreateRelationshipData[] = formData.distributor_ids.map(distributorId => ({
        brand_id: formData.brand_id,
        distributor_id: distributorId,
        status: "active" as RelationshipStatus,
        territory_priority: formData.territory_priority,
        assigned_territories: formData.assigned_territories,
        commission_rate: formData.commission_rate ? Number(formData.commission_rate) : undefined,
        contract_start_date: formData.contract_start_date || undefined,
        contract_end_date: formData.contract_end_date || undefined,
        payment_terms: formData.payment_terms || undefined,
        shipping_terms: formData.shipping_terms || undefined,
        exclusive_territories: formData.exclusive_territories,
        change_reason: formData.justification || undefined,
      }));

      await bulkAssignMutation.mutateAsync(relationships);

      // Success handled by the mutation
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error assigning distributors:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-6 w-6 text-teal-600" />
            Assign Distributors to Brand
          </DialogTitle>
          <DialogDescription>
            Create new relationships between a brand and one or more distributors.
            Set territories, commission rates, and contract terms.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Brand Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Brand *
              </Label>
              <Select
                value={formData.brand_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, brand_id: value }))}
                disabled={!!preselectedBrand}
              >
                <SelectTrigger className={errors.brand_id ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select a brand or manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name} ({brand.organization_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.brand_id && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.brand_id}
                </p>
              )}
            </div>

            {/* Distributor Selection */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Distributors * ({formData.distributor_ids.length} selected)
              </Label>

              {/* Selected Distributors */}
              {selectedDistributors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Distributors:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDistributors.map((distributor) => distributor && (
                      <Badge
                        key={distributor.id}
                        variant="default"
                        className="flex items-center gap-1 pr-1"
                      >
                        {distributor.name}
                        <button
                          type="button"
                          onClick={() => handleDistributorToggle(distributor.id, false)}
                          className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Distributor Search */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search available distributors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className={`border rounded-md p-3 max-h-48 overflow-y-auto ${errors.distributor_ids ? "border-red-500" : ""}`}>
                  {distributorsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                      <span className="ml-2 text-sm">Loading distributors...</span>
                    </div>
                  ) : availableDistributors.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchTerm ? "No distributors found matching your search" : "No available distributors"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableDistributors.map((distributor) => (
                        <div key={distributor.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded">
                          <Checkbox
                            id={`distributor-${distributor.id}`}
                            checked={formData.distributor_ids.includes(distributor.id)}
                            onCheckedChange={(checked) => 
                              handleDistributorToggle(distributor.id, checked as boolean)
                            }
                          />
                          <label 
                            htmlFor={`distributor-${distributor.id}`} 
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium">{distributor.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {distributor.contact_name && `${distributor.contact_name} - `}{distributor.city || distributor.country || 'No location'}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {errors.distributor_ids && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.distributor_ids}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Relationship Configuration */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Relationship Configuration</h3>

              {/* Territory Priority */}
              <div className="space-y-2">
                <Label>Territory Priority</Label>
                <Select
                  value={formData.territory_priority}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    territory_priority: value as TerritoryPriority 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary (Main distributor)</SelectItem>
                    <SelectItem value="secondary">Secondary (Backup distributor)</SelectItem>
                    <SelectItem value="shared">Shared (Equal access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned Territories */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Assigned Territories
                </Label>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter territory name..."
                    value={territoryInput}
                    onChange={(e) => setTerritoryInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddTerritory()}
                  />
                  <Button type="button" onClick={handleAddTerritory} disabled={!territoryInput.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {formData.assigned_territories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.assigned_territories.map((territory) => (
                      <Badge
                        key={territory}
                        variant="outline"
                        className="flex items-center gap-1 pr-1"
                      >
                        {territory}
                        <button
                          type="button"
                          onClick={() => handleRemoveTerritory(territory)}
                          className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclusive-territories"
                    checked={formData.exclusive_territories}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      exclusive_territories: checked as boolean 
                    }))}
                  />
                  <label htmlFor="exclusive-territories" className="text-sm">
                    Exclusive territories (distributor has exclusive access)
                  </label>
                </div>
              </div>

              {/* Business Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Commission Rate (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 15.5"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, commission_rate: e.target.value }))}
                    className={errors.commission_rate ? "border-red-500" : ""}
                  />
                  {errors.commission_rate && (
                    <p className="text-sm text-red-600">{errors.commission_rate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_terms: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="Net 90">Net 90</SelectItem>
                      <SelectItem value="COD">Cash on Delivery</SelectItem>
                      <SelectItem value="Prepaid">Prepaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Contract Start Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_start_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Contract End Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.contract_end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_end_date: e.target.value }))}
                    className={errors.contract_end_date ? "border-red-500" : ""}
                  />
                  {errors.contract_end_date && (
                    <p className="text-sm text-red-600">{errors.contract_end_date}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Shipping Terms</Label>
                  <Select
                    value={formData.shipping_terms}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, shipping_terms: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shipping terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOB">FOB (Free on Board)</SelectItem>
                      <SelectItem value="CIF">CIF (Cost, Insurance, and Freight)</SelectItem>
                      <SelectItem value="DDP">DDP (Delivered Duty Paid)</SelectItem>
                      <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Justification */}
              <div className="space-y-2">
                <Label>Justification</Label>
                <Textarea
                  placeholder="Provide a reason for creating this relationship..."
                  value={formData.justification}
                  onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={bulkAssignMutation.isPending}
            className="flex items-center gap-2"
          >
            {bulkAssignMutation.isPending ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Assign Distributors ({formData.distributor_ids.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}