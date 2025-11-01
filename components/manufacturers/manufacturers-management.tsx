"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Factory,
  Download,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
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

interface Manufacturer {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone?: string;
  location: string;
  status: "active" | "inactive";
  total_orders: number;
  total_revenue: number;
}

const mockManufacturers: Manufacturer[] = [
  {
    id: "1",
    name: "EcoFabrics Manufacturing",
    contact_name: "David Chen",
    email: "david@ecofabrics.com",
    phone: "+1-555-0201",
    location: "Chicago, IL",
    status: "active",
    total_orders: 75,
    total_revenue: 210000,
  },
  {
    id: "2",
    name: "Material Supplier Inc",
    contact_name: "Sarah Johnson",
    email: "sarah@materialsupplier.com",
    phone: "+1-555-0202",
    location: "Dallas, TX",
    status: "active",
    total_orders: 120,
    total_revenue: 450000,
  },
];

export function ManufacturersManagement() {
  const { profile } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: manufacturers = mockManufacturers, isLoading } = useQuery({
    queryKey: ["manufacturers", profile?.organization_id, searchTerm, statusFilter],
    queryFn: async () => {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockManufacturers.filter((manufacturer) => {
        const matchesSearch =
          manufacturer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          manufacturer.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          manufacturer.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || manufacturer.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
    },
    enabled: !!profile?.organization_id,
  });

  return (
    <MainLayout
      pageTitle="Manufacturers"
      pageSubtitle="Manage manufacturer relationships"
      actions={
        <>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Manufacturer
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
                    placeholder="Search manufacturers..."
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
                    Status: {statusFilter === "all" ? "All" : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                    Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Manufacturers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Manufacturers ({manufacturers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            ) : manufacturers.length === 0 ? (
              <div className="text-center py-12">
                <Factory className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No manufacturers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manufacturers.map((manufacturer) => (
                      <TableRow key={manufacturer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{manufacturer.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {manufacturer.email}
                            </div>
                            {manufacturer.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-gray-400" />
                                {manufacturer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{manufacturer.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={manufacturer.status === "active" ? "default" : "secondary"}
                          >
                            {manufacturer.status === "active" ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {manufacturer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{manufacturer.total_orders}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${manufacturer.total_revenue.toLocaleString()}
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
                              <DropdownMenuItem>Edit Manufacturer</DropdownMenuItem>
                              <DropdownMenuItem>View Orders</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Send Message</DropdownMenuItem>
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