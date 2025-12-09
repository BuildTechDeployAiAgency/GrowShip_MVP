"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedPage } from "@/components/common/protected-page";
import { useRequireProfile } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, BarChart3, Package, FileCheck, Users, DollarSign } from "lucide-react";
import { toast } from "react-toastify";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerFinancialMetrics } from "@/components/customers/customer-financial-metrics";
import { ReceivablesAgingTable } from "@/components/customers/receivables-aging-table";
import { PaymentPerformanceCharts } from "@/components/customers/payment-performance-charts";

interface CustomerProfile {
  user_id: string;
  email: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role_name: string;
  status: "pending" | "approved" | "suspended";
  brand_id: string;
  created_at: string;
  updated_at: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = params?.id as string;
  const { user, profile, loading } = useRequireProfile();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(
    searchParams?.get("tab") || "overview"
  );

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId]);

  useEffect(() => {
    // Update URL when tab changes
    if (searchParams) {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", activeTab);
      router.replace(url.pathname + url.search);
    }
  }, [activeTab, router, searchParams]);

  const loadCustomer = async () => {
    try {
      setLoadingCustomer(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", customerId)
        .like("role_name", "%customer%")
        .single();

      if (error) {
        console.error("Error loading customer:", error);
        toast.error("Failed to load customer information");
        return;
      }

      if (!data) {
        toast.error("Customer not found");
        router.push("/customers");
        return;
      }

      // Check brand access if not super admin
      if (profile?.role_name !== "super_admin" && data.brand_id !== profile?.brand_id) {
        toast.error("You don't have permission to view this customer");
        router.push("/customers");
        return;
      }

      setCustomer(data);
    } catch (error) {
      console.error("Error loading customer:", error);
      toast.error("Failed to load customer information");
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleGoBack = () => {
    router.push("/customers");
  };

  if (loading || loadingCustomer) {
    return (
      <ProtectedPage>
        <MainLayout pageTitle="Customer Details">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </MainLayout>
      </ProtectedPage>
    );
  }

  if (!customer) {
    return (
      <ProtectedPage>
        <MainLayout pageTitle="Customer Details">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Not Found</h2>
            <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </div>
        </MainLayout>
      </ProtectedPage>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const customerDisplayName = customer.company_name || 
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || 
    customer.email;

  return (
    <ProtectedPage>
      <MainLayout pageTitle={`Customer: ${customerDisplayName}`}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Customers
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {customerDisplayName}
                </h1>
                <p className="text-sm text-gray-500">Customer Details</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(customer.status)}>
                {customer.status.toUpperCase()}
              </Badge>
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Customer
              </Button>
            </div>
          </div>

          {/* Customer Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getStatusColor(customer.status)}>
                  {customer.status}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Email</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{customer.email}</p>
              </CardContent>
            </Card>

            {customer.phone && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Phone</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{customer.phone}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Member Since</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="financials" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financials
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company Name</label>
                      <p className="text-base">{customer.company_name || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Name</label>
                      <p className="text-base">
                        {customer.first_name && customer.last_name 
                          ? `${customer.first_name} ${customer.last_name}`
                          : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email Address</label>
                      <p className="text-base">{customer.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone Number</label>
                      <p className="text-base">{customer.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Role</label>
                      <p className="text-base capitalize">{customer.role_name.replace("_", " ")}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account Status</label>
                      <Badge className={getStatusColor(customer.status)}>
                        {customer.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financials" className="space-y-6">
              <CustomerFinancialMetrics 
                customerId={customerId}
                customerName={customerDisplayName}
                onDataUpdate={(metrics) => {
                  console.log("Financial metrics updated:", metrics);
                }}
              />
              <ReceivablesAgingTable 
                customerId={customerId}
                onInvoiceClick={(invoiceId) => {
                  console.log("View invoice:", invoiceId);
                  // TODO: Navigate to invoice detail or open dialog
                }}
              />
              <PaymentPerformanceCharts 
                customerId={customerId}
                chartType="dso"
                timeframe="12m"
              />
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Customer orders will be displayed here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Customer invoices will be displayed here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Customer analytics and reports will be displayed here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedPage>
  );
}