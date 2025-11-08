"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Info, FileSpreadsheet } from "lucide-react";

interface InstructionsBannerProps {
  onDownloadTemplate: () => void;
  loading?: boolean;
}

export function InstructionsBanner({
  onDownloadTemplate,
  loading = false,
}: InstructionsBannerProps) {
  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Info className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How to Import Orders
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">1.</span>
                <span>Download the Excel template by clicking the button below</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">2.</span>
                <span>
                  Fill in the required fields: Order Date, Customer Name, SKU, Quantity, Unit Price, and Distributor ID
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">3.</span>
                <span>
                  Ensure all SKUs exist in your products catalog and are active
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">4.</span>
                <span>
                  For orders with multiple items, use the same Order Date and Customer Name on consecutive rows
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">5.</span>
                <span>
                  Save the file and upload it using the file uploader below
                </span>
              </div>
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
            Download Excel Template
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
            <li>• All SKUs must exist in your products catalog before importing</li>
            <li>• Products must have status = 'active'</li>
            <li>• Dates should be in format: YYYY-MM-DD (e.g., 2025-11-08)</li>
            <li>• Do not modify column headers in the template</li>
            <li>• The system will automatically calculate order totals</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

