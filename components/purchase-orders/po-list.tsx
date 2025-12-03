"use client";

import { useRef, useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePurchaseOrders } from "@/hooks/use-purchase-orders";
import type { PurchaseOrder, POStatus } from "@/types/purchase-orders";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { format } from "date-fns";
import { POActionsMenu } from "./po-actions-menu";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { POBulkApprovalDialog } from "./po-bulk-approval-dialog";
import { formatCurrency } from "@/lib/formatters";

const statusColors: Record<POStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  ordered: "bg-purple-100 text-purple-800",
  received: "bg-teal-100 text-teal-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
};

export function PurchaseOrdersList() {
  const { profile } = useEnhancedAuth();
  const router = useRouter();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    paymentStatus: "all",
    dateRange: "all",
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);

  const {
    purchaseOrders,
    loading,
    error,
    totalCount,
    deletePurchaseOrder,
    duplicatePurchaseOrder,
    refetch,
    page,
    pageCount,
    pageSize,
    setPage,
    setPageSize,
  } = usePurchaseOrders({
    searchTerm,
    filters,
    brandId: profile?.brand_id,
    distributorId: profile?.role_name?.startsWith("distributor_") ? profile.distributor_id : undefined,
  });

  // Reset selection when filters/page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, filters, searchTerm]);

  const startItem = totalCount === 0 ? 0 : page * pageSize + 1;
  const endItem =
    totalCount === 0 ? 0 : Math.min(startItem + purchaseOrders.length - 1, totalCount);
  const pageSizeOptions = [25, 50, 100];

  const rowVirtualizer = useVirtualizer({
    count: purchaseOrders.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 80,
    overscan: 6,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  const handleStatusChange = () => {
    refetch();
  };

  const handleDelete = async (poId: string) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      await deletePurchaseOrder(poId);
      refetch();
    }
  };

  const handleViewDetails = (poId: string) => {
    router.push(`/purchase-orders/${poId}`);
  };

  const handleEdit = (poId: string) => {
    router.push(`/purchase-orders/${poId}`);
  };

  const handleDuplicate = async (poId: string) => {
    try {
      const duplicatedPO = await duplicatePurchaseOrder(poId);
      router.push(`/purchase-orders/${duplicatedPO.id}`);
    } catch (error) {
      console.error("Failed to duplicate purchase order:", error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === purchaseOrders.length && purchaseOrders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(purchaseOrders.map((po) => po.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectedPOs = purchaseOrders.filter((po) => selectedIds.has(po.id));

  if (loading) {
    return (
      <div className="space-y-4">
        <TableSkeleton rows={8} columns={9} />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading purchase orders: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between flex-none">
        <div className="flex-1 w-full sm:w-auto flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search purchase orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          {selectedIds.size > 0 && (
            <Button 
              onClick={() => setShowBulkApproveDialog(true)}
              className="ml-2"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Bulk Approve ({selectedIds.size})
            </Button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters({ ...filters, status: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.paymentStatus}
            onValueChange={(value) =>
              setFilters({ ...filters, paymentStatus: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.dateRange}
            onValueChange={(value) =>
              setFilters({ ...filters, dateRange: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1 flex flex-col">
            <div
              ref={tableContainerRef}
              className="flex-1 overflow-y-auto"
            >
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <Checkbox
                      checked={
                        purchaseOrders.length > 0 &&
                        selectedIds.size === purchaseOrders.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Delivery
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No purchase orders found. Create your first purchase order to get started.
                    </td>
                  </tr>
                ) : (
                  <>
                    {paddingTop > 0 && (
                      <tr>
                        <td colSpan={9} style={{ height: `${paddingTop}px` }} />
                      </tr>
                    )}
                    {virtualRows.map((virtualRow) => {
                      const po = purchaseOrders[virtualRow.index];
                      return (
                        <tr
                          key={po.id}
                          data-index={virtualRow.index}
                          ref={(node) => rowVirtualizer.measureElement(node)}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Checkbox
                              checked={selectedIds.has(po.id)}
                              onCheckedChange={() => toggleSelect(po.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewDetails(po.id)}
                              className="text-sm font-medium text-teal-600 hover:text-teal-800 hover:underline"
                            >
                              {po.po_number}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {po.supplier_name}
                            </div>
                            {po.supplier_email && (
                              <div className="text-sm text-gray-500">
                                {po.supplier_email}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(po.po_date), "MMM dd, yyyy")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(po.total_amount, po.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={statusColors[po.po_status]}>
                              {po.po_status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={paymentColors[po.payment_status]}>
                              {po.payment_status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {po.expected_delivery_date
                              ? format(new Date(po.expected_delivery_date), "MMM dd, yyyy")
                              : "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <POActionsMenu
                              po={po}
                              onStatusChange={handleStatusChange}
                              onDelete={handleDelete}
                              onViewDetails={handleViewDetails}
                              onEdit={handleEdit}
                              onDuplicate={handleDuplicate}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {paddingBottom > 0 && (
                      <tr>
                        <td colSpan={9} style={{ height: `${paddingBottom}px` }} />
                      </tr>
                    )}
                  </>
                )}
              </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {totalCount > 0 && (
        <div className="flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between flex-none">
          <div>
            Showing {startItem}-{endItem} of {totalCount} purchase orders
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-gray-500">
                Rows per page
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue placeholder={`${pageSize}`} />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>
              <div className="text-xs font-medium text-gray-500">
                Page {pageCount === 0 ? 0 : page + 1} of{" "}
                {pageCount === 0 ? 0 : pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pageCount === 0 || page + 1 >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <POBulkApprovalDialog
        open={showBulkApproveDialog}
        onClose={() => setShowBulkApproveDialog(false)}
        selectedPOs={selectedPOs}
        onSuccess={() => {
          setSelectedIds(new Set());
          refetch();
        }}
      />
    </div>
  );
}
