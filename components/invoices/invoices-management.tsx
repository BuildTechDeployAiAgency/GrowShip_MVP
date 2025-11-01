"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  MoreHorizontal,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
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

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
type InvoiceType = "all" | "outgoing" | "incoming";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  total_amount: number;
  currency: string;
  type: InvoiceType;
}

const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoice_number: "INV-2024-001",
    customer_name: "ABC Distributors",
    invoice_date: "2024-01-01",
    due_date: "2024-01-31",
    status: "sent",
    total_amount: 12500.00,
    currency: "USD",
    type: "outgoing",
  },
  {
    id: "2",
    invoice_number: "INV-2024-002",
    customer_name: "XYZ Retail",
    invoice_date: "2024-01-05",
    due_date: "2024-02-04",
    status: "paid",
    total_amount: 8750.50,
    currency: "USD",
    type: "outgoing",
  },
  {
    id: "3",
    invoice_number: "INV-2024-003",
    customer_name: "Material Supplier Inc",
    invoice_date: "2024-01-10",
    due_date: "2024-01-25",
    status: "overdue",
    total_amount: 15000.00,
    currency: "USD",
    type: "incoming",
  },
];

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800", icon: XCircle },
};

export function InvoicesManagement() {
  const { profile } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<InvoiceType>("all");

  const { data: invoices = mockInvoices, isLoading } = useQuery({
    queryKey: ["invoices", profile?.organization_id, searchTerm, statusFilter, typeFilter],
    queryFn: async () => {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockInvoices.filter((invoice) => {
        const matchesSearch =
          invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
        const matchesType = typeFilter === "all" || invoice.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      });
    },
    enabled: !!profile?.organization_id,
  });

  const StatusBadge = ({ status }: { status: InvoiceStatus }) => {
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
      pageTitle="Invoices"
      pageSubtitle="Manage outgoing and incoming invoices"
      actions={
        <>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
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
                    placeholder="Search invoices..."
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
                    Status: {statusFilter === "all" ? "All" : statusConfig[statusFilter as InvoiceStatus].label}
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
                      onClick={() => setStatusFilter(status as InvoiceStatus)}
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
                  <DropdownMenuItem onClick={() => setTypeFilter("outgoing")}>
                    Outgoing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("incoming")}>
                    Incoming
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Invoices ({invoices.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No invoices found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Customer/Supplier</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.customer_name}</TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.type === "outgoing" ? "default" : "secondary"}>
                            {invoice.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {invoice.currency} {invoice.total_amount.toLocaleString()}
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
                              <DropdownMenuItem>View Invoice</DropdownMenuItem>
                              <DropdownMenuItem>Download PDF</DropdownMenuItem>
                              <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {invoice.status === "draft" && (
                                <DropdownMenuItem>Edit Invoice</DropdownMenuItem>
                              )}
                              {invoice.status === "sent" && (
                                <DropdownMenuItem>Mark as Paid</DropdownMenuItem>
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