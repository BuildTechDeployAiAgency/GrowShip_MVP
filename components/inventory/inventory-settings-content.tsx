"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import { Search, Save, AlertTriangle, Package, TrendingUp } from "lucide-react";

interface ProductThresholdSettings {
  id: string;
  sku: string;
  product_name: string;
  quantity_in_stock: number;
  low_stock_threshold: number | null;
  critical_stock_threshold: number | null;
  max_stock_threshold: number | null;
  enable_stock_alerts: boolean;
}

interface InventorySettingsContentProps {
  brandId?: string;
}

export function InventorySettingsContent({ brandId }: InventorySettingsContentProps) {
  const [products, setProducts] = useState<ProductThresholdSettings[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductThresholdSettings[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Map<string, Partial<ProductThresholdSettings>>>(new Map());

  useEffect(() => {
    if (brandId) {
      loadProducts();
    }
  }, [brandId]);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, product_name, quantity_in_stock, low_stock_threshold, critical_stock_threshold, max_stock_threshold, enable_stock_alerts")
        .eq("brand_id", brandId)
        .eq("status", "active")
        .order("product_name");

      if (error) throw error;

      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error: any) {
      console.error("Error loading products:", error);
      toast.error(`Failed to load products: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }

    const term = searchTerm.toLowerCase();
    setFilteredProducts(
      products.filter(
        (p) =>
          p.sku.toLowerCase().includes(term) ||
          p.product_name.toLowerCase().includes(term)
      )
    );
  };

  const handleThresholdChange = (
    productId: string,
    field: keyof ProductThresholdSettings,
    value: number | boolean | null
  ) => {
    const currentChanges = new Map(changes);
    const existingChanges = currentChanges.get(productId) || {};
    currentChanges.set(productId, { ...existingChanges, [field]: value });
    setChanges(currentChanges);

    // Update local state for immediate UI feedback
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p))
    );
  };

  const handleSaveAll = async () => {
    if (changes.size === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSaving(true);
      const supabase = createClient();

      // Update each product with changes
      const updates = Array.from(changes.entries()).map(([productId, productChanges]) =>
        supabase
          .from("products")
          .update(productChanges)
          .eq("id", productId)
      );

      const results = await Promise.all(updates);

      // Check for errors
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} product(s)`);
      }

      toast.success(`Successfully updated ${changes.size} product(s)`);
      setChanges(new Map());
      await loadProducts(); // Reload to ensure consistency
    } catch (error: any) {
      console.error("Error saving changes:", error);
      toast.error(`Failed to save changes: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaults = () => {
    const defaultLow = 20;
    const defaultCritical = 5;

    const newChanges = new Map(changes);
    filteredProducts.forEach((product) => {
      newChanges.set(product.id, {
        low_stock_threshold: defaultLow,
        critical_stock_threshold: defaultCritical,
        enable_stock_alerts: true,
      });
    });
    setChanges(newChanges);

    // Update local state
    setProducts((prev) =>
      prev.map((p) =>
        filteredProducts.some((fp) => fp.id === p.id)
          ? {
              ...p,
              low_stock_threshold: defaultLow,
              critical_stock_threshold: defaultCritical,
              enable_stock_alerts: true,
            }
          : p
      )
    );

    toast.info(`Applied default thresholds to ${filteredProducts.length} product(s)`);
  };

  const getStockHealthColor = (
    stock: number,
    low: number | null,
    critical: number | null
  ) => {
    if (stock === 0) return "text-red-600";
    if (critical && stock <= critical) return "text-red-600";
    if (low && stock <= low) return "text-orange-600";
    return "text-green-600";
  };

  const getStockHealthBadge = (
    stock: number,
    low: number | null,
    critical: number | null
  ) => {
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (critical && stock <= critical) {
      return <Badge className="bg-red-100 text-red-800 border-red-300">Critical</Badge>;
    }
    if (low && stock <= low) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Low</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-300">Healthy</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-teal-600" />
            Alert Threshold Configuration
          </CardTitle>
          <CardDescription>
            Set low stock and critical stock thresholds for each product. You'll receive notifications
            when stock levels fall below these thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Healthy Stock</div>
                <div className="text-xs text-gray-500">Above low threshold</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Low Stock</div>
                <div className="text-xs text-gray-500">Below low threshold</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Critical Stock</div>
                <div className="text-xs text-gray-500">At or below critical threshold</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by SKU or product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSetDefaults} disabled={filteredProducts.length === 0}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Apply Defaults
              </Button>
              <Button onClick={handleSaveAll} disabled={changes.size === 0 || saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes {changes.size > 0 && `(${changes.size})`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Product Thresholds
            <span className="text-sm text-gray-500 ml-2">
              ({filteredProducts.length} products)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center w-[120px]">Low Threshold</TableHead>
                    <TableHead className="text-center w-[120px]">Critical Threshold</TableHead>
                    <TableHead className="text-center w-[120px]">Max Threshold</TableHead>
                    <TableHead className="text-center w-[100px]">Alerts</TableHead>
                    <TableHead className="text-center w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>{product.product_name}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`font-bold ${getStockHealthColor(
                            product.quantity_in_stock,
                            product.low_stock_threshold,
                            product.critical_stock_threshold
                          )}`}
                        >
                          {product.quantity_in_stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={product.low_stock_threshold || ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              product.id,
                              "low_stock_threshold",
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={product.critical_stock_threshold || ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              product.id,
                              "critical_stock_threshold",
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={product.max_stock_threshold || ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              product.id,
                              "max_stock_threshold",
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Switch
                            checked={product.enable_stock_alerts}
                            onCheckedChange={(checked) =>
                              handleThresholdChange(product.id, "enable_stock_alerts", checked)
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStockHealthBadge(
                          product.quantity_in_stock,
                          product.low_stock_threshold,
                          product.critical_stock_threshold
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No products found. Try adjusting your search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

