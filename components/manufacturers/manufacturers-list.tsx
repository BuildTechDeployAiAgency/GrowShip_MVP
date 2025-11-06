"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useManufacturers,
  Manufacturer,
  ManufacturerStatus,
} from "@/hooks/use-manufacturers";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { ManufacturerFormDialog } from "@/components/manufacturers/manufacturer-form-dialog";

const statusColors: Record<ManufacturerStatus, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  archived: "bg-red-100 text-red-800",
};

export function ManufacturersList() {
  const { profile, canPerformAction } = useEnhancedAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    country: "all",
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<Manufacturer | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const {
    manufacturers,
    loading,
    error,
    totalCount,
    deleteManufacturer,
    refetch,
  } = useManufacturers({
    searchTerm,
    filters,
    brandId: profile?.brand_id,
    isSuperAdmin: profile?.role_name === "super_admin",
  });

  const handleEdit = (manufacturer: Manufacturer) => {
    setSelectedManufacturer(manufacturer);
    setShowEditDialog(true);
  };

  const handleDelete = async (manufacturerId: string, manufacturerName: string) => {
    if (confirm(`Are you sure you want to delete "${manufacturerName}"?`)) {
      await deleteManufacturer(manufacturerId);
    }
  };

  const handleView = (manufacturerId: string) => {
    router.push(`/manufacturers/${manufacturerId}`);
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading manufacturers: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, code, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={!profile?.brand_id}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Manufacturer
          </Button>
        </div>
      </div>

      {/* Manufacturers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {manufacturers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No manufacturers found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by adding a new manufacturer.
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => setShowCreateDialog(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Manufacturer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  manufacturers.map((manufacturer) => (
                    <tr
                      key={manufacturer.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleView(manufacturer.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-teal-600" />
                          </div>
                          <div className="ml-4">
                            <Link
                              href={`/manufacturers/${manufacturer.id}`}
                              className="text-sm font-medium text-teal-600 hover:text-teal-900"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {manufacturer.name}
                            </Link>
                            {manufacturer.tax_id && (
                              <div className="text-xs text-gray-500">
                                Tax ID: {manufacturer.tax_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {manufacturer.code || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {manufacturer.contact_name && (
                            <div className="text-sm text-gray-900 flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {manufacturer.contact_name}
                            </div>
                          )}
                          {manufacturer.contact_email && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {manufacturer.contact_email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {manufacturer.city && manufacturer.country
                            ? `${manufacturer.city}, ${manufacturer.country}`
                            : manufacturer.city || manufacturer.country || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {manufacturer.orders_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(
                            manufacturer.revenue_to_date || 0,
                            manufacturer.currency || "USD"
                          )}
                        </div>
                        {manufacturer.margin_percent && (
                          <div className="text-xs text-gray-500">
                            Margin: {manufacturer.margin_percent}%
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={statusColors[manufacturer.status]}>
                          {manufacturer.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(manufacturer.id);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(manufacturer);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(manufacturer.id, manufacturer.name);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {manufacturers.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {manufacturers.length} of {totalCount} manufacturers
        </div>
      )}

      {/* Create Dialog */}
      <ManufacturerFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />

      {/* Edit Dialog */}
      <ManufacturerFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        manufacturer={selectedManufacturer}
        onSuccess={() => {
          setShowEditDialog(false);
          setSelectedManufacturer(null);
          refetch();
        }}
      />
    </div>
  );
}

