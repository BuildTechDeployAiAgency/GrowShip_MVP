"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  ShoppingCart,
  Download,
  MoreHorizontal,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MainLayout } from "@/components/layout/main-layout";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useQuery } from "@tanstack/react-query";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
type OrderType = "all" | "sales" | "purchase";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  order_date: string;
  status: OrderStatus;
  total_amount: number;
  currency: string;
  items_count: number;
  type: OrderType;
}

const mockOrders: Order[] = [
  {
    id: "1",
    order_number: "ORD-2024-001",
    customer_name: "ABC Distributors",
    order_date: "2024-01-15",
    status: "pending",
    total_amount: 12500.00,
    currency: "USD",
    items_count: 25,
    type: "sales",
  },
  {
    id: "2",
    order_number: "ORD-2024-002",
    customer_name: "XYZ Retail",
    order_date: "2024-01-16",
    status: "processing",
    total_amount: 8750.50,
    currency: "USD",
    items_count: 18,
    type: "sales",
  },
  {
    id: "3",
    order_number: "ORD-2024-003",
    customer_name: "Manufacturing Co",
    order_date: "2024-01-17",
    status: "shipped",
    total_amount: 21000.00,
    currency: "USD",
    items_count: 45,
    type: "purchase",
  },
];

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-800", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
};

export function OrdersManagement() {
  const { profile } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<OrderType>("all");

  const { data: orders = mockOrders, isLoading } = useQuery({
    queryKey: ["orders", profile?.organization_id, searchTerm, statusFilter, typeFilter],
    queryFn: async () => {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockOrders.filter((order) => {
        const matchesSearch =
          order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        const matchesType = typeFilter === "all" || order.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      });
    },
    enabled: !!profile?.organization_id,
  });

  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <MainLayout
      pageTitle="Orders"
      pageSubtitle="Manage sales and purchase orders"
      actions={
        <>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Status: {statusFilter === "all" ? "All" : statusConfig[statusFilter as OrderStatus].label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Statuses
                  </DropdownMenuItem>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => setStatusFilter(status as OrderStatus)}
                    >
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Type: {typeFilter === "all" ? "All" : typeFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("sales")}>
                    Sales Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("purchase")}>
                    Purchase Orders
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Orders ({orders.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>{order.items_count}</TableCell>
                        <TableCell className="text-right font-medium">
                          {order.currency} {order.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Order</DropdownMenuItem>
                              <DropdownMenuItem>Print</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {order.status === "pending" && (
                                <DropdownMenuItem>Cancel Order</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}