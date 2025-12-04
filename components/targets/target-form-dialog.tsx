"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useTargets, SalesTarget, TargetScopeType } from "@/hooks/use-targets";
import { useDistributors } from "@/hooks/use-distributors";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TargetFormDialogProps {
  open: boolean;
  onClose: () => void;
  target: SalesTarget | null;
  onSuccess: () => void;
}

// Common territories/regions
const TERRITORIES = [
  "North America",
  "Latin America",
  "Europe",
  "Middle East",
  "Africa",
  "Asia Pacific",
  "Australia & New Zealand",
];

// Common countries
const COUNTRIES = [
  "USA",
  "Canada",
  "UK",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Brazil",
  "Mexico",
  "Japan",
  "China",
  "India",
  "Australia",
  "UAE",
  "South Africa",
];

export function TargetFormDialog({
  open,
  onClose,
  target,
  onSuccess,
}: TargetFormDialogProps) {
  const { profile } = useEnhancedAuth();
  
  // Form state
  const [targetScope, setTargetScope] = useState<TargetScopeType>("sku");
  const [targetName, setTargetName] = useState("");
  const [sku, setSku] = useState("");
  const [distributorId, setDistributorId] = useState("");
  const [territory, setTerritory] = useState("");
  const [country, setCountry] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [targetPeriod, setTargetPeriod] = useState("");
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createTarget, updateTarget } = useTargets();
  
  // Fetch distributors for dropdown
  const { distributors, loading: distributorsLoading } = useDistributors({
    searchTerm: "",
    filters: { status: "active" },
    brandId: profile?.brand_id,
    isSuperAdmin: profile?.role_name === "super_admin",
  });

  // Load existing target data
  useEffect(() => {
    if (target) {
      setTargetScope(target.target_scope || "sku");
      setTargetName(target.target_name || "");
      setSku(target.sku || "");
      setDistributorId(target.distributor_id || "");
      setTerritory(target.territory || "");
      setCountry(target.country || "");
      setCampaignId(target.campaign_id || "");
      setTargetPeriod(target.target_period);
      setPeriodType(target.period_type);
      setTargetQuantity(target.target_quantity?.toString() || "");
      setTargetRevenue(target.target_revenue?.toString() || "");
      setCurrency(target.currency || "USD");
      setNotes(target.notes || "");
    } else {
      resetForm();
    }
  }, [target, open]);

  const resetForm = () => {
    setTargetScope("sku");
    setTargetName("");
    setSku("");
    setDistributorId("");
    setTerritory("");
    setCountry("");
    setCampaignId("");
    setTargetPeriod("");
    setPeriodType("monthly");
    setTargetQuantity("");
    setTargetRevenue("");
    setCurrency("USD");
    setNotes("");
  };

  // Determine which fields to show based on target scope
  const showSkuField = targetScope === "sku";
  const showDistributorField = targetScope === "distributor" || targetScope === "sku";
  const showTerritoryField = targetScope === "region" || targetScope === "brand";
  const showCountryField = targetScope === "region" || targetScope === "brand";
  const showCampaignField = targetScope === "campaign";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on scope
    if (targetScope === "sku" && !sku) {
      toast.error("SKU is required for SKU-level targets");
      return;
    }
    if (targetScope === "distributor" && !distributorId) {
      toast.error("Distributor is required for distributor-level targets");
      return;
    }
    if (targetScope === "campaign" && !campaignId) {
      toast.error("Campaign ID is required for campaign targets");
      return;
    }
    if (!targetPeriod) {
      toast.error("Target period is required");
      return;
    }
    if (!targetQuantity && !targetRevenue) {
      toast.error("At least one of Target Quantity or Target Revenue is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const targetData: Partial<SalesTarget> = {
        target_scope: targetScope,
        target_name: targetName || null,
        sku: showSkuField && sku ? sku : null,
        distributor_id: showDistributorField && distributorId ? distributorId : null,
        territory: showTerritoryField && territory ? territory : null,
        country: showCountryField && country ? country : null,
        campaign_id: showCampaignField && campaignId ? campaignId : null,
        target_period: targetPeriod,
        period_type: periodType,
        target_quantity: targetQuantity ? parseFloat(targetQuantity) : null,
        target_revenue: targetRevenue ? parseFloat(targetRevenue) : null,
        currency,
        notes: notes || null,
      };

      if (target) {
        await updateTarget({ id: target.id, ...targetData });
        toast.success("Target updated successfully");
      } else {
        await createTarget(targetData);
        toast.success("Target created successfully");
      }

      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save target");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{target ? "Edit Target" : "Create New Target"}</DialogTitle>
          <DialogDescription>
            Set sales targets for SKUs, distributors, regions, or campaigns.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Target Scope */}
            <div>
              <Label htmlFor="target_scope">Target Type *</Label>
              <Select 
                value={targetScope} 
                onValueChange={(v: TargetScopeType) => setTargetScope(v)}
                disabled={!!target}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sku">SKU / Product Level</SelectItem>
                  <SelectItem value="distributor">Distributor Level</SelectItem>
                  <SelectItem value="region">Region / Territory Level</SelectItem>
                  <SelectItem value="brand">Brand Level (Global)</SelectItem>
                  <SelectItem value="campaign">Campaign Target</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {targetScope === "sku" && "Set targets for specific products"}
                {targetScope === "distributor" && "Set overall targets for a distributor"}
                {targetScope === "region" && "Set targets for a geographic region"}
                {targetScope === "brand" && "Set global brand-level targets"}
                {targetScope === "campaign" && "Set targets for marketing campaigns"}
              </p>
            </div>

            {/* Target Name (Optional) */}
            <div>
              <Label htmlFor="target_name">Target Name (Optional)</Label>
              <Input
                id="target_name"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="e.g., Q4 2025 Sales Push"
              />
            </div>

            {/* SKU Field - Show for SKU scope */}
            {showSkuField && (
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Enter product SKU"
                  required={targetScope === "sku"}
                  disabled={!!target && target.sku !== null}
                />
              </div>
            )}

            {/* Distributor Field */}
            {showDistributorField && (
              <div>
                <Label htmlFor="distributor">
                  Distributor {targetScope === "distributor" ? "*" : "(Optional)"}
                </Label>
                <Select 
                  value={distributorId} 
                  onValueChange={setDistributorId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={distributorsLoading ? "Loading..." : "Select distributor"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (All Distributors)</SelectItem>
                    {distributors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} {d.code && `(${d.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Territory Field */}
            {showTerritoryField && (
              <div>
                <Label htmlFor="territory">Territory / Region</Label>
                <Select value={territory} onValueChange={setTerritory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select territory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {TERRITORIES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Country Field */}
            {showCountryField && (
              <div>
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Campaign ID Field */}
            {showCampaignField && (
              <div>
                <Label htmlFor="campaign_id">Campaign ID *</Label>
                <Input
                  id="campaign_id"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  placeholder="Enter campaign identifier"
                  required={targetScope === "campaign"}
                />
              </div>
            )}

            <hr className="my-4" />

            {/* Target Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_period">Target Period *</Label>
                <Input
                  id="target_period"
                  type="date"
                  value={targetPeriod}
                  onChange={(e) => setTargetPeriod(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="period_type">Period Type</Label>
                <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Values */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_quantity">Target Quantity</Label>
                <Input
                  id="target_quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(e.target.value)}
                  placeholder="Units"
                />
              </div>
              <div>
                <Label htmlFor="target_revenue">Target Revenue</Label>
                <div className="flex gap-2">
                  <Input
                    id="target_revenue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={targetRevenue}
                    onChange={(e) => setTargetRevenue(e.target.value)}
                    placeholder="Amount"
                    className="flex-1"
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-20">
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
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this target..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {target ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


