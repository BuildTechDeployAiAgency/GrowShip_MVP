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
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { DistributorFormDialog } from "@/components/distributors/distributor-form-dialog";
import { useDistributors } from "@/hooks/use-distributors";
import { toast } from "react-toastify";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DistributorHeader } from "@/components/distributors/distributor-header";
import {
  PerformanceTabPlaceholder,
  ProductsTabPlaceholder,
  SLATabPlaceholder,
  ContactsTabPlaceholder,
} from "@/components/distributors/distributor-tab-placeholders";
import { DistributorOrdersSection } from "@/components/distributors/distributor-orders-section";
import { BarChart3, Package, FileCheck, Users } from "lucide-react";

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
    searchParams?.get("tab") || "performance"
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
          toast.error("Distributor not found");
          router.push("/distributors");
        } else {
          toast.error(`Error loading distributor: ${error.message}`);
        }
        return;
      }

      setDistributor(data);
    } catch (error: any) {
      console.error("Error loading distributor:", error);
      toast.error("Failed to load distributor");
    } finally {
      setLoadingDistributor(false);
    }
  };

  const handleDelete = async () => {
    if (!distributor) return;

    try {
      await deleteDistributor(distributor.id);
      toast.success("Distributor deleted successfully");
      router.push("/distributors");
    } catch (error: any) {
      console.error("Error deleting distributor:", error);
      toast.error("Failed to delete distributor");
    }
  };

  if (loading || loadingDistributor) {
    return (
      <MainLayout pageTitle="Distributor Details" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!distributor) {
    return (
      <MainLayout pageTitle="Distributor Not Found" pageSubtitle="">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-gray-600 mb-4">Distributor not found</p>
          <Button onClick={() => router.push("/distributors")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Distributors
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
                  if (confirm("Are you sure you want to delete this distributor?")) {
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
            {/* Distributor Header with KPIs */}
            <DistributorHeader distributor={distributor} />

            {/* Tabbed Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1">
                <TabsTrigger
                  value="performance"
                  className="relative data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Performance
                  <Badge
                    variant="outline"
                    className="ml-2 h-4 px-1.5 text-xs border-gray-300 text-gray-500"
                  >
                    Soon
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  className="relative data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Products
                  <Badge
                    variant="outline"
                    className="ml-2 h-4 px-1.5 text-xs border-gray-300 text-gray-500"
                  >
                    Soon
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="sla"
                  className="relative data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  SLA
                  <Badge
                    variant="outline"
                    className="ml-2 h-4 px-1.5 text-xs border-gray-300 text-gray-500"
                  >
                    Soon
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  className="relative data-[state=active]:bg-white data-[state=active]:text-teal-600"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Contacts
                  <Badge
                    variant="outline"
                    className="ml-2 h-4 px-1.5 text-xs border-gray-300 text-gray-500"
                  >
                    Soon
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="performance" className="mt-0">
                  <PerformanceTabPlaceholder />
                </TabsContent>

                <TabsContent value="products" className="mt-0">
                  <ProductsTabPlaceholder />
                </TabsContent>

                <TabsContent value="sla" className="mt-0">
                  <SLATabPlaceholder />
                </TabsContent>

                <TabsContent value="contacts" className="mt-0">
                  <ContactsTabPlaceholder />
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