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
import { usePurchaseOrders } from "@/hooks/use-purchase-orders";
import type {
  PurchaseOrder,
  POStatus,
  PaymentStatus,
  PurchaseOrderLine,
} from "@/types/purchase-orders";
import { useDistributors, type Distributor } from "@/hooks/use-distributors";
import { useProducts } from "@/hooks/use-products";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import { Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductLookup } from "@/components/products/product-lookup";

interface POFormDialogProps {
  open: boolean;
  onClose: () => void;
  po?: PurchaseOrder | null;
  onSuccess?: () => void;
}

interface POItem {
  id: string;
  sku: string;
  product_name: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  total: number;
  currency?: string;
  notes?: string;
}

interface POFormData {
  // Purchaser Information (populated from Distributor)
  supplier_name: string;
  supplier_email?: string;
  supplier_phone?: string;
  
  // Purchase Order Details
  po_date: string;
  distributor_id?: string;
  brand_id: string;
  
  // Status
  po_status: POStatus;
  payment_status: PaymentStatus;
  
  // Items
  items: POItem[];
  
  // Financial
  subtotal: number;
  tax_total: number;
  shipping_cost: number;
  total_amount: number;
  currency: string;
  
  // Dates
  expected_delivery_date?: string;
  
  // Additional
  notes?: string;
  tags?: string[];
}

export function POFormDialog({
  open,
  onClose,
  po,
  onSuccess,
}: POFormDialogProps) {
  const { profile, canPerformAction } = useEnhancedAuth();
  const isSuperAdmin = canPerformAction("view_all_users");
  const isDistributorAdmin = profile?.role_name?.startsWith("distributor_");
  
  const { createPurchaseOrder, updatePurchaseOrder } = usePurchaseOrders({
    searchTerm: "",
    filters: {
      status: "all",
      paymentStatus: "all",
      dateRange: "all",
    },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    distributorId: isDistributorAdmin ? profile?.distributor_id : undefined,
  });

  const { distributors, loading: distributorsLoading } = useDistributors({
    searchTerm: "",
    filters: { status: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    distributorId: isDistributorAdmin ? profile?.distributor_id : undefined,
    isSuperAdmin,
  });

  const { products, loading: productsLoading } = useProducts({
    searchTerm: "",
    filters: { status: "all", category: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    isSuperAdmin,
    pageSize: 200,
  });

  // Memoize today's date to prevent hydration issues
  const todayDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const [formData, setFormData] = useState<POFormData>({
    supplier_name: "", // Will be auto-populated from distributor
    supplier_email: "",
    supplier_phone: "",
    po_date: todayDate,
    distributor_id: undefined,
    brand_id: profile?.brand_id || "",
    po_status: "draft",
    payment_status: "pending",
    items: [],
    subtotal: 0,
    tax_total: 0,
    shipping_cost: 0,
    total_amount: 0,
    currency: "USD",
    expected_delivery_date: undefined,
    notes: "",
    tags: [],
  });

  const [currentItem, setCurrentItem] = useState<POItem>({
    id: "",
    sku: "",
    product_name: "",
    product_id: undefined,
    quantity: 1,
    unit_price: 0,
    total: 0,
    currency: "USD",
    notes: "",
  });

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  // State to store the current distributor details for Distributor Admin users
  const [currentDistributor, setCurrentDistributor] = useState<Distributor | null>(null);

  // For Distributor Admin users, fetch the distributor directly
  // This bypasses any caching issues with the useDistributors hook
  useEffect(() => {
    if (!isDistributorAdmin || !open || !profile?.distributor_id) {
      return;
    }


    const fetchDistributor = async () => {
      try {
        const supabase = createClient();
        let query = supabase
          .from("distributors")
          .select("*")
          .eq("id", profile.distributor_id!);

        if (profile.brand_id) {
          query = query.eq("brand_id", profile.brand_id);
        }

        const { data, error } = await query.limit(1).maybeSingle();

        if (error) {
          // Try fallback to hook data
          if (distributors.length > 0) {
            const distributor = distributors.find(d => d.id === profile.distributor_id) || distributors[0];
            setCurrentDistributor(distributor);
          }
          return;
        }

        if (data) {
          setCurrentDistributor(data as Distributor);
        } else {
          // Try fallback to hook data
          if (distributors.length > 0) {
            const distributor = distributors[0];
            setCurrentDistributor(distributor);
          } else {
            // Create a minimal distributor object with the ID
            // This allows the form to work even if RLS blocks the query
            // Use the user's company name or contact name as a fallback
            const fallbackName = profile.company_name || profile.contact_name || "Distributor";
            setCurrentDistributor({
              id: profile.distributor_id!,
              name: fallbackName,
              brand_id: profile.brand_id || "",
              contact_email: profile.email || "",
              contact_phone: "",
              contact_name: profile.contact_name || "",
              code: "",
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Distributor);
          }
        }
      } catch (err) {
        // Silent catch - fallback will be used
      }
    };

    // Only fetch if we don't have currentDistributor yet
    if (!currentDistributor) {
      fetchDistributor();
    }
  }, [isDistributorAdmin, profile?.distributor_id, profile?.brand_id, open, distributors, currentDistributor]);

  // Update brand_id when profile changes
  useEffect(() => {
    if (profile?.brand_id && !po) {
      setFormData((prev) => ({ ...prev, brand_id: profile.brand_id! }));
    }
  }, [profile?.brand_id, po]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && po) {
      // Editing existing PO
      const itemsWithIds = (po.purchase_order_lines || po.items || []).map((item: any, index: number) => ({
        id: item.id || `item-${Date.now()}-${index}`,
        sku: item.sku || "",
        product_name: item.product_name || "",
        product_id: item.product_id,
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total: item.total || (item.quantity * item.unit_price) || 0,
        currency: item.currency || "USD",
        notes: item.notes || "",
      }));

      setFormData({
        supplier_name: po.supplier_name || "",
        supplier_email: po.supplier_email || "",
        supplier_phone: po.supplier_phone || "",
        po_date: po.po_date ? po.po_date.split("T")[0] : todayDate,
        distributor_id: po.distributor_id || undefined,
        brand_id: po.brand_id,
        po_status: po.po_status,
        payment_status: po.payment_status,
        items: itemsWithIds,
        subtotal: po.subtotal || 0,
        tax_total: po.tax_total || 0,
        shipping_cost: po.shipping_cost || 0,
        total_amount: po.total_amount || 0,
        currency: po.currency || "USD",
        expected_delivery_date: po.expected_delivery_date ? po.expected_delivery_date.split("T")[0] : undefined,
        notes: po.notes || "",
        tags: po.tags || [],
      });
    } else if (open && !po) {
      // Creating new PO - reset to defaults
      const initialDistributorId = isDistributorAdmin && profile?.distributor_id 
        ? profile.distributor_id 
        : undefined;

      const initialBrandId = isDistributorAdmin && profile?.brand_id
        ? profile.brand_id
        : (profile?.brand_id || "");

      // For distributor admin, use currentDistributor data if available
      const distributorData = isDistributorAdmin && currentDistributor ? currentDistributor : null;

      setFormData({
        supplier_name: distributorData?.name || "",
        supplier_email: distributorData?.contact_email || "",
        supplier_phone: distributorData?.contact_phone || "",
        po_date: todayDate,
        distributor_id: initialDistributorId,
        brand_id: distributorData?.brand_id || initialBrandId,
        po_status: "draft",
        payment_status: "pending",
        items: [],
        subtotal: 0,
        tax_total: 0,
        shipping_cost: 0,
        total_amount: 0,
        currency: "USD",
        expected_delivery_date: undefined,
        notes: "",
        tags: [],
      });
      setCurrentItem({
        id: "",
        sku: "",
        product_name: "",
        product_id: undefined,
        quantity: 1,
        unit_price: 0,
        total: 0,
        currency: "USD",
        notes: "",
      });
      setSelectedProductId("");
      setActiveTab("details");
    }
  }, [open, po, todayDate, profile?.brand_id, isDistributorAdmin, profile?.distributor_id, currentDistributor]);

  // Calculate totals when items change
  useEffect(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + formData.tax_total + formData.shipping_cost;
    
    setFormData((prev) => ({
      ...prev,
      subtotal,
      total_amount: total,
    }));
  }, [formData.items, formData.tax_total, formData.shipping_cost]);

  // Auto-populate fields when distributor is selected or loaded
  // This effect specifically handles the case when currentDistributor is loaded for Distributor Admin
  useEffect(() => {
    // For Distributor Admin, always populate from currentDistributor when it becomes available
    if (isDistributorAdmin && currentDistributor && open && !po) {
      // Always set the supplier info from currentDistributor for distributor admin users
      setFormData((prev) => ({
        ...prev,
        distributor_id: currentDistributor.id,
        supplier_name: currentDistributor.name,
        supplier_email: currentDistributor.contact_email,
        supplier_phone: currentDistributor.contact_phone,
        brand_id: currentDistributor.brand_id || prev.brand_id,
      }));
      return;
    }

    // For Distributor Admin without currentDistributor, try to use distributors from hook
    if (isDistributorAdmin && !currentDistributor && distributors.length > 0 && open && !po) {
      const firstDistributor = distributors[0];
      console.log("[POFormDialog] Auto-populating from distributors hook (fallback):", firstDistributor.name);
      setCurrentDistributor(firstDistributor);
      setFormData((prev) => ({
        ...prev,
        distributor_id: firstDistributor.id,
        supplier_name: firstDistributor.name,
        supplier_email: firstDistributor.contact_email,
        supplier_phone: firstDistributor.contact_phone,
        brand_id: firstDistributor.brand_id || prev.brand_id,
      }));
      return;
    }

    // For non-distributor users, use the distributors list
    if (formData.distributor_id && distributors.length > 0 && !isDistributorAdmin) {
      // Only auto-populate if fields are empty (to avoid overwriting user edits)
      if (!formData.supplier_name) {
        const selectedDistributor = distributors.find(
          (d) => d.id === formData.distributor_id
        );
        
        if (selectedDistributor) {
          setFormData((prev) => ({
            ...prev,
            supplier_name: selectedDistributor.name,
            supplier_email: selectedDistributor.contact_email,
            supplier_phone: selectedDistributor.contact_phone,
            brand_id: selectedDistributor.brand_id || prev.brand_id, // Ensure brand_id is set
          }));
        }
      }
    }
  }, [formData.distributor_id, distributors, isDistributorAdmin, currentDistributor, open, po]);

  // Handle distributor selection - auto-populate purchaser fields
  const handleDistributorSelect = (distributorId: string) => {
    const distributor = distributors.find((d) => d.id === distributorId);
    if (distributor) {
      setFormData((prev) => ({
        ...prev,
        distributor_id: distributorId,
        supplier_name: distributor.name || "",
        supplier_email: distributor.contact_email || "",
        supplier_phone: distributor.contact_phone || "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        distributor_id: undefined,
        supplier_name: "",
        supplier_email: "",
        supplier_phone: "",
      }));
    }
  };

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    
    if (!productId || productId === "manual") {
      // Clear fields if no product selected or manual entry
      if (productId === "manual") {
        setCurrentItem({
          id: "",
          sku: "",
          product_name: "",
          product_id: undefined,
          quantity: 1,
          unit_price: 0,
          total: 0,
          currency: formData.currency,
          notes: "",
        });
      }
      return;
    }
    
    const product = products.find((p) => p.id === productId);
    if (product) {
      setCurrentItem({
        ...currentItem,
        product_id: product.id,
        sku: product.sku || "",
        product_name: product.product_name || "",
        unit_price: product.unit_price || 0,
        currency: product.currency || "USD",
      });
    }
  };

  // Calculate item total
  useEffect(() => {
    const total = currentItem.quantity * currentItem.unit_price;
    setCurrentItem((prev) => ({ ...prev, total }));
  }, [currentItem.quantity, currentItem.unit_price]);

  // Add item to list
  const handleAddItem = () => {
    if (!currentItem.sku || !currentItem.product_name || currentItem.quantity <= 0) {
      toast.error("Please fill in SKU, product name, and quantity");
      return;
    }

    const newItem: POItem = {
      ...currentItem,
      id: currentItem.id || `item-${Date.now()}`,
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
      product_id: undefined,
      quantity: 1,
      unit_price: 0,
      total: 0,
      currency: formData.currency,
      notes: "",
    });
    setSelectedProductId("");
  };

  // Remove item from list
  const handleRemoveItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

    // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For Distributor Admin, ensure we have the correct IDs from profile if missing
    const effectiveDistributorId = isDistributorAdmin && profile?.distributor_id 
      ? profile.distributor_id 
      : formData.distributor_id;

    const effectiveBrandId = isDistributorAdmin && profile?.brand_id
      ? profile.brand_id
      : formData.brand_id;

    if (!effectiveDistributorId) {
      toast.error("Please select a distributor");
      setActiveTab("supplier");
      return;
    }

    if (!formData.supplier_name) {
      toast.error("Purchaser information is required. Please select a distributor.");
      setActiveTab("supplier");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Please add at least one item to the purchase order");
      setActiveTab("items");
      return;
    }

    setIsSubmitting(true);

    try {
      const poData: Partial<PurchaseOrder> = {
        supplier_name: formData.supplier_name,
        supplier_email: formData.supplier_email || undefined,
        supplier_phone: formData.supplier_phone || undefined,
        po_date: formData.po_date,
        distributor_id: effectiveDistributorId,
        brand_id: effectiveBrandId,
        po_status: formData.po_status,
        payment_status: formData.payment_status,
        items: formData.items.map((item) => ({
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        })),
        subtotal: formData.subtotal,
        tax_total: formData.tax_total,
        shipping_cost: formData.shipping_cost,
        total_amount: formData.total_amount,
        currency: formData.currency,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        notes: formData.notes || undefined,
        tags: formData.tags && formData.tags.length > 0 ? formData.tags : undefined,
      };

      if (po) {
        await updatePurchaseOrder(po.id, poData);
        toast.success("Purchase order updated successfully!");
      } else {
        await createPurchaseOrder(poData);
        toast.success("Purchase order created successfully!");
      }

      // Call success callback and close
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error("Error saving purchase order:", error);
      toast.error(error?.message || "Failed to save purchase order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{po ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
          <DialogDescription>
            {po ? "Update purchase order details" : "Add a new purchase order for your purchaser"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="supplier">Purchaser Info</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-1">
              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="po_status">PO Status</Label>
                    <Select
                      value={formData.po_status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, po_status: value as POStatus }))
                      }
                    >
                      <SelectTrigger id="po_status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_status">Payment Status</Label>
                    <Select
                      value={formData.payment_status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_status: value as PaymentStatus,
                        }))
                      }
                    >
                      <SelectTrigger id="payment_status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partially_paid">Partially Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                    <Input
                      id="expected_delivery_date"
                      type="date"
                      value={formData.expected_delivery_date || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          expected_delivery_date: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_total">Tax Total</Label>
                    <Input
                      id="tax_total"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.tax_total}
                      readOnly={isDistributorAdmin}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tax_total: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className={isDistributorAdmin ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shipping_cost">Shipping Cost</Label>
                    <Input
                      id="shipping_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.shipping_cost}
                      readOnly={isDistributorAdmin}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          shipping_cost: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className={isDistributorAdmin ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Additional notes..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold">Add Item</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="product_select">Select Product</Label>
                      <ProductLookup
                        products={products}
                        selectedProductId={selectedProductId}
                        onSelect={handleProductSelect}
                        loading={productsLoading}
                        allowManualEntry={!isDistributorAdmin}
                        placeholder="Search products by name or SKU..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="item_sku">
                          SKU <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="item_sku"
                          value={currentItem.sku}
                          readOnly={isDistributorAdmin || !!selectedProductId}
                          onChange={(e) =>
                            setCurrentItem((prev) => ({ ...prev, sku: e.target.value }))
                          }
                          placeholder="SKU-001"
                          required
                          className={(isDistributorAdmin || selectedProductId) ? "bg-muted cursor-not-allowed" : ""}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="item_name">
                          Product Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="item_name"
                          value={currentItem.product_name}
                          readOnly={isDistributorAdmin || !!selectedProductId}
                          onChange={(e) =>
                            setCurrentItem((prev) => ({ ...prev, product_name: e.target.value }))
                          }
                          placeholder="Product name"
                          required
                          className={(isDistributorAdmin || selectedProductId) ? "bg-muted cursor-not-allowed" : ""}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="item_quantity">Quantity</Label>
                        <Input
                          id="item_quantity"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={currentItem.quantity === 0 ? "" : currentItem.quantity}
                          onChange={(e) =>
                            setCurrentItem((prev) => ({
                              ...prev,
                              quantity: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="item_price">Unit Price</Label>
                        <Input
                          id="item_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={currentItem.unit_price}
                          readOnly={isDistributorAdmin}
                          onChange={(e) =>
                            setCurrentItem((prev) => ({
                              ...prev,
                              unit_price: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className={isDistributorAdmin ? "bg-muted cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" : "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" onClick={handleAddItem} variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Items ({formData.items.length})</h3>
                    {formData.items.length === 0 ? (
                      <p className="text-sm text-gray-500">No items added yet</p>
                    ) : (
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                        {formData.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between border rounded-lg p-3"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-sm text-gray-500">
                                SKU: {item.sku} | Qty: {item.quantity} × {formData.currency}{" "}
                                {item.unit_price.toFixed(2)} = {formData.currency}{" "}
                                {item.total.toFixed(2)}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">
                        {formData.currency} {formData.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span className="font-medium">
                        {formData.currency} {formData.tax_total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span className="font-medium">
                        {formData.currency} {formData.shipping_cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>
                        {formData.currency} {formData.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Purchaser Information Tab */}
              <TabsContent value="supplier" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="distributor_id">
                      Distributor <span className="text-red-500">*</span>
                    </Label>
                    {isDistributorAdmin ? (
                      // For Distributor Admin users, show a read-only field with their distributor
                      <>
                        <Input
                          id="distributor_id"
                          value={
                            distributorsLoading && !currentDistributor
                              ? "Loading..."
                              : currentDistributor?.name ||
                                distributors.find((d) => d.id === formData.distributor_id)?.name ||
                                "Your Distributor"
                          }
                          disabled
                          className="bg-muted cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground">
                          Purchaser information is automatically associated with your distributor account
                        </p>
                      </>
                    ) : (
                      // For Brand Admin / Super Admin users, show the dropdown selector
                      <>
                        <Select
                          value={formData.distributor_id || undefined}
                          onValueChange={handleDistributorSelect}
                        >
                          <SelectTrigger id="distributor_id">
                            <SelectValue placeholder="Select distributor" />
                          </SelectTrigger>
                          <SelectContent>
                            {distributors.map((distributor) => (
                              <SelectItem key={distributor.id} value={distributor.id}>
                                {distributor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          Purchaser information will be automatically populated from the selected distributor
                        </p>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="po_date">PO Date</Label>
                    <Input
                      id="po_date"
                      type="date"
                      value={formData.po_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, po_date: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, currency: value }))
                      }
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : po ? "Update Purchase Order" : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
