"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireProfile } from "@/hooks/use-auth";
import { useDistributors } from "@/hooks/use-distributors";
import { useImportOrders } from "@/hooks/use-import-orders";
import { useImportSales } from "@/hooks/use-import-sales";
import { useImportProducts } from "@/hooks/use-import-products";
import { MainLayout } from "@/components/layout/main-layout";
import { ImportTypeTabs } from "@/components/import/ImportTypeTabs";
import { InstructionsBanner } from "@/components/import/InstructionsBanner";
import { FileUploader } from "@/components/import/FileUploader";
import { DistributorConfirmationDialog } from "@/components/import/DistributorConfirmationDialog";
import { ValidationResultsPanel } from "@/components/import/ValidationResultsPanel";
import { ImportProgressDialog } from "@/components/import/ImportProgressDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function ImportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useRequireProfile();
  const [activeTab, setActiveTab] = useState(searchParams?.get("type") || "orders");
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [showDistributorDialog, setShowDistributorDialog] = useState(false);

  const {
    step: ordersStep,
    loading: ordersLoading,
    error: ordersError,
    orders,
    validationResults: ordersValidationResults,
    importSummary: ordersImportSummary,
    brandId: ordersBrandId,
    uploadFile: uploadOrdersFile,
    validateOrders,
    confirmImport: confirmOrdersImport,
    reset: resetOrders,
    downloadErrorReport: downloadOrdersErrorReport,
  } = useImportOrders();

  const {
    step: salesStep,
    loading: salesLoading,
    error: salesError,
    salesRows,
    validationResults: salesValidationResults,
    importSummary: salesImportSummary,
    brandId: salesBrandId,
    uploadFile: uploadSalesFile,
    validateSalesRows,
    confirmImport: confirmSalesImport,
    reset: resetSales,
    downloadErrorReport: downloadSalesErrorReport,
  } = useImportSales();

  const {
    step: productsStep,
    loading: productsLoading,
    error: productsError,
    products,
    validationResults: productsValidationResults,
    importSummary: productsImportSummary,
    brandId: productsBrandId,
    uploadFile: uploadProductsFile,
    validateProducts,
    confirmImport: confirmProductsImport,
    reset: resetProducts,
    downloadErrorReport: downloadProductsErrorReport,
  } = useImportProducts();

  // Computed values based on active tab
  const step = activeTab === "products" ? productsStep : activeTab === "sales" ? salesStep : ordersStep;
  const loading = activeTab === "products" ? productsLoading : activeTab === "sales" ? salesLoading : ordersLoading;
  const error = activeTab === "products" ? productsError : activeTab === "sales" ? salesError : ordersError;
  const validationResults = activeTab === "products" ? productsValidationResults : activeTab === "sales" ? salesValidationResults : ordersValidationResults;
  const importSummary = activeTab === "products" ? productsImportSummary : activeTab === "sales" ? salesImportSummary : ordersImportSummary;
  const brandId = activeTab === "products" ? productsBrandId : activeTab === "sales" ? salesBrandId : ordersBrandId;
  const entityName = activeTab === "products" ? "Products" : activeTab === "sales" ? "Sales" : "Orders";

  // Extract distributor ID from orders or sales rows if available
  // Products don't use distributor ID
  const extractedDistributorId = activeTab === "products" 
    ? null
    : activeTab === "sales"
    ? (salesRows.length > 0 && salesRows[0].distributor_id ? salesRows[0].distributor_id : null)
    : (orders.length > 0 && orders[0].distributor_id ? orders[0].distributor_id : null);

  // Define role checks early (before useEffect hooks that use them)
  const isDistributorUser = profile?.role_name?.startsWith("distributor_") || false;
  const isSuperAdmin = profile?.role_name === "super_admin";
  const isBrandUser = profile?.role_name?.startsWith("brand_");

  // Fetch distributors for the user's brand
  // For distributor_admin users, only fetch their own distributor
  const {
    distributors,
    loading: distributorsLoading,
  } = useDistributors({
    searchTerm: "",
    filters: { status: "active" },
    brandId: profile?.brand_id,
    distributorId: isDistributorUser ? profile?.distributor_id : undefined,
    isSuperAdmin: isSuperAdmin,
  });

  // Auto-select distributor for distributor users or if extracted from sheet
  useEffect(() => {
    if (profile && isDistributorUser) {
      // For distributor_admin users, ALWAYS use their distributor_id from profile
      // This ensures they can only import to their own distributor
      if (profile.distributor_id) {
        setSelectedDistributor(profile.distributor_id);
        console.log("[Import Page] Auto-selected distributor from profile", {
          distributorId: profile.distributor_id,
        });
      } else {
        // If distributor_admin doesn't have distributor_id, this is an error condition
        console.error("[Import Page] Distributor admin user missing distributor_id", {
          userId: profile.user_id,
          roleName: profile.role_name,
        });
        toast.error("Your account is not properly configured. Please contact support.");
      }
    } else if (extractedDistributorId && distributors.length > 0 && !isDistributorUser) {
      // Auto-select distributor from sheet if found (only for non-distributor users)
      const foundDistributor = distributors.find(d => d.id === extractedDistributorId);
      if (foundDistributor) {
        setSelectedDistributor(extractedDistributorId);
      }
    }
  }, [profile, distributors, extractedDistributorId, isDistributorUser]);

  // Show confirmation dialog when data is parsed
  // Skip dialog for distributor_admin users since distributor is auto-populated
  // Products import doesn't need distributor selection
  useEffect(() => {
    const hasData = activeTab === "products" ? products.length > 0 : activeTab === "sales" ? salesRows.length > 0 : orders.length > 0;
    const currentStep = activeTab === "products" ? productsStep : activeTab === "sales" ? salesStep : ordersStep;
    const currentLoading = activeTab === "products" ? productsLoading : activeTab === "sales" ? salesLoading : ordersLoading;
    const currentValidationResults = activeTab === "products" ? productsValidationResults : activeTab === "sales" ? salesValidationResults : ordersValidationResults;

    if (currentStep === "confirm" && hasData) {
      // For products, auto-validate since it doesn't need distributor
      if (activeTab === "products" && !currentLoading && !currentValidationResults) {
        console.log("[Import Page] Auto-validating products");
        validateProducts();
      } else if (!isDistributorUser && activeTab !== "products") {
        // For brand users, show distributor selection dialog (orders/sales only)
        setShowDistributorDialog(true);
      } else if (isDistributorUser && profile?.distributor_id && !currentLoading && !currentValidationResults) {
        // For distributor_admin, auto-validate with their distributor_id from profile
        console.log("[Import Page] Auto-validating for distributor_admin", {
          distributorId: profile.distributor_id,
          activeTab,
          step: currentStep,
          loading: currentLoading,
          hasValidationResults: !!currentValidationResults,
        });
        
        if (activeTab === "sales") {
          validateSalesRows(profile.distributor_id);
        } else {
          validateOrders(profile.distributor_id);
        }
      } else if (isDistributorUser && !profile?.distributor_id) {
        // If distributor_admin doesn't have distributor_id, show error
        toast.error("Your account is not associated with a distributor. Please contact support.");
      }
    }
  }, [activeTab, salesStep, ordersStep, productsStep, salesRows.length, orders.length, products.length, isDistributorUser, profile?.distributor_id, salesLoading, ordersLoading, productsLoading, salesValidationResults, ordersValidationResults, productsValidationResults]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debug logging for import state
  useEffect(() => {
    console.log("[Import Page] State update:", {
      step,
      loading,
      hasImportSummary: !!importSummary,
      importSummary,
      error,
      shouldShowResults: step === "completed",
      shouldShowResultsCard: step === "completed" && !!importSummary,
      shouldShowErrorCard: step === "completed" && !importSummary && !!error,
    });
  }, [step, loading, importSummary, error]);

  const handleDownloadTemplate = async () => {
    try {
      const queryParams = new URLSearchParams({
        type: activeTab,
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
      a.download = `${activeTab}_import_template_${new Date().toISOString().split("T")[0]}.xlsx`;
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
    if (activeTab === "products") {
      await uploadProductsFile(file);
    } else if (activeTab === "sales") {
      await uploadSalesFile(file);
    } else {
      await uploadOrdersFile(file);
    }
  };

  const handleConfirmDistributor = async (distributorId: string) => {
    setSelectedDistributor(distributorId);
    setShowDistributorDialog(false);
    
    if (activeTab === "sales") {
      await validateSalesRows(distributorId);
    } else {
      await validateOrders(distributorId);
    }
  };

  const handleProceedWithImport = async () => {
    if (activeTab === "products") {
      // Products don't need distributor
      await confirmProductsImport();
    } else if (selectedDistributor) {
      if (activeTab === "sales") {
        await confirmSalesImport(selectedDistributor);
      } else {
        await confirmOrdersImport(selectedDistributor);
      }
    }
  };

  const handleStartOver = () => {
    if (activeTab === "products") {
      resetProducts();
    } else if (activeTab === "sales") {
      resetSales();
    } else {
      resetOrders();
    }
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

  const headerActions = step !== "upload" && step !== "completed" ? (
    <Button
      variant="outline"
      onClick={handleStartOver}
      disabled={loading}
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      Start Over
    </Button>
  ) : undefined;

  return (
    <MainLayout
      pageTitle="Import Data"
      pageSubtitle="Import orders, products, and other data from Excel files"
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/orders")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>

      {/* Tabs */}
      <ImportTypeTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        showProducts={isSuperAdmin}
      >
        <div className="space-y-6">
          {/* Instructions */}
          <InstructionsBanner
            onDownloadTemplate={handleDownloadTemplate}
            loading={loading}
            importType={activeTab as "orders" | "sales" | "products"}
          />

          {/* File Uploader - Only show on upload step, not when completed */}
          {step === "upload" && (
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
              onDownloadErrors={validationResults.errors.length > 0 ? (activeTab === "products" ? downloadProductsErrorReport : activeTab === "sales" ? downloadSalesErrorReport : downloadOrdersErrorReport) : undefined}
              onProceed={validationResults.valid ? handleProceedWithImport : undefined}
              loading={loading}
              entityName={entityName}
            />
          )}

          {/* Import Results - Success, Partial Success, or Failure */}
          {step === "completed" && (
            <>
              {importSummary ? (
                <Card className={`p-6 ${
                  importSummary.failed === 0 
                    ? "bg-green-50 border-green-200" 
                    : importSummary.successful === 0
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  <div className="space-y-4">
                    {/* Status Header */}
                    <div className="flex items-start gap-3">
                      {importSummary.failed === 0 ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                      ) : importSummary.successful === 0 ? (
                        <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-1 ${
                          importSummary.failed === 0 
                            ? "text-green-900" 
                            : importSummary.successful === 0
                            ? "text-red-900"
                            : "text-amber-900"
                        }`}>
                          {importSummary.failed === 0 
                            ? "Import Completed Successfully!" 
                            : importSummary.successful === 0
                            ? "Import Failed"
                            : "Import Partially Completed"}
                        </h3>
                        <p className={`text-sm ${
                          importSummary.failed === 0 
                            ? "text-green-700" 
                            : importSummary.successful === 0
                            ? "text-red-700"
                            : "text-amber-700"
                        }`}>
                          {importSummary.failed === 0 
                            ? `All ${importSummary.successful} ${entityName.toLowerCase()} were imported successfully.`
                            : importSummary.successful === 0
                            ? `None of the ${importSummary.total} ${entityName.toLowerCase()} could be imported.`
                            : `${importSummary.successful} out of ${importSummary.total} ${entityName.toLowerCase()} were imported successfully. ${importSummary.failed} ${entityName.toLowerCase()} failed.`}
                        </p>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-900">{importSummary.total}</p>
                        <p className="text-xs text-gray-600 mt-1">Total {entityName}</p>
                      </div>
                      <div className="bg-white/50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-600">{importSummary.successful}</p>
                        <p className="text-xs text-green-600 mt-1">Successful</p>
                      </div>
                      <div className="bg-white/50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-red-600">{importSummary.failed}</p>
                        <p className="text-xs text-red-600 mt-1">Failed</p>
                      </div>
                    </div>

                    {/* Error Details */}
                    {importSummary.errors && importSummary.errors.length > 0 && (
                      <div className="bg-white/70 border border-red-200 rounded-md p-4">
                        <h4 className="text-sm font-semibold text-red-900 mb-3">
                          Error Details ({importSummary.errors.length} error{importSummary.errors.length !== 1 ? 's' : ''}):
                        </h4>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Row
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Field
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Error Message
                                </th>
                                {importSummary.errors.some(e => e.code) && (
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                    Code
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {importSummary.errors.map((error, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                                    {error.row || "-"}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                                    {error.field || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-gray-900">
                                    {error.message}
                                  </td>
                                  {importSummary.errors?.some(e => e.code) && (
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                      {error.code || "-"}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Batch Errors (if present) */}
                    {importSummary.errors && importSummary.errors.some((e: any) => e.batch) && (
                      <div className="bg-white/70 border border-red-200 rounded-md p-4">
                        <h4 className="text-sm font-semibold text-red-900 mb-2">
                          Batch Processing Errors:
                        </h4>
                        <div className="space-y-2">
                          {importSummary.errors
                            .filter((e: any) => e.batch)
                            .map((error: any, idx: number) => (
                              <div key={idx} className="text-sm text-red-700">
                                <p className="font-medium">Batch {error.batch}:</p>
                                <p className="ml-4">{error.error || error.message}</p>
                                {error.rows && error.rows.length > 0 && (
                                  <p className="ml-4 text-xs text-gray-600">
                                    Affected rows: {error.rows.join(", ")}
                                  </p>
                                )}
                                {error.details && (
                                  <p className="ml-4 text-xs text-gray-600">
                                    Details: {error.details}
                                  </p>
                                )}
                                {error.hint && (
                                  <p className="ml-4 text-xs text-amber-600">
                                    Hint: {error.hint}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      {importSummary.successful > 0 && (
                        <Button onClick={() => router.push(`/${activeTab === "sales" ? "sales" : activeTab === "products" ? "products" : "orders"}`)}>
                          View Imported {entityName}
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={handleStartOver}
                      >
                        {importSummary.failed > 0 ? "Try Again" : `Import More ${entityName}`}
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : error ? (
                <Card className="p-6 bg-red-50 border-red-200">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-900 mb-2">
                        Import Failed
                      </h3>
                      <p className="text-red-700 mb-4">
                        {error}
                      </p>
                      <p className="text-sm text-red-600 mb-4">
                        Please check your data and try again. If this problem persists, contact support with the error details.
                      </p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={handleStartOver}>
                          Try Again
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 bg-gray-50 border-gray-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Import Completed
                      </h3>
                      <p className="text-gray-700 mb-4">
                        Import process completed. Please check the console for details or try importing again.
                      </p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={handleStartOver}>
                          Start Over
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </ImportTypeTabs>

      {/* Distributor Confirmation Dialog */}
      <DistributorConfirmationDialog
        open={showDistributorDialog}
        orders={activeTab === "orders" ? orders : []}
        distributors={distributors}
        selectedDistributor={selectedDistributor || extractedDistributorId || ""}
        isDistributorUser={isDistributorUser}
        distributorName={distributorName}
        onConfirm={handleConfirmDistributor}
        onCancel={() => {
          setShowDistributorDialog(false);
          if (activeTab === "sales") {
            resetSales();
          } else {
            resetOrders();
          }
        }}
        loading={loading}
      />

      {/* Import Progress Dialog - Only show during processing, not when completed with results */}
      <ImportProgressDialog
        open={(loading && step === "upload") || (step === "importing")}
        progress={
          loading && step === "upload" 
            ? 30 
            : step === "importing" 
            ? 50 
            : 100
        }
        status={
          loading && step === "upload"
            ? "processing"
            : step === "importing"
            ? "processing"
            : "completed"
        }
        summary={undefined}
        title={
          loading && step === "upload"
            ? "Parsing File..."
            : step === "importing"
            ? `Importing ${entityName}...`
            : undefined
        }
        description={
          loading && step === "upload"
            ? `Please wait while we parse your Excel file and extract ${entityName.toLowerCase()} data`
            : step === "importing"
            ? `Please wait while we process your ${entityName.toLowerCase()}`
            : undefined
        }
        entityName={entityName}
        onClose={() => {
          // Don't allow closing during processing
        }}
      />
      </div>
    </MainLayout>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ImportPageContent />
    </Suspense>
  );
}
