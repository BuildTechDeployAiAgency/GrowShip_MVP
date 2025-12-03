"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  Trash2,
  Package,
  ShoppingCart,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useManufacturers, Manufacturer, ManufacturerStatus } from "@/hooks/use-manufacturers";
import { ManufacturerFormDialog } from "@/components/manufacturers/manufacturer-form-dialog";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { formatCurrency } from "@/lib/formatters";

const statusColors: Record<ManufacturerStatus, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  archived: "bg-red-100 text-red-800",
};

function ManufacturerDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useEnhancedAuth();
  const manufacturerId = params.id as string;
  
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const { manufacturers, deleteManufacturer, refetch } = useManufacturers({
    searchTerm: "",
    filters: {},
    brandId: profile?.brand_id,
  });

  useEffect(() => {
    if (manufacturers.length > 0) {
      const found = manufacturers.find((m) => m.id === manufacturerId);
      if (found) {
        setManufacturer(found);
        setLoading(false);
      } else {
        // If not found, might need to refetch
        refetch();
      }
    }
  }, [manufacturers, manufacturerId, refetch]);

  const handleDelete = async () => {
    if (!manufacturer) return;
    
    if (confirm(`Are you sure you want to delete "${manufacturer.name}"?`)) {
      await deleteManufacturer(manufacturer.id);
      router.push("/manufacturers");
    }
  };

  if (loading) {
    return (
      <MainLayout pageTitle="Manufacturer Details" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!manufacturer) {
    return (
      <MainLayout pageTitle="Manufacturer Not Found" pageSubtitle="Error">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Manufacturer not found</p>
            <Button className="mt-4" onClick={() => router.push("/manufacturers")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Manufacturers
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      pageTitle={manufacturer.name}
      pageSubtitle={`${manufacturer.code || "No Code"} • ${manufacturer.status}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/manufacturers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <Badge className={`mt-2 ${statusColors[manufacturer.status]}`}>
                    {manufacturer.status}
                  </Badge>
                </div>
                <Building2 className="h-8 w-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {manufacturer.orders_count || 0}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(manufacturer.revenue_to_date || 0, manufacturer.currency)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Margin</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {manufacturer.margin_percent ? `${manufacturer.margin_percent}%` : "N/A"}
                  </p>
                </div>
                <Package className="h-8 w-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Manufacturer Name</p>
                <p className="text-base text-gray-900 mt-1">{manufacturer.name}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-gray-600">Code</p>
                <p className="text-base font-mono text-gray-900 mt-1">{manufacturer.code || "N/A"}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-gray-600">Tax ID</p>
                <p className="text-base text-gray-900 mt-1">{manufacturer.tax_id || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-teal-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Contact Name</p>
                <p className="text-base text-gray-900 mt-1">{manufacturer.contact_name || "N/A"}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                {manufacturer.contact_email ? (
                  <a
                    href={`mailto:${manufacturer.contact_email}`}
                    className="text-base text-teal-600 hover:text-teal-700 mt-1 flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {manufacturer.contact_email}
                  </a>
                ) : (
                  <p className="text-base text-gray-900 mt-1">N/A</p>
                )}
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-gray-600">Phone</p>
                {manufacturer.contact_phone ? (
                  <a
                    href={`tel:${manufacturer.contact_phone}`}
                    className="text-base text-teal-600 hover:text-teal-700 mt-1 flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    {manufacturer.contact_phone}
                  </a>
                ) : (
                  <p className="text-base text-gray-900 mt-1">N/A</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal-600" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Address</p>
                <div className="text-base text-gray-900 mt-1">
                  {manufacturer.address_line1 && <p>{manufacturer.address_line1}</p>}
                  {manufacturer.address_line2 && <p>{manufacturer.address_line2}</p>}
                  {(manufacturer.city || manufacturer.state || manufacturer.postal_code) && (
                    <p>
                      {[manufacturer.city, manufacturer.state, manufacturer.postal_code]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {manufacturer.country && <p>{manufacturer.country}</p>}
                  {!manufacturer.address_line1 &&
                    !manufacturer.city &&
                    !manufacturer.country && <p>N/A</p>}
                </div>
              </div>
              {(manufacturer.latitude || manufacturer.longitude) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Coordinates</p>
                    <p className="text-base text-gray-900 mt-1">
                      {manufacturer.latitude}, {manufacturer.longitude}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-teal-600" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Currency</p>
                <p className="text-base text-gray-900 mt-1">{manufacturer.currency || "USD"}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-gray-600">Payment Terms</p>
                <p className="text-base text-gray-900 mt-1">{manufacturer.payment_terms || "N/A"}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Orders Count</p>
                  <p className="text-base text-gray-900 mt-1">{manufacturer.orders_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue to Date</p>
                  <p className="text-base text-gray-900 mt-1">
                    {formatCurrency(manufacturer.revenue_to_date || 0, manufacturer.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Information */}
          {(manufacturer.contract_start || manufacturer.contract_end) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-teal-600" />
                  Contract Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Contract Start</p>
                    <p className="text-base text-gray-900 mt-1">
                      {manufacturer.contract_start
                        ? new Date(manufacturer.contract_start).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Contract End</p>
                    <p className="text-base text-gray-900 mt-1">
                      {manufacturer.contract_end
                        ? new Date(manufacturer.contract_end).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {manufacturer.notes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-gray-900 whitespace-pre-wrap">{manufacturer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timestamps */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-sm text-gray-500">
              <div>
                Created: {manufacturer.created_at ? new Date(manufacturer.created_at).toLocaleString() : "N/A"}
              </div>
              <div>
                Updated: {manufacturer.updated_at ? new Date(manufacturer.updated_at).toLocaleString() : "N/A"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <ManufacturerFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        manufacturer={manufacturer}
        onSuccess={() => {
          setShowEditDialog(false);
          refetch();
        }}
      />
    </MainLayout>
  );
}

export default function ManufacturerDetailPage() {
  const { user, profile, loading } = useRequireProfile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <MainLayout pageTitle="Manufacturer Details" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <ManufacturerDetailContent />
    </ProtectedPage>
  );
}

