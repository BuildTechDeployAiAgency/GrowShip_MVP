"use client";

import { useState } from "react";
import { 
  useMarketingCampaigns,
  useDeleteMarketingCampaign,
  useUpdateCampaignStatus
} from "@/hooks/use-marketing-campaigns";
import { CampaignFilters, MarketingCampaign } from "@/types/marketing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketingCampaignsListProps {
  filters?: CampaignFilters;
  onCampaignSelect?: (campaign: MarketingCampaign) => void;
  onCampaignEdit?: (campaignId: string) => void;
  onCampaignDelete?: (campaignId: string) => void;
  allowSelection?: boolean;
  compact?: boolean;
}

export function MarketingCampaignsList({
  filters: initialFilters,
  onCampaignSelect,
  onCampaignEdit,
  onCampaignDelete,
  allowSelection = false,
  compact = false,
}: MarketingCampaignsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<CampaignFilters>(initialFilters || {});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);

  const pageSize = compact ? 5 : 20;

  const { 
    data: campaignsData, 
    isLoading, 
    error 
  } = useMarketingCampaigns(
    { ...filters, search: searchTerm }, 
    currentPage, 
    pageSize
  );

  const deleteCampaign = useDeleteMarketingCampaign();
  const updateCampaignStatus = useUpdateCampaignStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "requires_revision":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const handleStatusUpdate = async (campaignId: string, newStatus: string) => {
    try {
      await updateCampaignStatus.mutateAsync({
        campaignId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Failed to update campaign status:", error);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (window.confirm("Are you sure you want to delete this campaign?")) {
      try {
        await deleteCampaign.mutateAsync(campaignId);
      } catch (error) {
        console.error("Failed to delete campaign:", error);
      }
    }
  };

  const handleCampaignClick = (campaign: MarketingCampaign) => {
    if (onCampaignSelect) {
      onCampaignSelect(campaign);
    }
  };

  const toggleCampaignSelection = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600 py-8">
            Error loading campaigns: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const campaigns = campaignsData?.campaigns || [];

  if (compact) {
    return (
      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No campaigns found
          </div>
        ) : (
          campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className={cn(
                "p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors",
                selectedCampaigns.includes(campaign.id) && "bg-blue-50 border-blue-200"
              )}
              onClick={() => handleCampaignClick(campaign)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{campaign.name}</h3>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(campaign.spentBudget)} / {formatCurrency(campaign.totalBudget)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "font-bold text-sm",
                    campaign.actualRoiPercentage >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {campaign.actualRoiPercentage >= 0 ? (
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 inline mr-1" />
                    )}
                    {formatPercentage(campaign.actualRoiPercentage)} ROI
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(campaign.totalRevenue)} revenue
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Marketing Campaigns</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No campaigns found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {allowSelection && (
                      <TableHead className="w-12">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCampaigns(campaigns.map(c => c.id));
                            } else {
                              setSelectedCampaigns([]);
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type & Channel</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow 
                      key={campaign.id}
                      className={cn(
                        "cursor-pointer hover:bg-gray-50",
                        selectedCampaigns.includes(campaign.id) && "bg-blue-50"
                      )}
                      onClick={() => handleCampaignClick(campaign)}
                    >
                      {allowSelection && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300"
                            checked={selectedCampaigns.includes(campaign.id)}
                            onChange={() => toggleCampaignSelection(campaign.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          {campaign.description && (
                            <div className="text-sm text-gray-500 truncate max-w-48">
                              {campaign.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="capitalize">
                            {campaign.campaignType.replace(/_/g, " ")}
                          </Badge>
                          <div className="text-sm text-gray-500 capitalize">
                            {campaign.channel.replace(/_/g, " ")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(campaign.startDate)}</div>
                          <div className="text-gray-500">to {formatDate(campaign.endDate)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {formatCurrency(campaign.spentBudget)}
                          </div>
                          <div className="text-gray-500">
                            of {formatCurrency(campaign.totalBudget)}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, (campaign.spentBudget / campaign.totalBudget) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(campaign.totalRevenue)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {campaign.attributedOrders} orders
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "font-medium",
                          campaign.actualRoiPercentage >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatPercentage(campaign.actualRoiPercentage)}
                        </div>
                        {campaign.returnOnAdSpend && (
                          <div className="text-sm text-gray-500">
                            {campaign.returnOnAdSpend.toFixed(2)}x ROAS
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          <div>
                            <Badge 
                              variant="outline" 
                              className={getApprovalStatusColor(campaign.approvalStatus)}
                            >
                              {campaign.approvalStatus}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onCampaignEdit && (
                              <DropdownMenuItem onClick={() => onCampaignEdit(campaign.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            
                            {campaign.status === "draft" && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(campaign.id, "active")}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            
                            {campaign.status === "active" && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(campaign.id, "paused")}
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            
                            {campaign.status === "paused" && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(campaign.id, "active")}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Resume
                              </DropdownMenuItem>
                            )}
                            
                            {["active", "paused"].includes(campaign.status) && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(campaign.id, "completed")}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Complete
                              </DropdownMenuItem>
                            )}
                            
                            {onCampaignDelete && ["draft", "cancelled"].includes(campaign.status) && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(campaign.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {campaignsData && campaignsData.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                  {Math.min(currentPage * pageSize, campaignsData.totalCount)} of{" "}
                  {campaignsData.totalCount} campaigns
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {campaignsData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(campaignsData.totalPages, prev + 1))}
                    disabled={currentPage === campaignsData.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}