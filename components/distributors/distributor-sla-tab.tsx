"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Distributor } from "@/hooks/use-distributors";
import { FileText, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface DistributorSLATabProps {
  distributor: Distributor;
}

export function DistributorSLATab({ distributor }: DistributorSLATabProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (e) {
      return "Invalid Date";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-teal-600" />
            Contract Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Contract Period</h4>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">
                {formatDate(distributor.contract_start)} - {formatDate(distributor.contract_end)}
              </span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Payment Terms</h4>
            <p className="text-sm">{distributor.payment_terms || "Standard (Net 30)"}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Minimum Purchase Target</h4>
            <p className="text-sm font-medium">
              {distributor.min_purchase_target
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: distributor.currency || "USD",
                  }).format(distributor.min_purchase_target)
                : "No target set"}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gray-400" />
              <span className="capitalize text-sm">{distributor.status}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          {distributor.notes ? (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{distributor.notes}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">No specific terms or notes available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

