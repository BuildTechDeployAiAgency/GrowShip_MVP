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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrders, Order, OrderStatus, PaymentStatus } from "@/hooks/use-orders";
import { useDistributors, Distributor } from "@/hooks/use-distributors";
import { useProducts, Product } from "@/hooks/use-products";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "react-toastify";
import { Plus, X, ShoppingCart, Package } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderFormDialogProps {
  open: boolean;
  onClose: () => void;
  order?: Order | null;
  onSuccess?: () => void;
}

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
}

interface OrderFormData {
  // Required Fields
  distributor_id: string;
  order_date: string;
  
  // Main Fields
  order_status: OrderStatus;
  notes?: string;
  tags?: string;
  
  // Items
  items: OrderItem[];
  
  // Auto-populated from Distributor (hidden)
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_type: "distributor";
  
  // Brand
  brand_id: string;
  
  // Shipping (auto-populated from Distributor, hidden)
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  shipping_country?: string;
  
  // Financial
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_cost: number;
  total_amount: number;
  currency: string;
  
  // Payment
  payment_status: PaymentStatus;
}

export function OrderFormDialog({
  open,
  onClose,
  order,
  onSuccess,
}: OrderFormDialogProps) {
  const { profile, canPerformAction, profileLoading } = useEnhancedAuth();
  const isSuperAdmin = canPerformAction("view_all_users");
  const { createOrder, updateOrder } = useOrders({
    searchTerm: "",
    filters: {
      status: "all",
      paymentStatus: "all",
      customerType: "all",
      dateRange: "all",
    },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
  });

  const { distributors } = useDistributors({
    searchTerm: "",
    filters: { status: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    isSuperAdmin,
  });

  const { products, loading: productsLoading } = useProducts({
    searchTerm: "",
    filters: { status: "all", category: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    isSuperAdmin,
  });

  // Memoize today's date to prevent hydration issues
  const todayDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const [formData, setFormData] = useState<OrderFormData>({
    distributor_id: "",
    brand_id: "", // Will be auto-populated from selected distributor
    order_date: todayDate,
    order_status: "pending", // Default to pending
    customer_name: "",
    customer_type: "distributor",
    items: [],
    subtotal: 0,
    discount_total: 0,
    tax_total: 0,
    shipping_cost: 0,
    total_amount: 0,
    currency: "AED",
    payment_status: "pending",
  });

  const [currentItem, setCurrentItem] = useState<OrderItem>({
    id: "",
    sku: "",
    product_name: "",
    quantity: 1,
    unit_price: 0,
    discount: 0,
    tax_rate: 0,
    total: 0,
  });

  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug profile and brand_id
  useEffect(() => {
    if (open) {
      console.log("OrderFormDialog Debug:", {
        profileLoading,
        profile,
        brand_id: profile?.brand_id,
        isSuperAdmin,
      });
    }
  }, [open, profile, profileLoading, isSuperAdmin]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && order) {
      // Editing existing order
      setFormData({
        distributor_id: order.distributor_id || "",
        brand_id: order.brand_id,
        order_date: order.order_date.split("T")[0],
        order_status: order.order_status,
        notes: order.notes,
        tags: order.tags?.join(", "),
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_type: "distributor",
        items: order.items || [],
        shipping_address_line1: order.shipping_address_line1,
        shipping_address_line2: order.shipping_address_line2,
        shipping_city: order.shipping_city,
        shipping_state: order.shipping_state,
        shipping_zip_code: order.shipping_zip_code,
        shipping_country: order.shipping_country,
        subtotal: order.subtotal,
        discount_total: order.discount_total || 0,
        tax_total: order.tax_total || 0,
        shipping_cost: order.shipping_cost || 0,
        total_amount: order.total_amount,
        currency: order.currency || "USD",
        payment_status: order.payment_status,
      });
    } else if (open && !profileLoading) {
      // Creating new order - brand will be auto-populated from distributor
      setFormData({
        distributor_id: "",
        brand_id: "", // Will be auto-populated from selected distributor
        order_date: todayDate,
        order_status: "pending",
        customer_name: "",
        customer_type: "distributor",
        items: [],
        subtotal: 0,
        discount_total: 0,
        tax_total: 0,
        shipping_cost: 0,
        total_amount: 0,
        currency: "AED",
        payment_status: "pending",
      });
    }
  }, [open, order, profileLoading, todayDate]);

  // Auto-populate fields when distributor is selected
  useEffect(() => {
    if (formData.distributor_id && distributors.length > 0) {
      const selectedDistributor = distributors.find(
        (d) => d.id === formData.distributor_id
      );
      
      if (selectedDistributor) {
        setFormData((prev) => ({
          ...prev,
          // Auto-populate brand_id from distributor (this is the fix!)
          brand_id: selectedDistributor.brand_id,
          
          // Auto-populate customer info
          customer_name: selectedDistributor.name,
          customer_email: selectedDistributor.contact_email,
          customer_phone: selectedDistributor.contact_phone,
          
          // Auto-populate shipping info
          shipping_address_line1: selectedDistributor.address_line1,
          shipping_address_line2: selectedDistributor.address_line2,
          shipping_city: selectedDistributor.city,
          shipping_state: selectedDistributor.state,
          shipping_zip_code: selectedDistributor.postal_code,
          shipping_country: selectedDistributor.country,
          
          // Set currency if available
          currency: selectedDistributor.currency || "AED",
        }));
      }
    }
  }, [formData.distributor_id, distributors]);

  // Calculate item total
  const calculateItemTotal = (item: OrderItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = (subtotal * item.discount) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * item.tax_rate) / 100;
    return afterDiscount + taxAmount;
  };

  // Update current item total when values change
  useEffect(() => {
    const total = calculateItemTotal(currentItem);
    setCurrentItem((prev) => ({ ...prev, total }));
  }, [
    currentItem.quantity,
    currentItem.unit_price,
    currentItem.discount,
    currentItem.tax_rate,
  ]);

  // Calculate order totals
  useEffect(() => {
    const subtotal = formData.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      return sum + itemSubtotal;
    }, 0);

    const discount_total = formData.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const discountAmount = (itemSubtotal * item.discount) / 100;
      return sum + discountAmount;
    }, 0);

    const tax_total = formData.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const discountAmount = (itemSubtotal * item.discount) / 100;
      const afterDiscount = itemSubtotal - discountAmount;
      const taxAmount = (afterDiscount * item.tax_rate) / 100;
      return sum + taxAmount;
    }, 0);

    const total_amount =
      subtotal - discount_total + tax_total + formData.shipping_cost;

    setFormData((prev) => ({
      ...prev,
      subtotal,
      discount_total,
      tax_total,
      total_amount,
    }));
  }, [formData.items, formData.shipping_cost]);

  const handleAddItem = () => {
    if (!currentItem.sku || !currentItem.product_name) {
      toast.error("Please fill in SKU and Product Name");
      return;
    }

    const newItem = {
      ...currentItem,
      id: `item_${Date.now()}`,
      total: calculateItemTotal(currentItem),
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    // Reset current item
    setCurrentItem({
      id: "",
      sku: "",
      product_name: "",
      quantity: 1,
      unit_price: 0,
      discount: 0,
      tax_rate: 0,
      total: 0,
    });
    setSelectedProductId("");

    toast.success("Item added to order");
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId === "manual" ? "" : productId);
    
    if (!productId || productId === "manual") {
      // Clear fields if no product selected or manual entry
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product) {
      setCurrentItem((prev) => ({
        ...prev,
        sku: product.sku,
        product_name: product.product_name,
        unit_price: product.unit_price,
      }));

      // Show stock warning if low
      if (product.quantity_in_stock === 0) {
        toast.warning(`${product.product_name} is out of stock!`);
      } else if (product.reorder_level && product.quantity_in_stock <= product.reorder_level) {
        toast.info(`${product.product_name} has low stock (${product.quantity_in_stock} available)`);
      }
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
    toast.info("Item removed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.distributor_id) {
      toast.error("Please select a distributor");
      return;
    }

    if (!formData.brand_id) {
      toast.error("Brand information is missing. Please select a distributor first.");
      return;
    }

    if (!formData.order_date) {
      toast.error("Please select an order date");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Please add at least one item to the order");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Form data before submission:", {
        distributor_id: formData.distributor_id,
        brand_id: formData.brand_id,
        customer_name: formData.customer_name,
        items: formData.items,
      });

      const orderData: Partial<Order> = {
        distributor_id: formData.distributor_id,
        brand_id: formData.brand_id,
        order_date: formData.order_date,
        order_status: formData.order_status,
        notes: formData.notes,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        
        // Customer info (auto-populated)
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_type: formData.customer_type,
        
        // Items
        items: formData.items,
        
        // Shipping info (auto-populated)
        shipping_address_line1: formData.shipping_address_line1,
        shipping_address_line2: formData.shipping_address_line2,
        shipping_city: formData.shipping_city,
        shipping_state: formData.shipping_state,
        shipping_zip_code: formData.shipping_zip_code,
        shipping_country: formData.shipping_country,
        
        // Financial
        subtotal: formData.subtotal,
        discount_total: formData.discount_total,
        tax_total: formData.tax_total,
        shipping_cost: formData.shipping_cost,
        total_amount: formData.total_amount,
        currency: formData.currency,
        
        // Payment
        payment_status: formData.payment_status,
      };

      console.log("Submitting order data:", orderData);

      if (order) {
        // Update existing order
        await updateOrder(order.id, orderData);
      } else {
        // Create new order
        console.log("Calling createOrder...");
        const result = await createOrder(orderData);
        console.log("Order created successfully:", result);
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error submitting order:", error);
      console.error("Error details:", {
        message: error?.message,
        stack: error?.stack,
        fullError: error,
      });
      toast.error(error?.message || "Failed to save order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {order ? "Edit Order" : "Create New Order"}
          </DialogTitle>
          <DialogDescription>
            {order
              ? "Update order details below"
              : "Fill in the information to create a new order"}
          </DialogDescription>
        </DialogHeader>

        {/* Show info message about brand being auto-populated */}
        {!order && !formData.brand_id && formData.distributor_id && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Brand will be automatically linked from the selected distributor.
            </p>
          </div>
        )}

        <ScrollArea className="flex-1 px-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4 pr-4 pb-8">
            {/* MAIN FIELDS */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold border-b pb-1.5">
                Order Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Distributor - MANDATORY */}
                <div className="space-y-2">
                  <Label htmlFor="distributor_id">
                    Distributor <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.distributor_id || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        distributor_id: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select distributor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a distributor</SelectItem>
                      {distributors.map((dist) => (
                        <SelectItem key={dist.id} value={dist.id}>
                          {dist.name} {dist.code && `(${dist.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.distributor_id && (
                    <p className="text-xs text-muted-foreground">
                      Customer & shipping details will be auto-populated
                    </p>
                  )}
                </div>

                {/* Order Date - MANDATORY */}
                <div className="space-y-2">
                  <Label htmlFor="order_date">
                    Order Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="order_date"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) =>
                      setFormData({ ...formData, order_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Order Status */}
              <div className="space-y-2">
                <Label htmlFor="order_status">Order Status</Label>
                <Select
                  value={formData.order_status}
                  onValueChange={(value: OrderStatus) =>
                    setFormData({ ...formData, order_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add any additional notes about this order..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="e.g., urgent, wholesale, promotion"
                />
              </div>
            </div>

            {/* ITEMS SECTION */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold border-b pb-1.5 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Order Items
              </h3>

              {/* Add Item Form */}
              <div className="bg-muted/30 p-3 rounded-lg space-y-2.5">
                {/* Product Lookup */}
                <div className="space-y-1.5">
                  <Label htmlFor="product_lookup" className="text-sm flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    Select from Product Catalog
                  </Label>
                  <Select
                    value={selectedProductId || "manual"}
                    onValueChange={handleProductSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product or enter manually below..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      {products
                        .filter((p) => p.status === "active")
                        .map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{product.product_name} ({product.sku})</span>
                              <span className="text-xs text-gray-500 ml-2">
                                ${product.unit_price.toFixed(2)} - Stock: {product.quantity_in_stock}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {productsLoading && (
                    <p className="text-xs text-gray-500">Loading products...</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sku" className="text-sm">SKU</Label>
                    <Input
                      id="sku"
                      value={currentItem.sku}
                      onChange={(e) =>
                        setCurrentItem({ ...currentItem, sku: e.target.value })
                      }
                      placeholder="Enter SKU"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="product_name" className="text-sm">Product Name</Label>
                    <Input
                      id="product_name"
                      value={currentItem.product_name}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          product_name: e.target.value,
                        })
                      }
                      placeholder="Enter product name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity" className="text-sm">Quantity</Label>
                    <Input
                      id="quantity"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g., 10"
                      value={currentItem.quantity === 0 ? "" : currentItem.quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty, numbers, and decimals
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          const numValue = value === "" ? 0 : parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setCurrentItem({
                              ...currentItem,
                              quantity: numValue,
                            });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // Ensure at least 1 on blur if field is empty or 0
                        if (e.target.value === "" || parseFloat(e.target.value) === 0) {
                          setCurrentItem({ ...currentItem, quantity: 1 });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="unit_price" className="text-sm">Unit Price ($)</Label>
                    <Input
                      id="unit_price"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g., 99.99"
                      value={currentItem.unit_price === 0 ? "" : currentItem.unit_price}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty, numbers, and decimals
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          const numValue = value === "" ? 0 : parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setCurrentItem({
                              ...currentItem,
                              unit_price: numValue,
                            });
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="discount" className="text-sm">Discount (%)</Label>
                    <Input
                      id="discount"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g., 10"
                      value={currentItem.discount === 0 ? "" : currentItem.discount}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty, numbers, and decimals
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          const numValue = value === "" ? 0 : parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                            setCurrentItem({
                              ...currentItem,
                              discount: numValue,
                            });
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tax_rate" className="text-sm">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g., 5"
                      value={currentItem.tax_rate === 0 ? "" : currentItem.tax_rate}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty, numbers, and decimals
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          const numValue = value === "" ? 0 : parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                            setCurrentItem({
                              ...currentItem,
                              tax_rate: numValue,
                            });
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Item Total: </span>
                    <span className="font-semibold">
                      ${currentItem.total.toFixed(2)}
                    </span>
                  </div>
                  <Button type="button" onClick={handleAddItem} size="sm" className="shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Items List */}
              {formData.items.length > 0 && (
                <div className="space-y-2">
                  <Label>Added Items ({formData.items.length})</Label>
                  <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                    {formData.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 flex items-center justify-between hover:bg-muted/50"
                      >
                        <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="font-medium">{item.sku}</div>
                            <div className="text-muted-foreground text-xs">
                              {item.product_name}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Qty
                            </div>
                            <div>{item.quantity}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Price
                            </div>
                            <div>${item.unit_price.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Discount
                            </div>
                            <div>{item.discount}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Total
                            </div>
                            <div className="font-semibold">
                              ${item.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="ml-4"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>${formData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-red-600">
                    -${formData.discount_total.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>${formData.tax_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span>${formData.shipping_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total Amount:</span>
                  <span className="text-primary">
                    ${formData.total_amount.toFixed(2)} {formData.currency}
                  </span>
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={
              isSubmitting || 
              !formData.distributor_id || 
              !formData.order_date ||
              formData.items.length === 0
            }
          >
            {isSubmitting
              ? "Saving..."
              : order
              ? "Update Order"
              : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
