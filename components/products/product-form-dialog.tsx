"use client";

import { useState, useEffect } from "react";
import {
  Package,
  DollarSign,
  Tag,
  Hash,
  FileText,
  Barcode,
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
import { useProducts, Product, ProductStatus } from "@/hooks/use-products";
import { useManufacturers } from "@/hooks/use-manufacturers";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "react-toastify";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess?: (product: Product) => void;
}

interface ProductFormData {
  sku: string;
  product_name: string;
  description: string;
  product_category: string;
  unit_price: string;
  cost_price: string;
  currency: string;
  quantity_in_stock: string;
  reorder_level: string;
  reorder_quantity: string;
  barcode: string;
  product_image_url: string;
  weight: string;
  weight_unit: string;
  status: ProductStatus;
  tags: string;
  supplier_id: string;
  supplier_sku: string;
  notes: string;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDialogProps) {
  const { profile, canPerformAction } = useEnhancedAuth();
  const isSuperAdmin = canPerformAction?.("view_all_users") ?? false;
  const { createProduct, updateProduct } = useProducts({
    searchTerm: "",
    filters: { status: "all", category: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
  });

  const { manufacturers, loading: manufacturersLoading } = useManufacturers({
    searchTerm: "",
    filters: { status: "all", country: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    isSuperAdmin,
  });

  const isEditing = !!product;

  const [formData, setFormData] = useState<ProductFormData>({
    sku: "",
    product_name: "",
    description: "",
    product_category: "",
    unit_price: "",
    cost_price: "",
    currency: "USD",
    quantity_in_stock: "0",
    reorder_level: "0",
    reorder_quantity: "0",
    barcode: "",
    product_image_url: "",
    weight: "",
    weight_unit: "kg",
    status: "active",
    tags: "",
    supplier_id: "",
    supplier_sku: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || "",
        product_name: product.product_name || "",
        description: product.description || "",
        product_category: product.product_category || "",
        unit_price: product.unit_price?.toString() || "",
        cost_price: product.cost_price?.toString() || "",
        currency: product.currency || "USD",
        quantity_in_stock: product.quantity_in_stock?.toString() || "0",
        reorder_level: product.reorder_level?.toString() || "0",
        reorder_quantity: product.reorder_quantity?.toString() || "0",
        barcode: product.barcode || "",
        product_image_url: product.product_image_url || "",
        weight: product.weight?.toString() || "",
        weight_unit: product.weight_unit || "kg",
        status: product.status || "active",
        tags: product.tags?.join(", ") || "",
        supplier_id: product.supplier_id || "",
        supplier_sku: product.supplier_sku || "",
        notes: product.notes || "",
      });
    } else {
      // Reset form for new product
      setFormData({
        sku: "",
        product_name: "",
        description: "",
        product_category: "",
        unit_price: "",
        cost_price: "",
        currency: "USD",
        quantity_in_stock: "0",
        reorder_level: "0",
        reorder_quantity: "0",
        barcode: "",
        product_image_url: "",
        weight: "",
        weight_unit: "kg",
        status: "active",
        tags: "",
        supplier_id: "",
        supplier_sku: "",
        notes: "",
      });
    }
    setErrors({});
  }, [product, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) {
      newErrors.sku = "SKU is required";
    }

    if (!formData.product_name.trim()) {
      newErrors.product_name = "Product name is required";
    }

    if (!formData.unit_price || parseFloat(formData.unit_price) < 0) {
      newErrors.unit_price = "Valid unit price is required";
    }

    if (formData.cost_price && parseFloat(formData.cost_price) < 0) {
      newErrors.cost_price = "Cost price must be positive";
    }

    if (formData.quantity_in_stock && parseInt(formData.quantity_in_stock) < 0) {
      newErrors.quantity_in_stock = "Stock quantity cannot be negative";
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
      const productData: Partial<Product> = {
        brand_id: profile.brand_id, // Auto-populated from logged-in user
        sku: formData.sku.trim(),
        product_name: formData.product_name.trim(),
        description: formData.description.trim() || undefined,
        product_category: formData.product_category.trim() || undefined,
        unit_price: parseFloat(formData.unit_price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        currency: formData.currency,
        quantity_in_stock: parseInt(formData.quantity_in_stock) || 0,
        reorder_level: formData.reorder_level ? parseInt(formData.reorder_level) : undefined,
        reorder_quantity: formData.reorder_quantity ? parseInt(formData.reorder_quantity) : undefined,
        barcode: formData.barcode.trim() || undefined,
        product_image_url: formData.product_image_url.trim() || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        weight_unit: formData.weight_unit || undefined,
        status: formData.status,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim()).filter((t) => t)
          : undefined,
        supplier_id: formData.supplier_id || undefined,
        supplier_sku: formData.supplier_sku.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditing && product) {
        await updateProduct(product.id, productData);
        onSuccess?.(product);
      } else {
        const newProduct = await createProduct(productData);
        onSuccess?.(newProduct);
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof ProductFormData,
    value: string | ProductStatus
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update product information and inventory details"
              : "Create a new product in your catalog"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">
                    SKU <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleChange("sku", e.target.value)}
                    placeholder="PROD-001"
                    disabled={isEditing}
                    className={errors.sku ? "border-red-500" : ""}
                  />
                  {errors.sku && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.sku}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => handleChange("barcode", e.target.value)}
                    placeholder="1234567890123"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_name">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  onChange={(e) => handleChange("product_name", e.target.value)}
                  placeholder="Enter product name"
                  className={errors.product_name ? "border-red-500" : ""}
                />
                {errors.product_name && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.product_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Product description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_category">Category</Label>
                <Input
                  id="product_category"
                  value={formData.product_category}
                  onChange={(e) => handleChange("product_category", e.target.value)}
                  placeholder="e.g., Electronics, Clothing, Food"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Pricing</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_price">
                    Unit Price <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => handleChange("unit_price", e.target.value)}
                    placeholder="0.00"
                    className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.unit_price ? "border-red-500" : ""}`}
                  />
                  {errors.unit_price && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.unit_price}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => handleChange("cost_price", e.target.value)}
                    placeholder="0.00"
                    className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.cost_price ? "border-red-500" : ""}`}
                  />
                </div>

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
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Inventory</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity_in_stock">Quantity in Stock</Label>
                  <Input
                    id="quantity_in_stock"
                    type="number"
                    min="0"
                    value={formData.quantity_in_stock}
                    onChange={(e) => handleChange("quantity_in_stock", e.target.value)}
                    placeholder="0"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => handleChange("reorder_level", e.target.value)}
                    placeholder="0"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
                  <Input
                    id="reorder_quantity"
                    type="number"
                    min="0"
                    value={formData.reorder_quantity}
                    onChange={(e) => handleChange("reorder_quantity", e.target.value)}
                    placeholder="0"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Additional Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => handleChange("weight", e.target.value)}
                    placeholder="0.00"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight_unit">Weight Unit</Label>
                  <Select
                    value={formData.weight_unit}
                    onValueChange={(value) => handleChange("weight_unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="lb">Pounds (lb)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_image_url">Product Image URL</Label>
                <Input
                  id="product_image_url"
                  value={formData.product_image_url}
                  onChange={(e) => handleChange("product_image_url", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value as ProductStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Supplier (Manufacturer)</Label>
                  <Select
                    value={formData.supplier_id || "none"}
                    onValueChange={(value) =>
                      handleChange("supplier_id", value === "none" ? "" : value)
                    }
                    disabled={manufacturersLoading || (!manufacturers?.length && !formData.supplier_id)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No supplier</SelectItem>
                      {manufacturers?.map((manufacturer) => (
                        <SelectItem key={manufacturer.id} value={manufacturer.id}>
                          {manufacturer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {manufacturersLoading && (
                    <p className="text-xs text-muted-foreground">Loading manufacturers...</p>
                  )}
                  {!manufacturersLoading && !manufacturers?.length && (
                    <p className="text-xs text-muted-foreground">
                      No manufacturers found for this brand yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_sku">Supplier SKU</Label>
                <Input
                  id="supplier_sku"
                  value={formData.supplier_sku}
                  onChange={(e) => handleChange("supplier_sku", e.target.value)}
                  placeholder="SUP-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleChange("tags", e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Additional notes about the product"
                  rows={3}
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
              {loading ? "Saving..." : isEditing ? "Update Product" : "Create Product"}
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
