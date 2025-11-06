"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { useRequireProfile } from "@/hooks/use-auth";
import { Product } from "@/hooks/use-products";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, BarChart3, Package, History, ShoppingCart } from "lucide-react";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { useProducts } from "@/hooks/use-products";
import { toast } from "react-toastify";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProductDetailsContent } from "@/components/products/product-details-content";
import { ProductOrdersSection } from "@/components/products/product-orders-section";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { user, profile, loading } = useRequireProfile();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const { deleteProduct } = useProducts({
    searchTerm: "",
    filters: { status: "all", category: "all" },
    brandId: profile?.brand_id,
  });

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoadingProduct(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("Product not found");
          router.push("/products");
        } else {
          toast.error(`Error loading product: ${error.message}`);
        }
        return;
      }

      setProduct(data);
    } catch (error: any) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product");
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    const confirmMessage = `Are you sure you want to delete "${product.product_name}"? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      try {
        await deleteProduct(product.id);
        toast.success("Product deleted successfully");
        router.push("/products");
      } catch (error) {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
      }
    }
  };

  if (loading || loadingProduct) {
    return (
      <EnhancedAuthProvider>
        <ProtectedPage allowedStatuses={["approved"]}>
          <MainLayout pageTitle="Product Details" pageSubtitle="Loading...">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          </MainLayout>
        </ProtectedPage>
      </EnhancedAuthProvider>
    );
  }

  if (!product) {
    return (
      <EnhancedAuthProvider>
        <ProtectedPage allowedStatuses={["approved"]}>
          <MainLayout pageTitle="Product Not Found" pageSubtitle="Product not found">
            <div className="text-center py-12">
              <p className="text-gray-500">Product not found</p>
              <Button onClick={() => router.push("/products")} className="mt-4">
                Back to Products
              </Button>
            </div>
          </MainLayout>
        </ProtectedPage>
      </EnhancedAuthProvider>
    );
  }

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    discontinued: "bg-red-100 text-red-800",
    out_of_stock: "bg-orange-100 text-orange-800",
  };

  return (
    <EnhancedAuthProvider>
      <ProtectedPage allowedStatuses={["approved"]}>
        <MainLayout
          pageTitle={product.product_name}
          pageSubtitle={`SKU: ${product.sku}`}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/products")}
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(true)}
                size="sm"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Product Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {product.product_image_url ? (
                  <img
                    src={product.product_image_url}
                    alt={product.product_name}
                    className="h-20 w-20 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center border">
                    <Package className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {product.product_name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={statusColors[product.status]}>
                      {product.status.replace("_", " ")}
                    </Badge>
                    {product.product_category && (
                      <span className="text-sm text-gray-500">
                        {product.product_category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                <TabsTrigger
                  value="overview"
                  className="relative data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="relative data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Orders
                </TabsTrigger>
                <TabsTrigger
                  value="stock-history"
                  className="relative data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <History className="mr-2 h-4 w-4" />
                  Stock History
                  <Badge
                    variant="outline"
                    className="ml-2 h-4 px-1.5 text-xs border-gray-300 text-gray-500"
                  >
                    Soon
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="relative data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                  <Badge
                    variant="outline"
                    className="ml-2 h-4 px-1.5 text-xs border-gray-300 text-gray-500"
                  >
                    Soon
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="overview" className="mt-0">
                  <ProductDetailsContent product={product} />
                </TabsContent>

                <TabsContent value="orders" className="mt-0">
                  <ProductOrdersSection
                    productId={product.id}
                    productSku={product.sku}
                    productName={product.product_name}
                  />
                </TabsContent>

                <TabsContent value="stock-history" className="mt-0">
                  <Card>
                    <CardContent className="p-12 text-center">
                      <History className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        Stock History Coming Soon
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Track inventory movements and changes over time.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics" className="mt-0">
                  <Card>
                    <CardContent className="p-12 text-center">
                      <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        Product Analytics Coming Soon
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        View sales trends, revenue, and performance metrics for this product.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Edit Dialog */}
          <ProductFormDialog
            open={showEditDialog}
            onOpenChange={(open) => {
              setShowEditDialog(open);
              if (!open) {
                loadProduct(); // Reload to show updated data
              }
            }}
            product={product}
          />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

