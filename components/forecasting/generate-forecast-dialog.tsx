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
import { useForecasting } from "@/hooks/use-forecasting";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GenerateForecastDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GenerateForecastDialog({
  open,
  onClose,
  onSuccess,
}: GenerateForecastDialogProps) {
  const { profile } = useEnhancedAuth();
  const { generateForecast, isGenerating } = useForecasting();

  const [sku, setSku] = useState("");
  const [forecastPeriodStart, setForecastPeriodStart] = useState("");
  const [forecastPeriodEnd, setForecastPeriodEnd] = useState("");
  const [algorithm, setAlgorithm] = useState<"simple_moving_average" | "exponential_smoothing" | "trend_analysis">("simple_moving_average");
  const [compareAlgorithms, setCompareAlgorithms] = useState(false);

  useEffect(() => {
    if (open) {
      // Set default dates: start today, end 3 months from now
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      setForecastPeriodStart(today.toISOString().split("T")[0]);
      setForecastPeriodEnd(threeMonthsLater.toISOString().split("T")[0]);
      setSku("");
      setAlgorithm("simple_moving_average");
      setCompareAlgorithms(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forecastPeriodStart || !forecastPeriodEnd) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(forecastPeriodStart) >= new Date(forecastPeriodEnd)) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      const result = await generateForecast({
        brand_id: profile?.brand_id,
        sku: sku || undefined,
        forecast_period_start: forecastPeriodStart,
        forecast_period_end: forecastPeriodEnd,
        algorithm_version: algorithm,
        compare_algorithms: compareAlgorithms,
      });

      toast.success(`Successfully generated ${result.forecasts?.length || 0} forecast(s)`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate forecast");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Demand Forecast</DialogTitle>
          <DialogDescription>
            Generate demand forecasts for your products using historical sales data
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sku">SKU (Optional)</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Leave empty to forecast all SKUs"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to generate forecasts for all SKUs with sales history
              </p>
            </div>

            <div>
              <Label htmlFor="forecast_period_start">Forecast Period Start *</Label>
              <Input
                id="forecast_period_start"
                type="date"
                value={forecastPeriodStart}
                onChange={(e) => setForecastPeriodStart(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="forecast_period_end">Forecast Period End *</Label>
              <Input
                id="forecast_period_end"
                type="date"
                value={forecastPeriodEnd}
                onChange={(e) => setForecastPeriodEnd(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 3-6 months ahead for best accuracy
              </p>
            </div>

            <div>
              <Label htmlFor="algorithm">Forecasting Algorithm</Label>
              <Select value={algorithm} onValueChange={(v: any) => setAlgorithm(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_moving_average">
                    Simple Moving Average
                  </SelectItem>
                  <SelectItem value="exponential_smoothing">
                    Exponential Smoothing
                  </SelectItem>
                  <SelectItem value="trend_analysis">Trend Analysis</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {algorithm === "simple_moving_average" && "Best for stable demand patterns"}
                {algorithm === "exponential_smoothing" && "Best for recent trends"}
                {algorithm === "trend_analysis" && "Best for long-term trends (requires 6+ months data)"}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="compare_algorithms"
                checked={compareAlgorithms}
                onChange={(e) => setCompareAlgorithms(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="compare_algorithms" className="text-sm font-normal">
                Compare all algorithms (slower but provides comparison data)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Forecast"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

