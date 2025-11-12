"use client";

import { useState } from "react";
import { useTargets } from "@/hooks/use-targets";
import { SalesTarget } from "@/hooks/use-targets";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Edit, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { TargetFormDialog } from "./target-form-dialog";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "sonner";

export function TargetsList() {
  const { profile } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { targets, isLoading, deleteTarget } = useTargets({
    sku: searchTerm || undefined,
  });

  const handleEdit = (target: SalesTarget) => {
    setEditingTarget(target);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this target?")) {
      await deleteTarget(id);
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
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {targets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No targets found. Create your first target to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target Quantity</TableHead>
                  <TableHead>Target Revenue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((target: SalesTarget) => (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">{target.sku}</TableCell>
                    <TableCell>{format(new Date(target.target_period), "MMM yyyy")}</TableCell>
                    <TableCell className="capitalize">{target.period_type}</TableCell>
                    <TableCell>{target.target_quantity?.toLocaleString() || "-"}</TableCell>
                    <TableCell>
                      {target.target_revenue
                        ? `$${target.target_revenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(target)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(target.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        }}
      />
    </>
  );
}


