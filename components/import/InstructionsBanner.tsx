"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Info, FileSpreadsheet } from "lucide-react";

interface InstructionsBannerProps {
  onDownloadTemplate: () => void;
  loading?: boolean;
  importType?: "orders" | "sales" | "products";
}

export function InstructionsBanner({
  onDownloadTemplate,
  loading = false,
  importType = "orders",
}: InstructionsBannerProps) {
  const isSales = importType === "sales";
  const isProducts = importType === "products";
  
  const buttonLabel = isProducts
    ? "Download Products Import Template"
    : isSales 
    ? "Download Sales Import Template" 
    : "Download Orders Import Template";
  
  const title = isProducts
    ? "How to Import Products"
    : isSales 
    ? "How to Import Sales Data" 
    : "How to Import Orders";
  
  const requiredFields = isProducts
    ? "SKU, Product Name, and Unit Price"
    : isSales
    ? "Sales Date, SKU, Retailer, Territory, Units Sold, and Net Revenue"
    : "Order Date, Customer Name, SKU, Quantity, Unit Price, and Distributor ID";
  
  const instructions = isProducts ? [
    "Download the Excel template by clicking the button below",
    `Fill in the required fields: ${requiredFields}`,
    "SKU must be unique across all products for your brand",
    "If a product with the same SKU exists, it will be updated (upsert)",
    "All prices must be 0 or greater",
    "Save the file and upload it using the file uploader below"
  ] : isSales ? [
    "Download the Excel template by clicking the button below",
    `Fill in the required fields: ${requiredFields}`,
    "Ensure all SKUs exist in your products catalog and are active",
    "Sales Date will be automatically normalized to the first day of the month for reporting",
    "Save the file and upload it using the file uploader below"
  ] : [
    "Download the Excel template by clicking the button below",
    `Fill in the required fields: ${requiredFields}`,
    "Ensure all SKUs exist in your products catalog and are active",
    "For orders with multiple items, use the same Order Date and Customer Name on consecutive rows",
    "Save the file and upload it using the file uploader below"
  ];
  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Info className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              {title}
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">{index + 1}.</span>
                  <span>{instruction}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-blue-200">
          <Button
            onClick={onDownloadTemplate}
            disabled={loading}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {buttonLabel}
          </Button>
          
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Accepts .xlsx files up to 10MB • Max 5000 rows</span>
          </div>
        </div>

        {/* Key Requirements */}
        <div className="bg-white/50 rounded-md p-4 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            Important Requirements:
          </h4>
          <ul className="space-y-1 text-xs text-blue-700">
            {isProducts ? (
              <>
                <li>• SKU must be unique across all products for your brand</li>
                <li>• If a product with the same SKU exists, it will be updated (upsert)</li>
                <li>• All prices must be 0 or greater</li>
                <li>• Products must have status = 'active'</li>
                <li>• Do not modify column headers in the template</li>
              </>
            ) : (
              <>
                <li>• All SKUs must exist in your products catalog before importing</li>
                <li>• Products must have status = 'active'</li>
                <li>• Dates should be in format: YYYY-MM-DD (e.g., 2025-11-08)</li>
                <li>• Do not modify column headers in the template</li>
                {!isSales && <li>• The system will automatically calculate order totals</li>}
                {isSales && <li>• Sales Date will be normalized to the first day of the month</li>}
              </>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
}

