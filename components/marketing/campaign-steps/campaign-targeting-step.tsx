"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  Users, 
  MapPin, 
  Globe, 
  Search,
  CheckCircle,
  Circle,
  Building,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { useDistributors } from "@/hooks/use-distributors";
import { useRegions } from "@/hooks/use-regions";
import { useTerritories } from "@/hooks/use-territories";

export function CampaignTargetingStep() {
  const { control, watch, setValue, formState: { errors } } = useFormContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistributors, setSelectedDistributors] = useState<string[]>(watch('distributorIds') || []);
  
  // Hooks to fetch data
  const { distributors, loading: distributorsLoading } = useDistributors();
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const { territories, loading: territoriesLoading } = useTerritories();

  // Filter distributors based on search term
  const filteredDistributors = distributors?.filter(distributor =>
    distributor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distributor.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distributor.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distributor.country?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDistributorToggle = (distributorId: string) => {
    const updated = selectedDistributors.includes(distributorId)
      ? selectedDistributors.filter(id => id !== distributorId)
      : [...selectedDistributors, distributorId];
    
    setSelectedDistributors(updated);
    setValue('distributorIds', updated);
  };

  const selectAllDistributors = () => {
    const allIds = filteredDistributors.map(d => d.id);
    setSelectedDistributors(allIds);
    setValue('distributorIds', allIds);
  };

  const clearAllDistributors = () => {
    setSelectedDistributors([]);
    setValue('distributorIds', []);
  };

  // Get selected distributor objects for display
  const selectedDistributorObjects = distributors?.filter(d => 
    selectedDistributors.includes(d.id)
  ) || [];

  // Calculate total performance metrics for selected distributors
  const totalRevenue = selectedDistributorObjects.reduce((sum, d) => 
    sum + (d.revenue_to_date || 0), 0
  );
  const totalOrders = selectedDistributorObjects.reduce((sum, d) => 
    sum + (d.orders_count || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Target Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Target Audience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={control}
            name="targetAudience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Audience Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your target audience (demographics, interests, behaviors)..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Define who you want to reach with this campaign (e.g., "Small business owners aged 25-45 in urban areas")
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Distributor Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Select Distributors *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search distributors by name, contact, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllDistributors}
              disabled={filteredDistributors.length === 0}
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAllDistributors}
              disabled={selectedDistributors.length === 0}
            >
              Clear All
            </Button>
          </div>

          {/* Selected Distributors Summary */}
          {selectedDistributors.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-blue-900">
                  Selected: {selectedDistributors.length} distributor(s)
                </h3>
                <div className="flex items-center gap-4 text-sm text-blue-700">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Total Revenue: ${totalRevenue.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Total Orders: {totalOrders.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedDistributorObjects.map(distributor => (
                  <Badge key={distributor.id} variant="secondary">
                    {distributor.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Distributor List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {distributorsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredDistributors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No distributors found matching your search.' : 'No distributors available.'}
              </div>
            ) : (
              filteredDistributors.map(distributor => {
                const isSelected = selectedDistributors.includes(distributor.id);
                return (
                  <div
                    key={distributor.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => handleDistributorToggle(distributor.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {isSelected ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{distributor.name}</h3>
                          {distributor.contact_name && (
                            <p className="text-sm text-gray-600">Contact: {distributor.contact_name}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            {distributor.city && distributor.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {distributor.city}, {distributor.country}
                              </span>
                            )}
                            {distributor.territory_id && (
                              <Badge variant="outline" className="text-xs">
                                Territory: {distributor.territory_id}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right text-sm">
                        {(distributor.revenue_to_date || distributor.orders_count) && (
                          <>
                            <div className="font-medium text-green-600">
                              ${(distributor.revenue_to_date || 0).toLocaleString()}
                            </div>
                            <div className="text-gray-500">
                              {distributor.orders_count || 0} orders
                            </div>
                          </>
                        )}
                        <div className={`text-xs px-2 py-1 rounded-full mt-1 ${distributor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {distributor.status}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {errors.distributorIds && (
            <p className="text-sm text-red-600">Please select at least one distributor</p>
          )}
        </CardContent>
      </Card>

      {/* Geographic Targeting (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Geographic Targeting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormDescription>
            Optionally filter by specific regions or territories. Leave empty to include all regions.
          </FormDescription>
          
          {/* Regions */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Regions</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {regionsLoading ? (
                <div className="col-span-full flex justify-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                regions?.map(region => (
                  <div key={region.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`region-${region.id}`}
                      onCheckedChange={(checked) => {
                        const current = watch('regionIds') || [];
                        const updated = checked
                          ? [...current, region.id]
                          : current.filter((id: string) => id !== region.id);
                        setValue('regionIds', updated);
                      }}
                    />
                    <Label
                      htmlFor={`region-${region.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {region.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Territories */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Territories</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {territoriesLoading ? (
                <div className="col-span-full flex justify-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                territories?.map(territory => (
                  <div key={territory.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`territory-${territory.id}`}
                      onCheckedChange={(checked) => {
                        const current = watch('territoryIds') || [];
                        const updated = checked
                          ? [...current, territory.id]
                          : current.filter((id: string) => id !== territory.id);
                        setValue('territoryIds', updated);
                      }}
                    />
                    <Label
                      htmlFor={`territory-${territory.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {territory.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}