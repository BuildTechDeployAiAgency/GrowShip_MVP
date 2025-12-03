"use client";

import { Distributor } from "@/hooks/use-distributors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  DollarSign,
  FileText,
  Calendar,
  Hash,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/formatters";

interface DistributorDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distributor: Distributor | null;
}

export function DistributorDetailsDialog({
  open,
  onOpenChange,
  distributor,
}: DistributorDetailsDialogProps) {
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    if (distributor?.brand_id && open) {
      const loadOrgName = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", distributor.brand_id)
          .single();
        if (data) {
          setOrgName(data.name);
        }
      };
      loadOrgName();
    }
  }, [distributor?.brand_id, open]);

  if (!distributor) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-6 w-6 text-teal-600" />
            {distributor.name}
          </DialogTitle>
          <DialogDescription>Customer Details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-teal-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-sm">{distributor.name}</p>
                </div>
                {distributor.code && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Code</p>
                    <p className="text-sm">{distributor.code}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge
                    className={
                      distributor.status === "active"
                        ? "bg-green-100 text-green-800"
                        : distributor.status === "inactive"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {distributor.status}
                  </Badge>
                </div>
                {orgName && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Organization</p>
                    <p className="text-sm">{orgName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          {(distributor.contact_name ||
            distributor.contact_email ||
            distributor.contact_phone) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-teal-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {distributor.contact_name && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Name</p>
                      <p className="text-sm">{distributor.contact_name}</p>
                    </div>
                  )}
                  {distributor.contact_email && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Email</p>
                      <p className="text-sm">{distributor.contact_email}</p>
                    </div>
                  )}
                  {distributor.contact_phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Phone</p>
                      <p className="text-sm">{distributor.contact_phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Address Information */}
          {(distributor.address_line1 ||
            distributor.city ||
            distributor.state ||
            distributor.country) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-teal-600" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {distributor.address_line1 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="text-sm">
                      {distributor.address_line1}
                      {distributor.address_line2 && `, ${distributor.address_line2}`}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {distributor.city && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">City</p>
                      <p className="text-sm">{distributor.city}</p>
                    </div>
                  )}
                  {distributor.state && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">State/Province</p>
                      <p className="text-sm">{distributor.state}</p>
                    </div>
                  )}
                  {distributor.postal_code && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Postal Code</p>
                      <p className="text-sm">{distributor.postal_code}</p>
                    </div>
                  )}
                  {distributor.country && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Country</p>
                      <p className="text-sm">{distributor.country}</p>
                    </div>
                  )}
                </div>
                {(distributor.latitude || distributor.longitude) && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Coordinates</p>
                    <p className="text-sm">
                      {distributor.latitude && distributor.longitude
                        ? `${distributor.latitude}, ${distributor.longitude}`
                        : distributor.latitude
                        ? `Lat: ${distributor.latitude}`
                        : `Lng: ${distributor.longitude}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Business Information */}
          {(distributor.currency ||
            distributor.tax_id ||
            distributor.payment_terms ||
            distributor.min_purchase_target) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-teal-600" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {distributor.currency && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Currency</p>
                      <p className="text-sm">{distributor.currency}</p>
                    </div>
                  )}
                  {distributor.tax_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tax ID</p>
                      <p className="text-sm">{distributor.tax_id}</p>
                    </div>
                  )}
                  {distributor.payment_terms && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                      <p className="text-sm">{distributor.payment_terms}</p>
                    </div>
                  )}
                  {distributor.min_purchase_target !== undefined &&
                    distributor.min_purchase_target !== null && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Min Purchase Target
                        </p>
                        <p className="text-sm">
                          {formatCurrency(
                            distributor.min_purchase_target,
                            distributor.currency
                          )}
                        </p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          {(distributor.orders_count !== undefined ||
            distributor.revenue_to_date !== undefined ||
            distributor.overdue_amount !== undefined ||
            distributor.margin_percent !== undefined) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="h-5 w-5 text-teal-600" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {distributor.orders_count !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Orders Count</p>
                      <p className="text-sm">{distributor.orders_count}</p>
                    </div>
                  )}
                  {distributor.revenue_to_date !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Revenue to Date</p>
                      <p className="text-sm">
                        {formatCurrency(distributor.revenue_to_date, distributor.currency)}
                      </p>
                    </div>
                  )}
                  {distributor.overdue_amount !== undefined &&
                    distributor.overdue_amount > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Overdue Amount
                        </p>
                        <p className="text-sm text-red-600">
                          {formatCurrency(distributor.overdue_amount, distributor.currency)}
                        </p>
                      </div>
                    )}
                  {distributor.margin_percent !== undefined &&
                    distributor.margin_percent !== null && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Margin %</p>
                        <p className="text-sm">{distributor.margin_percent}%</p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contract Information */}
          {(distributor.contract_start || distributor.contract_end) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-teal-600" />
                  Contract Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {distributor.contract_start && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contract Start</p>
                      <p className="text-sm">{formatDate(distributor.contract_start)}</p>
                    </div>
                  )}
                  {distributor.contract_end && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contract End</p>
                      <p className="text-sm">{formatDate(distributor.contract_end)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {distributor.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Additional Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{distributor.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
