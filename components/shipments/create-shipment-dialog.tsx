"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package, Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import type { Order, OrderLine } from "@/types/orders";
import type { CreateShipmentInput, CreateShipmentItem } from "@/types/shipments";

interface CreateShipmentDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  onSuccess?: () => void;
}

interface ShipmentFormData {
  carrier: string;
  tracking_number: string;
  shipping_method: string;
  notes: string;
}

interface OrderLineWithInventory extends OrderLine {
  available_stock?: number;
  quantity_in_stock?: number;
  products?: {
    id: string;
    sku: string;
    quantity_in_stock: number;
    available_stock: number;
    allocated_stock: number;
  } | null;
}

const CARRIERS = [
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "usps", label: "USPS" },
  { value: "dhl", label: "DHL" },
  { value: "ontrac", label: "OnTrac" },
  { value: "amazon", label: "Amazon Logistics" },
  { value: "other", label: "Other" },
];

const SHIPPING_METHODS = [
  { value: "ground", label: "Ground" },
  { value: "express", label: "Express" },
  { value: "overnight", label: "Overnight" },
  { value: "two_day", label: "2-Day" },
  { value: "freight", label: "Freight" },
  { value: "pickup", label: "Customer Pickup" },
];

export function CreateShipmentDialog({
  open,
  onClose,
  order,
  onSuccess,
}: CreateShipmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [orderLines, setOrderLines] = useState<OrderLineWithInventory[]>([]);
  const [loadingLines, setLoadingLines] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [selectAll, setSelectAll] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShipmentFormData>({
    defaultValues: {
      carrier: "",
      tracking_number: "",
      shipping_method: "",
      notes: "",
    },
  });

  const carrier = watch("carrier");
  const shippingMethod = watch("shipping_method");

  // Fetch order lines with inventory info
  useEffect(() => {
    if (!open || !order.id) return;

    const fetchOrderLines = async () => {
      setLoadingLines(true);
      const supabase = createClient();

      // Fetch order lines
      const { data: lines, error: linesError } = await supabase
        .from("order_lines")
        .select(
          `
          id,
          order_id,
          product_id,
          sku,
          product_name,
          quantity,
          unit_price,
          discount,
          tax,
          total,
          shipped_quantity,
          products:products!order_lines_product_id_fkey (
            id,
            quantity_in_stock,
            available_stock,
            allocated_stock,
            sku
          )
        `
        )
        .eq("order_id", order.id);

      if (linesError) {
        console.error("Error fetching order lines:", linesError);
        toast.error("Failed to load order items");
        setLoadingLines(false);
        return;
      }

      let transformedLines: OrderLineWithInventory[] = (lines || []).map(
        (line: any) => ({
          ...line,
          available_stock: line.products?.available_stock ?? line.products?.quantity_in_stock ?? 0,
          quantity_in_stock: line.products?.quantity_in_stock ?? 0,
        })
      );

      // For legacy order lines that lack a product relation, fall back to SKU lookup
      const linesMissingInventory = transformedLines.filter(
        (line) => (!line.product_id || !line.products) && line.sku
      );
      if (linesMissingInventory.length > 0) {
        const uniqueSkus = Array.from(new Set(linesMissingInventory.map((line) => line.sku)));
        const { data: skuProducts, error: skuError } = await supabase
          .from("products")
          .select("id, sku, quantity_in_stock, available_stock, allocated_stock")
          .in("sku", uniqueSkus);

        if (!skuError && skuProducts) {
          const skuMap = skuProducts.reduce<Record<string, any>>((acc, product) => {
            acc[product.sku] = product;
            return acc;
          }, {});

          transformedLines = transformedLines.map((line) => {
            if (line.products || !line.sku) {
              return line;
            }
            const fallback = skuMap[line.sku];
            if (!fallback) {
              return line;
            }
            return {
              ...line,
              available_stock: fallback.available_stock ?? fallback.quantity_in_stock ?? line.available_stock ?? 0,
              quantity_in_stock: fallback.quantity_in_stock ?? line.quantity_in_stock ?? 0,
            };
          });
        }
      }

      setOrderLines(transformedLines);

      // Initialize selected items with remaining quantities
      const initialSelected: Record<string, number> = {};
      transformedLines.forEach((line) => {
        const remaining = line.quantity - (line.shipped_quantity || 0);
        if (remaining > 0) {
          // Default to remaining quantity or available stock, whichever is lower
          const maxShippable = Math.min(remaining, line.available_stock || 0);
          initialSelected[line.id] = maxShippable > 0 ? maxShippable : 0;
        }
      });
      setSelectedItems(initialSelected);
      setLoadingLines(false);
    };

    fetchOrderLines();
  }, [open, order.id]);

  // Calculate remaining quantities
  const itemsWithRemaining = useMemo(() => {
    return orderLines.map((line) => ({
      ...line,
      remaining: Math.max(0, line.quantity - (line.shipped_quantity || 0)),
    }));
  }, [orderLines]);

  // Check if any items can be shipped
  const canShipAnyItems = useMemo(() => {
    return (
      itemsWithRemaining.length > 0 &&
      itemsWithRemaining.some((item) => item.remaining > 0)
    );
  }, [itemsWithRemaining]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalItems = 0;
    let totalValue = 0;

    Object.entries(selectedItems).forEach(([lineId, qty]) => {
      if (qty > 0) {
        const line = orderLines.find((l) => l.id === lineId);
        if (line) {
          totalItems += qty;
          totalValue += qty * line.unit_price;
        }
      }
    });

    return { totalItems, totalValue };
  }, [selectedItems, orderLines]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const newSelected: Record<string, number> = {};
      itemsWithRemaining.forEach((item) => {
        if (item.remaining > 0) {
          const maxShippable = Math.min(item.remaining, item.available_stock || 0);
          newSelected[item.id] = maxShippable > 0 ? maxShippable : item.remaining;
        }
      });
      setSelectedItems(newSelected);
    } else {
      setSelectedItems({});
    }
  };

  // Handle individual item quantity change
  const handleQuantityChange = (lineId: string, quantity: number) => {
    const line = itemsWithRemaining.find((l) => l.id === lineId);
    if (!line) return;

    const maxQty = line.remaining;
    const validQty = Math.max(0, Math.min(quantity, maxQty));

    setSelectedItems((prev) => ({
      ...prev,
      [lineId]: validQty,
    }));
  };

  // Submit handler
  const onSubmit = async (data: ShipmentFormData) => {
    // Validate at least one item is selected
    const itemsToShip = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([lineId, qty]) => {
        const line = orderLines.find((l) => l.id === lineId);
        return {
          order_line_id: lineId,
          product_id: line?.product_id,
          sku: line?.sku || "",
          product_name: line?.product_name,
          quantity_to_ship: qty,
          unit_price: line?.unit_price,
        } as CreateShipmentItem;
      });

    if (itemsToShip.length === 0) {
      toast.error("Please select at least one item to ship");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const input: CreateShipmentInput = {
        order_id: order.id,
        carrier: data.carrier || undefined,
        tracking_number: data.tracking_number || undefined,
        shipping_method: data.shipping_method || undefined,
        notes: data.notes || undefined,
        items: itemsToShip,
      };

      // Call the RPC function
      const { data: result, error: rpcError } = await supabase.rpc(
        "create_shipment_transaction",
        {
          p_order_id: input.order_id,
          p_carrier: input.carrier || null,
          p_tracking_number: input.tracking_number || null,
          p_shipping_method: input.shipping_method || null,
          p_notes: input.notes || null,
          p_items: input.items,
          p_user_id: user?.id || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to create shipment");
      }

      toast.success(`Shipment ${result.shipment_number} created successfully!`);
      reset();
      setSelectedItems({});
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error creating shipment:", error);
      toast.error(error.message || "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedItems({});
    setSelectAll(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-600" />
            Create Shipment
          </DialogTitle>
          <DialogDescription>
            Create a shipment for order {order.order_number}. Select the items
            and quantities to ship.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Info Summary */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Order:</span>
                  <p className="font-medium">{order.order_number}</p>
                </div>
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <p className="font-medium">{order.customer_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Badge variant="outline" className="ml-1">
                    {order.order_status}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Fulfilment:</span>
                  <Badge
                    variant="outline"
                    className={`ml-1 ${
                      order.fulfilment_status === "fulfilled"
                        ? "bg-green-100 text-green-800"
                        : order.fulfilment_status === "partial"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100"
                    }`}
                  >
                    {order.fulfilment_status || "pending"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              <Select
                value={carrier}
                onValueChange={(value) => setValue("carrier", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking_number">Tracking Number</Label>
              <Input
                id="tracking_number"
                {...register("tracking_number")}
                placeholder="Enter tracking number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping_method">Shipping Method</Label>
              <Select
                value={shippingMethod}
                onValueChange={(value) => setValue("shipping_method", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Items Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items to Ship
              </h3>
              {canShipAnyItems && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked as boolean)
                    }
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">
                    Ship all remaining
                  </Label>
                </div>
              )}
            </div>

            {loadingLines ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
              </div>
            ) : orderLines.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                No order lines are available for shipping. Refresh the order or contact support.
              </div>
            ) : !canShipAnyItems ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                All items have been shipped
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">
                        SKU / Product
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">
                        Ordered
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">
                        Shipped
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">
                        Remaining
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">
                        Available
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">
                        To Ship
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itemsWithRemaining.map((item) => {
                      const hasLowStock =
                        (item.available_stock || 0) < item.remaining;
                      const isFullyShipped = item.remaining <= 0;

                      return (
                        <tr
                          key={item.id}
                          className={`${
                            isFullyShipped ? "bg-gray-50 opacity-60" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.sku}</div>
                            <div className="text-gray-500 text-xs">
                              {item.product_name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.shipped_quantity || 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.remaining}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`${
                                hasLowStock && !isFullyShipped
                                  ? "text-amber-600"
                                  : ""
                              }`}
                            >
                              {item.available_stock ?? "N/A"}
                            </span>
                            {hasLowStock && !isFullyShipped && (
                              <AlertCircle className="inline-block h-3 w-3 ml-1 text-amber-500" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isFullyShipped ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                max={item.remaining}
                                value={selectedItems[item.id] || 0}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.id,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-20 text-right h-8"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totals */}
          {totals.totalItems > 0 && (
            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-600">
                      Items to ship:
                    </span>
                    <span className="ml-2 font-semibold">
                      {totals.totalItems}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total value:</span>
                    <span className="ml-2 font-semibold text-teal-700">
                      ${totals.totalValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Add any notes about this shipment..."
              rows={2}
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
            <Button
              type="submit"
              disabled={loading || totals.totalItems === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Create Shipment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
