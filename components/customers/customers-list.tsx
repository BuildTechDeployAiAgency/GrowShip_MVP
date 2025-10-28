"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Mail,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  AlertCircle,
  Building2,
  Filter,
  MapPin,
  Phone,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserProfile, UserStatus } from "@/types/auth";
import { EditUserDialog } from "@/components/users/edit-user-dialog";

interface CustomersListProps {
  searchTerm: string;
  filters: {
    status: string;
    company: string;
  };
  viewMode?: "grid" | "list";
  customers: UserProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateCustomerStatus: (customerId: string, status: UserStatus) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
}

export function CustomersList({
  searchTerm,
  filters,
  viewMode = "list",
  customers,
  loading,
  error,
  refetch,
  updateCustomerStatus,
  deleteCustomer,
}: CustomersListProps) {
  const [editingCustomer, setEditingCustomer] = useState<UserProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<UserProfile | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusBadge = (customer: UserProfile) => {
    switch (customer.user_status) {
      case "approved":
        return (
          <Badge
            variant="default"
            className="bg-green-500 text-white text-xs px-2 py-1 rounded-full"
          >
            <UserCheck className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "suspended":
        return (
          <Badge
            variant="destructive"
            className="bg-red-500 text-white text-xs px-2 py-1 rounded-full"
          >
            <UserX className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full"
          >
            Unknown
          </Badge>
        );
    }
  };

  const handleCustomerAction = async (action: string, customerId: string) => {
    try {
      setActionLoading(action + customerId);

      switch (action) {
        case "edit":
          const customerToEdit = customers.find((c) => c.user_id === customerId);
          if (customerToEdit) {
            setEditingCustomer(customerToEdit);
            setShowEditDialog(true);
          }
          setActionLoading(null);
          return;

        case "approve":
          await updateCustomerStatus(customerId, "approved");
          break;

        case "suspend":
          await updateCustomerStatus(customerId, "suspended");
          break;

        case "delete":
          const customerForDelete = customers.find((c) => c.user_id === customerId);
          if (customerForDelete) {
            setCustomerToDelete(customerForDelete);
            setShowDeleteDialog(true);
          }
          setActionLoading(null);
          return;
      }
    } catch (err) {
      console.error(`Error ${action}ing customer:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setActionLoading(`delete${customerToDelete.user_id}`);
      await deleteCustomer(customerToDelete.user_id);
      setShowDeleteDialog(false);
      setCustomerToDelete(null);
    } catch (err) {
      console.error("Error deleting customer:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-gray-600">Loading customers...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-8">
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-red-500 mb-4">
              <AlertCircle className="h-full w-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error Loading Customers
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-gray-600" />
            <span>Customers</span>
            <Badge variant="secondary" className="text-xs">
              {customers.length} {customers.length === 1 ? "customer" : "customers"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {customers.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
              <Building2 className="h-full w-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No customers found
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              {searchTerm ||
              filters.status !== "all" ||
              filters.company !== "all"
                ? "Try adjusting your search or filters to find customers"
                : "Get started by inviting your first customer to the platform"}
            </p>
            {(searchTerm ||
              filters.status !== "all" ||
              filters.company !== "all") && (
              <Button variant="outline" onClick={() => {}} className="gap-2">
                <Filter className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        ) : viewMode === "list" ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">Customer</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="group">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                        <AvatarImage src={customer.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-teal-500 to-blue-600 text-white text-sm font-semibold">
                          {customer.contact_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || 
                          customer.company_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {customer.contact_name || "Unknown Customer"}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {customer.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.company_name ? (
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Building2 className="h-3 w-3 text-gray-500" />
                        <span className="truncate">{customer.company_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.city && customer.state && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{customer.city}, {customer.state}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(customer)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="text-xs text-gray-500">
                          Customer Actions
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleCustomerAction("edit", customer.user_id)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Customer
                        </DropdownMenuItem>

                        {customer.user_status !== "approved" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleCustomerAction("approve", customer.user_id)
                            }
                            className="gap-2 text-green-700 focus:text-green-700"
                            disabled={
                              actionLoading === `approve${customer.user_id}`
                            }
                          >
                            <UserCheck className="h-4 w-4" />
                            Approve Customer
                          </DropdownMenuItem>
                        )}

                        {customer.user_status !== "suspended" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleCustomerAction("suspend", customer.user_id)
                            }
                            className="gap-2 text-orange-700 focus:text-orange-700"
                            disabled={
                              actionLoading === `suspend${customer.user_id}`
                            }
                          >
                            <UserX className="h-4 w-4" />
                            Suspend Customer
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() =>
                            handleCustomerAction("delete", customer.user_id)
                          }
                          className="gap-2 text-red-600 focus:text-red-600"
                          disabled={actionLoading === `delete${customer.user_id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {customers.map((customer) => (
              <Card
                key={customer.id}
                className="hover:shadow-lg transition-all duration-200 group border-gray-200"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-gray-100 group-hover:ring-teal-200 transition-all">
                          <AvatarImage src={customer.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-teal-500 to-blue-600 text-white text-sm font-semibold">
                            {customer.contact_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || 
                            customer.company_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {customer.contact_name || "Unknown Customer"}
                          </h3>
                          {customer.company_name && (
                            <p className="text-xs text-gray-600 truncate flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {customer.company_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(customer)}
                    </div>

                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.city && customer.state && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span>{customer.city}, {customer.state}</span>
                        </div>
                      )}
                      {customer.website && (
                        <div className="flex items-center gap-1 truncate">
                          <Globe className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{customer.website}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 pt-2">
                        Registered {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="w-full pt-3 border-t border-gray-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-52">
                          <DropdownMenuLabel className="text-xs text-gray-500">
                            Customer Actions
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() =>
                              handleCustomerAction("edit", customer.user_id)
                            }
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Customer
                          </DropdownMenuItem>

                          {customer.user_status !== "approved" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleCustomerAction("approve", customer.user_id)
                              }
                              className="gap-2 text-green-700 focus:text-green-700"
                              disabled={
                                actionLoading === `approve${customer.user_id}`
                              }
                            >
                              <UserCheck className="h-4 w-4" />
                              Approve Customer
                            </DropdownMenuItem>
                          )}

                          {customer.user_status !== "suspended" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleCustomerAction("suspend", customer.user_id)
                              }
                              className="gap-2 text-orange-700 focus:text-orange-700"
                              disabled={
                                actionLoading === `suspend${customer.user_id}`
                              }
                            >
                              <UserX className="h-4 w-4" />
                              Suspend Customer
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() =>
                              handleCustomerAction("delete", customer.user_id)
                            }
                            className="gap-2 text-red-600 focus:text-red-600"
                            disabled={actionLoading === `delete${customer.user_id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Customer Dialog */}
      <EditUserDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={editingCustomer}
        onUserUpdated={refetch}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirm Customer Deletion
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">
                  {customerToDelete?.company_name || customerToDelete?.contact_name || customerToDelete?.email}
                </span>
                ?
              </p>
              <p className="text-red-600 font-medium">
                This action cannot be undone. All customer data will be permanently
                removed from the system.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setCustomerToDelete(null);
              }}
              disabled={actionLoading === `delete${customerToDelete?.user_id}`}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteCustomer}
              disabled={actionLoading === `delete${customerToDelete?.user_id}`}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {actionLoading === `delete${customerToDelete?.user_id}`
                ? "Deleting..."
                : "Delete Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

