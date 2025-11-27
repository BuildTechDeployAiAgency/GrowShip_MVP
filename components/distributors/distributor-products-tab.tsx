"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface DistributorProductsTabProps {
  distributorId: string;
}

interface ProductSummary {
  id: string;
  name: string;
  sku: string;
  lastOrdered: string;
  totalQuantity: number;
}

export function DistributorProductsTab({ distributorId }: DistributorProductsTabProps) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchOrderedProducts() {
      try {
        const supabase = createClient();
        // Since we don't have a direct distributor_products table, we'll derive it from orders
        // We first get the orders for this distributor
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("id, order_date, items")
          .eq("distributor_id", distributorId)
          .order("order_date", { ascending: false });

        if (ordersError) throw ordersError;

        // Aggregate products from orders
        const productMap = new Map<string, ProductSummary>();

        orders?.forEach((order) => {
          if (Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const productId = item.product_id || item.id; // Handle potential variation in item structure
              if (!productId) return;

              if (!productMap.has(productId)) {
                productMap.set(productId, {
                  id: productId,
                  name: item.product_name || item.name || "Unknown Product",
                  sku: item.sku || "N/A",
                  lastOrdered: order.order_date,
                  totalQuantity: 0,
                });
              }

              const existing = productMap.get(productId)!;
              existing.totalQuantity += (item.quantity || 0);
              // Since we iterate orders by date desc, the first time we see a product is the last time it was ordered
            });
          }
        });

        setProducts(Array.from(productMap.values()));
      } catch (error) {
        console.error("Error fetching distributor products:", error);
      } finally {
        setLoading(false);
      }
    }

    if (distributorId) {
      fetchOrderedProducts();
    }
  }, [distributorId]);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Ordered Products ({products.length})</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No products found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 bg-gray-50/50">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base font-medium truncate" title={product.name}>
                    {product.name}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {product.sku}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Total Purchased:</span>
                  <span className="font-medium">{product.totalQuantity}</span>
                </div>
                <div className="flex justify-between py-1 pt-2">
                  <span className="text-gray-500">Last Ordered:</span>
                  <span>{new Date(product.lastOrdered).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

