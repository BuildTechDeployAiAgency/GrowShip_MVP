"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { useRequireProfile } from "@/hooks/use-auth";
import { Distributor } from "@/hooks/use-distributors";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, BarChart3, Package, FileCheck, Users } from "lucide-react";
import { DistributorFormDialog } from "@/components/distributors/distributor-form-dialog";
import { useDistributors } from "@/hooks/use-distributors";
import { toast } from "react-toastify";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DistributorHeader } from "@/components/distributors/distributor-header";
import { DistributorOrdersSection } from "@/components/distributors/distributor-orders-section";
import { DistributorMetricsCard } from "@/components/distributors/distributor-metrics-card";
import { DistributorSLATab } from "@/components/distributors/distributor-sla-tab";
import { DistributorProductsTab } from "@/components/distributors/distributor-products-tab";
import { DistributorContactsTab } from "@/components/distributors/distributor-contacts-tab";

export default function DistributorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const distributorId = params?.id as string;
  const { user, profile, loading } = useRequireProfile();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [loadingDistributor, setLoadingDistributor] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(
    searchParams?.get("tab") || "products"
  );

  const { deleteDistributor } = useDistributors({
    searchTerm: "",
    filters: { status: "all" },
    brandId: profile?.brand_id,
  });

  useEffect(() => {
    if (distributorId) {
      loadDistributor();
    }
  }, [distributorId]);

  useEffect(() => {
    // Update URL when tab changes
    if (searchParams) {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", activeTab);
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [activeTab, searchParams]);

  const loadDistributor = async () => {
    try {
      setLoadingDistributor(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("distributors")
        .select("*")
        .eq("id", distributorId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("Customer not found");
          router.push("/distributors");
        } else {
          toast.error(`Error loading customer: ${error.message}`);
        }
        return;
      }

      setDistributor(data);
    } catch (error: any) {
      console.error("Error loading customer:", error);
      toast.error("Failed to load customer");
    } finally {
      setLoadingDistributor(false);
    }
  };

  const handleDelete = async () => {
    if (!distributor) return;

    try {
      await deleteDistributor(distributor.id);
      toast.success("Customer deleted successfully");
      router.push("/distributors");
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    }
  };

  if (loading || loadingDistributor) {
    return (
      <MainLayout pageTitle="Customer Details" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!distributor) {
    return (
      <MainLayout pageTitle="Customer Not Found" pageSubtitle="">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-gray-600 mb-4">Customer not found</p>
          <Button onClick={() => router.push("/distributors")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <EnhancedAuthProvider>
      <ProtectedPage allowedStatuses={["approved"]}>
        <MainLayout
          pageTitle=""
          pageSubtitle=""
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/distributors")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this customer?")) {
                    handleDelete();
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Header */}
            <DistributorHeader distributor={distributor} />

            {/* Dashboard Metrics Section */}
            <DistributorMetricsCard 
              distributorId={distributor.id} 
              marginPercent={distributor.margin_percent}
            />

            {/* Tabbed Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
                <TabsTrigger
                  value="products"
                  className="data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Products
                </TabsTrigger>
                <TabsTrigger
                  value="sla"
                  className="data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  SLA & Terms
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  className="data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Contacts
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="products" className="mt-0">
                  <DistributorProductsTab distributorId={distributor.id} />
                </TabsContent>

                <TabsContent value="sla" className="mt-0">
                  <DistributorSLATab distributor={distributor} />
                </TabsContent>

                <TabsContent value="contacts" className="mt-0">
                  <DistributorContactsTab distributor={distributor} />
                </TabsContent>
              </div>
            </Tabs>

            {/* Orders Section - Always Visible */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <DistributorOrdersSection
                distributorId={distributor.id}
                distributorName={distributor.name}
              />
            </div>
          </div>

          {/* Edit Dialog */}
          <DistributorFormDialog
            open={showEditDialog}
            onOpenChange={(open) => {
              setShowEditDialog(open);
              if (!open) {
                loadDistributor(); // Reload to show updated data
              }
            }}
            distributor={distributor}
          />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}
