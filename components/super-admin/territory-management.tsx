"use client";

import { useState } from "react";
import {
  Globe,
  MapPin,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  Search,
  Building2,
  ShoppingCart,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTerritories } from "@/hooks/use-territories";
import { COUNTRIES } from "@/components/ui/country-select";
import { toast } from "react-toastify";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { cn } from "@/lib/utils";

interface TerritoryFormData {
  code: string;
  name: string;
  region_id: string;
  countries: string[];
  description: string;
  display_order: number;
  is_active: boolean;
}

const initialFormData: TerritoryFormData = {
  code: "",
  name: "",
  region_id: "",
  countries: [],
  description: "",
  display_order: 0,
  is_active: true,
};

export function TerritoryManagement() {
  const { canPerformAction } = useEnhancedAuth();
  const isSuperAdmin = canPerformAction("view_all_users");
  
  const {
    territories,
    regions,
    loading,
    error,
    refetch,
    createTerritory,
    updateTerritory,
    deleteTerritory,
  } = useTerritories({ includeMetrics: true });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<any | null>(null);
  const [formData, setFormData] = useState<TerritoryFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [territoryToDelete, setTerritoryToDelete] = useState<any | null>(null);

  // Check permissions
  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground mt-2">
            You need Super Admin privileges to access territory management.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter territories
  const filteredTerritories = territories.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion =
      selectedRegion === "all" || t.region_id === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  // Group territories by region for display
  const territoriesByRegion = regions.map((region) => ({
    region,
    territories: filteredTerritories.filter((t) => t.region_id === region.id),
  }));

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.code || !formData.name || !formData.region_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);

      if (editingTerritory) {
        await updateTerritory(editingTerritory.id, {
          code: formData.code,
          name: formData.name,
          region_id: formData.region_id,
          countries: formData.countries,
          description: formData.description,
          display_order: formData.display_order,
          is_active: formData.is_active,
        });
      } else {
        await createTerritory({
          code: formData.code,
          name: formData.name,
          region_id: formData.region_id,
          countries: formData.countries,
          description: formData.description,
          display_order: formData.display_order,
          is_active: formData.is_active,
        });
      }

      setDialogOpen(false);
      setEditingTerritory(null);
      setFormData(initialFormData);
    } catch (err) {
      console.error("Error saving territory:", err);
    } finally {
      setSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (territory: any) => {
    setEditingTerritory(territory);
    setFormData({
      code: territory.code,
      name: territory.name,
      region_id: territory.region_id || "",
      countries: territory.countries || [],
      description: territory.description || "",
      display_order: territory.display_order || 0,
      is_active: territory.is_active,
    });
    setDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!territoryToDelete) return;

    try {
      await deleteTerritory(territoryToDelete.id);
      setDeleteConfirmOpen(false);
      setTerritoryToDelete(null);
    } catch (err) {
      console.error("Error deleting territory:", err);
    }
  };

  // Handle country toggle
  const toggleCountry = (countryCode: string) => {
    setFormData((prev) => ({
      ...prev,
      countries: prev.countries.includes(countryCode)
        ? prev.countries.filter((c) => c !== countryCode)
        : [...prev.countries, countryCode],
    }));
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Error Loading Territories</h3>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search territories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setEditingTerritory(null);
            setFormData(initialFormData);
            setDialogOpen(true);
          }}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Territory
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Regions</p>
                <p className="text-2xl font-bold">{regions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <MapPin className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Territories</p>
                <p className="text-2xl font-bold">{territories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Distributors</p>
                <p className="text-2xl font-bold">
                  {territories.reduce((sum, t) => sum + (t.distributor_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    territories.reduce((sum, t) => sum + (t.total_revenue || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Territories by Region */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="byRegion">By Region</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Territory</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Countries</TableHead>
                    <TableHead className="text-right">Distributors</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTerritories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No territories found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTerritories.map((territory) => (
                      <TableRow key={territory.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{territory.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {territory.code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {territory.region_name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {territory.countries?.slice(0, 3).map((code: string) => (
                              <Badge
                                key={code}
                                variant="secondary"
                                className="text-xs"
                              >
                                {code}
                              </Badge>
                            ))}
                            {territory.countries?.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{territory.countries.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {territory.distributor_count || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {territory.order_count || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(territory.total_revenue || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={territory.is_active ? "default" : "secondary"}
                            className={cn(
                              territory.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            )}
                          >
                            {territory.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(territory)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setTerritoryToDelete(territory);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byRegion">
          <div className="space-y-6">
            {territoriesByRegion.map(({ region, territories: regionTerritories }) => (
              <Card key={region.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-teal-600" />
                      <CardTitle className="text-lg">{region.name}</CardTitle>
                      <Badge variant="outline">{region.code}</Badge>
                    </div>
                    <Badge>{regionTerritories.length} territories</Badge>
                  </div>
                  {region.description && (
                    <CardDescription>{region.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {regionTerritories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No territories in this region match your filter
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {regionTerritories.map((territory) => (
                        <Card
                          key={territory.id}
                          className="border-l-4 border-l-teal-500"
                        >
                          <CardContent className="py-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">{territory.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {territory.code}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(territory)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {territory.countries?.map((code: string) => (
                                <Badge
                                  key={code}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {code}
                                </Badge>
                              ))}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  Distributors
                                </p>
                                <p className="font-medium">
                                  {territory.distributor_count || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  Orders
                                </p>
                                <p className="font-medium">
                                  {territory.order_count || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  Revenue
                                </p>
                                <p className="font-medium">
                                  {formatCurrency(territory.total_revenue || 0)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-teal-600" />
              {editingTerritory ? "Edit Territory" : "Add New Territory"}
            </DialogTitle>
            <DialogDescription>
              {editingTerritory
                ? "Update the territory information"
                : "Create a new territory for geographic reporting"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">
                  Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="e.g., UAE, KSA"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div>
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., United Arab Emirates"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region_id">
                  Region <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.region_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, region_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name} ({region.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this territory"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div>
              <Label>Countries</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select the countries that belong to this territory (ISO codes)
              </p>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {COUNTRIES.map((country) => (
                    <label
                      key={country.code}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer text-sm",
                        formData.countries.includes(country.code)
                          ? "bg-teal-100 border border-teal-300"
                          : "hover:bg-gray-100"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formData.countries.includes(country.code)}
                        onChange={() => toggleCountry(country.code)}
                        className="rounded"
                      />
                      <span className="font-medium">{country.code}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {country.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {formData.countries.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {formData.countries.join(", ")}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving
                ? "Saving..."
                : editingTerritory
                ? "Update Territory"
                : "Create Territory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Territory</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{territoryToDelete?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

