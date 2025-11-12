"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTargets, SalesTarget } from "@/hooks/use-targets";
import { toast } from "react-toastify";

interface TargetFormDialogProps {
  open: boolean;
  onClose: () => void;
  target: SalesTarget | null;
  onSuccess: () => void;
}

export function TargetFormDialog({
  open,
  onClose,
  target,
  onSuccess,
}: TargetFormDialogProps) {
  const [sku, setSku] = useState("");
  const [targetPeriod, setTargetPeriod] = useState("");
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");
  const { createTarget, updateTarget } = useTargets();

  useEffect(() => {
    if (target) {
      setSku(target.sku);
      setTargetPeriod(target.target_period);
      setPeriodType(target.period_type);
      setTargetQuantity(target.target_quantity?.toString() || "");
      setTargetRevenue(target.target_revenue?.toString() || "");
    } else {
      resetForm();
    }
  }, [target, open]);

  const resetForm = () => {
    setSku("");
    setTargetPeriod("");
    setPeriodType("monthly");
    setTargetQuantity("");
    setTargetRevenue("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sku || !targetPeriod) {
      toast.error("SKU and target period are required");
      return;
    }

    try {
      const targetData = {
        sku,
        target_period: targetPeriod,
        period_type: periodType,
        target_quantity: targetQuantity ? parseFloat(targetQuantity) : undefined,
        target_revenue: targetRevenue ? parseFloat(targetRevenue) : undefined,
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
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{target ? "Edit Target" : "Create New Target"}</DialogTitle>
          <DialogDescription>
            Set sales targets for a specific SKU and time period.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Enter SKU"
                required
                disabled={!!target}
              />
            </div>
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
            <div>
              <Label htmlFor="target_quantity">Target Quantity</Label>
              <Input
                id="target_quantity"
                type="number"
                step="0.01"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                placeholder="Enter target quantity"
              />
            </div>
            <div>
              <Label htmlFor="target_revenue">Target Revenue</Label>
              <Input
                id="target_revenue"
                type="number"
                step="0.01"
                value={targetRevenue}
                onChange={(e) => setTargetRevenue(e.target.value)}
                placeholder="Enter target revenue"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{target ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


