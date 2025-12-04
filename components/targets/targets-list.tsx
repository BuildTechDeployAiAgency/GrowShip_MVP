"use client";

import { useState } from "react";
import { useTargets, TargetScopeType } from "@/hooks/use-targets";
import { SalesTarget } from "@/hooks/use-targets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Edit, Trash2, Download, Target, Building2, Globe, Tag, Package } from "lucide-react";
import { format } from "date-fns";
import { TargetFormDialog } from "./target-form-dialog";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

// Scope badge colors
const scopeBadgeStyles: Record<TargetScopeType, string> = {
  sku: "bg-blue-100 text-blue-700 border-blue-200",
  distributor: "bg-purple-100 text-purple-700 border-purple-200",
  region: "bg-green-100 text-green-700 border-green-200",
  brand: "bg-orange-100 text-orange-700 border-orange-200",
  campaign: "bg-pink-100 text-pink-700 border-pink-200",
};

// Scope icons
const scopeIcons: Record<TargetScopeType, React.ReactNode> = {
  sku: <Package className="h-3 w-3" />,
  distributor: <Building2 className="h-3 w-3" />,
  region: <Globe className="h-3 w-3" />,
  brand: <Target className="h-3 w-3" />,
  campaign: <Tag className="h-3 w-3" />,
};

export function TargetsList() {
  const { profile } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { targets, isLoading, deleteTarget, refetch } = useTargets({
    sku: searchTerm || undefined,
    targetScope: scopeFilter !== "all" ? (scopeFilter as TargetScopeType) : undefined,
  });

  const handleEdit = (target: SalesTarget) => {
    setEditingTarget(target);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this target?")) {
      try {
        await deleteTarget(id);
        toast.success("Target deleted successfully");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete target");
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/targets/template");
      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `targets_import_template_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Template downloaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to download template");
    }
  };

  // Helper function to get target description
  const getTargetDescription = (target: SalesTarget): string => {
    if (target.target_name) return target.target_name;
    
    const parts: string[] = [];
    if (target.sku) parts.push(`SKU: ${target.sku}`);
    if (target.distributor_name) parts.push(target.distributor_name);
    if (target.territory) parts.push(target.territory);
    if (target.country) parts.push(target.country);
    if (target.campaign_id) parts.push(`Campaign: ${target.campaign_id}`);
    
    return parts.length > 0 ? parts.join(" • ") : "Brand Target";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-teal-600" />
            Sales Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sku">SKU / Product</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
                <SelectItem value="region">Region</SelectItem>
                <SelectItem value="brand">Brand (Global)</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Template
            </Button>
          </div>

          {targets.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No targets found</p>
              <p className="text-gray-500 text-sm mt-1">
                Create your first target to start tracking performance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((target: SalesTarget) => {
                    const scope = target.target_scope || "sku";
                    return (
                      <TableRow key={target.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-1 w-fit ${scopeBadgeStyles[scope]}`}
                          >
                            {scopeIcons[scope]}
                            <span className="capitalize">{scope}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {getTargetDescription(target)}
                            </span>
                            {target.notes && (
                              <span className="text-xs text-gray-500 truncate max-w-[300px]">
                                {target.notes}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{format(new Date(target.target_period), "MMM yyyy")}</span>
                            <span className="text-xs text-gray-500 capitalize">
                              {target.period_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {target.target_quantity?.toLocaleString() || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {target.target_revenue
                            ? `${target.currency || "USD"} ${formatCurrency(target.target_revenue).replace("$", "")}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(target)}
                              title="Edit target"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(target.id)}
                              title="Delete target"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TargetFormDialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTarget(null);
        }}
        target={editingTarget}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingTarget(null);
          refetch();
        }}
      />
    </>
  );
}


