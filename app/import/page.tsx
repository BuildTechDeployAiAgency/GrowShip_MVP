"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireProfile } from "@/hooks/use-auth";
import { useDistributors } from "@/hooks/use-distributors";
import { useImportOrders } from "@/hooks/use-import-orders";
import { ImportTypeTabs } from "@/components/import/ImportTypeTabs";
import { InstructionsBanner } from "@/components/import/InstructionsBanner";
import { FileUploader } from "@/components/import/FileUploader";
import { DistributorConfirmationDialog } from "@/components/import/DistributorConfirmationDialog";
import { ValidationResultsPanel } from "@/components/import/ValidationResultsPanel";
import { ImportProgressDialog } from "@/components/import/ImportProgressDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useRequireProfile();
  const [activeTab, setActiveTab] = useState(searchParams?.get("type") || "orders");
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [showDistributorDialog, setShowDistributorDialog] = useState(false);

  const {
    step,
    loading,
    error,
    orders,
    validationResults,
    importSummary,
    brandId,
    uploadFile,
    validateOrders,
    confirmImport,
    reset,
    downloadErrorReport,
  } = useImportOrders();

  // Fetch distributors for the user's brand
  const {
    distributors,
    loading: distributorsLoading,
  } = useDistributors({
    searchTerm: "",
    filters: { status: "active" },
    brandId: profile?.brand_id,
    isSuperAdmin: profile?.role_name === "super_admin",
  });

  // Auto-select distributor for distributor users
  useEffect(() => {
    if (profile && profile.role_name?.startsWith("distributor_")) {
      // For distributor users, find their distributor in the list
      const userDistributor = distributors.find(d => d.brand_id === profile.brand_id);
      if (userDistributor) {
        setSelectedDistributor(userDistributor.id);
      }
    }
  }, [profile, distributors]);

  // Show confirmation dialog when orders are parsed
  useEffect(() => {
    if (step === "confirm" && orders.length > 0) {
      setShowDistributorDialog(true);
    }
  }, [step, orders]);

  const isDistributorUser = profile?.role_name?.startsWith("distributor_") || false;
  const isSuperAdmin = profile?.role_name === "super_admin";
  const isBrandUser = profile?.role_name?.startsWith("brand_");

  const handleDownloadTemplate = async () => {
    try {
      const queryParams = new URLSearchParams({
        type: "orders",
        brandId: profile?.brand_id || "",
      });

      if (selectedDistributor) {
        queryParams.append("distributorId", selectedDistributor);
      }

      const response = await fetch(`/api/import/template?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_import_template_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Template downloaded successfully!");
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error(err.message || "Failed to download template");
    }
  };

  const handleFileSelect = async (file: File) => {
    await uploadFile(file);
  };

  const handleConfirmDistributor = async (distributorId: string) => {
    setSelectedDistributor(distributorId);
    setShowDistributorDialog(false);
    await validateOrders(distributorId);
  };

  const handleProceedWithImport = async () => {
    if (selectedDistributor) {
      await confirmImport(selectedDistributor);
    }
  };

  const handleStartOver = () => {
    reset();
    setSelectedDistributor("");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const distributorName = distributors.find(d => d.id === selectedDistributor)?.name;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/orders")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Import Data</h1>
            <p className="text-gray-600 mt-1">
              Import orders, products, and other data from Excel files
            </p>
          </div>
          
          {step !== "upload" && step !== "completed" && (
            <Button
              variant="outline"
              onClick={handleStartOver}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ImportTypeTabs activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="space-y-6">
          {/* Instructions */}
          <InstructionsBanner
            onDownloadTemplate={handleDownloadTemplate}
            loading={loading}
          />

          {/* File Uploader */}
          {(step === "upload" || step === "completed") && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Upload File
              </h3>
              <FileUploader
                onFileSelect={handleFileSelect}
                loading={loading}
              />
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </Card>
          )}

          {/* Validation Results */}
          {validationResults && step === "validated" && (
            <ValidationResultsPanel
              results={validationResults}
              onDownloadErrors={validationResults.errors.length > 0 ? downloadErrorReport : undefined}
              onProceed={validationResults.valid ? handleProceedWithImport : undefined}
              loading={loading}
            />
          )}

          {/* Success Message */}
          {step === "completed" && importSummary && (
            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Import Completed Successfully!
              </h3>
              <p className="text-green-700 mb-4">
                {importSummary.successful} out of {importSummary.total} orders were imported successfully.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => router.push("/orders")}>
                  View Orders
                </Button>
                <Button variant="outline" onClick={handleStartOver}>
                  Import More Orders
                </Button>
              </div>
            </Card>
          )}
        </div>
      </ImportTypeTabs>

      {/* Distributor Confirmation Dialog */}
      <DistributorConfirmationDialog
        open={showDistributorDialog}
        orders={orders}
        distributors={distributors}
        selectedDistributor={selectedDistributor}
        isDistributorUser={isDistributorUser}
        distributorName={distributorName}
        onConfirm={handleConfirmDistributor}
        onCancel={() => {
          setShowDistributorDialog(false);
          reset();
        }}
        loading={loading}
      />

      {/* Import Progress Dialog */}
      <ImportProgressDialog
        open={step === "importing" || (step === "completed" && !!importSummary)}
        progress={step === "importing" ? 50 : 100}
        status={
          step === "importing"
            ? "processing"
            : importSummary
            ? "completed"
            : "failed"
        }
        summary={importSummary || undefined}
        onClose={() => {
          if (step === "completed") {
            handleStartOver();
          }
        }}
      />
    </div>
  );
}

