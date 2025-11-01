"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Truck,
  Download,
  MoreHorizontal,
  MapPin,
  Clock,
  CheckCircle2,
  Package,
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

type ShipmentStatus = "preparing" | "in_transit" | "out_for_delivery" | "delivered" | "delayed";

interface Shipment {
  id: string;
  tracking_number: string;
  order_number: string;
  carrier: string;
  origin: string;
  destination: string;
  shipped_date: string;
  estimated_delivery: string;
  status: ShipmentStatus;
  packages_count: number;
  weight: number;
}

const mockShipments: Shipment[] = [
  {
    id: "1",
    tracking_number: "TRK-2024-001",
    order_number: "ORD-2024-001",
    carrier: "FedEx",
    origin: "New York, NY",
    destination: "Los Angeles, CA",
    shipped_date: "2024-01-15",
    estimated_delivery: "2024-01-20",
    status: "in_transit",
    packages_count: 3,
    weight: 45.5,
  },
  {
    id: "2",
    tracking_number: "TRK-2024-002",
    order_number: "ORD-2024-002",
    carrier: "UPS",
    origin: "Chicago, IL",
    destination: "Miami, FL",
    shipped_date: "2024-01-16",
    estimated_delivery: "2024-01-19",
    status: "out_for_delivery",
    packages_count: 1,
    weight: 12.3,
  },
  {
    id: "3",
    tracking_number: "TRK-2024-003",
    order_number: "ORD-2024-003",
    carrier: "DHL",
    origin: "Seattle, WA",
    destination: "Boston, MA",
    shipped_date: "2024-01-14",
    estimated_delivery: "2024-01-18",
    status: "delivered",
    packages_count: 5,
    weight: 78.2,
  },
];

const statusConfig: Record<ShipmentStatus, { label: string; color: string; icon: any }> = {
  preparing: { label: "Preparing", color: "bg-blue-100 text-blue-800", icon: Package },
  in_transit: { label: "In Transit", color: "bg-purple-100 text-purple-800", icon: Truck },
  out_for_delivery: { label: "Out for Delivery", color: "bg-orange-100 text-orange-800", icon: Clock },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  delayed: { label: "Delayed", color: "bg-red-100 text-red-800", icon: Clock },
};

export function ShipmentsManagement() {
  const { profile } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("all");

  const { data: shipments = mockShipments, isLoading } = useQuery({
    queryKey: ["shipments", profile?.organization_id, searchTerm, statusFilter],
    queryFn: async () => {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockShipments.filter((shipment) => {
        const matchesSearch =
          shipment.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shipment.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shipment.carrier.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
    },
    enabled: !!profile?.organization_id,
  });

  const StatusBadge = ({ status }: { status: ShipmentStatus }) => {
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
      pageTitle="Shipments"
      pageSubtitle="Track and manage shipments"
      actions={
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
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
                    placeholder="Search by tracking number, order number, or carrier..."
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
                    Status: {statusFilter === "all" ? "All" : statusConfig[statusFilter as ShipmentStatus].label}
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
                      onClick={() => setStatusFilter(status as ShipmentStatus)}
                    >
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Shipments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Shipments ({shipments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            ) : shipments.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No shipments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking Number</TableHead>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Origin ? Destination</TableHead>
                      <TableHead>Shipped Date</TableHead>
                      <TableHead>Estimated Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Packages</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                        <TableCell>{shipment.order_number}</TableCell>
                        <TableCell>{shipment.carrier}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">
                              {shipment.origin} ? {shipment.destination}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(shipment.shipped_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(shipment.estimated_delivery).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <StatusBadge status={shipment.status} />
                        </TableCell>
                        <TableCell>{shipment.packages_count} ({shipment.weight} lbs)</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>Track Shipment</DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Update Status</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Print Label</DropdownMenuItem>
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