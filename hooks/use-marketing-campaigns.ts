"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MarketingCampaign, 
  CreateCampaignRequest, 
  UpdateCampaignRequest,
  CampaignFilters,
  CampaignListResponse,
  CampaignExpense,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  CampaignROISummary,
  ChannelPerformance,
  DistributorCampaignPerformance,
  ROITrendData,
  CampaignPerformanceAlert
} from "@/types/marketing";
import { toast } from "react-toastify";

// =============================================
// Campaign Management Hooks
// =============================================

export function useMarketingCampaigns(filters?: CampaignFilters, page: number = 1, pageSize: number = 20) {
  return useQuery({
    queryKey: ["marketing-campaigns", filters, page, pageSize],
    queryFn: async (): Promise<CampaignListResponse> => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            if (Array.isArray(value)) {
              if (value.length > 0) {
                params.append(key, value.join(","));
              }
            } else {
              params.append(key, String(value));
            }
          }
        });
      }
      
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));

      const response = await fetch(`/api/marketing/campaigns?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch campaigns");
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useMarketingCampaign(campaignId: string) {
  return useQuery({
    queryKey: ["marketing-campaign", campaignId],
    queryFn: async (): Promise<MarketingCampaign> => {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch campaign");
      }
      return response.json();
    },
    enabled: !!campaignId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCampaignRequest): Promise<MarketingCampaign> => {
      const response = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create campaign");
      }

      return response.json();
    },
    onSuccess: (newCampaign) => {
      // Invalidate campaigns list
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      
      // Add new campaign to cache
      queryClient.setQueryData(
        ["marketing-campaign", newCampaign.id],
        newCampaign
      );

      toast.success("Campaign created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateCampaignRequest): Promise<MarketingCampaign> => {
      const response = await fetch(`/api/marketing/campaigns/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update campaign");
      }

      return response.json();
    },
    onSuccess: (updatedCampaign) => {
      // Update campaign in cache
      queryClient.setQueryData(
        ["marketing-campaign", updatedCampaign.id],
        updatedCampaign
      );

      // Invalidate campaigns list
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });

      toast.success("Campaign updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string): Promise<void> => {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete campaign");
      }
    },
    onSuccess: (_, campaignId) => {
      // Remove campaign from cache
      queryClient.removeQueries({ queryKey: ["marketing-campaign", campaignId] });

      // Invalidate campaigns list
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });

      toast.success("Campaign deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// =============================================
// Campaign Expense Hooks
// =============================================

export function useCampaignExpenses(campaignId: string) {
  return useQuery({
    queryKey: ["campaign-expenses", campaignId],
    queryFn: async (): Promise<CampaignExpense[]> => {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/expenses`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch campaign expenses");
      }
      return response.json();
    },
    enabled: !!campaignId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCampaignExpense(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseRequest): Promise<CampaignExpense> => {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create expense");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate campaign expenses
      queryClient.invalidateQueries({ queryKey: ["campaign-expenses", campaignId] });
      
      // Invalidate campaign data to update spent budget
      queryClient.invalidateQueries({ queryKey: ["marketing-campaign", campaignId] });

      toast.success("Expense created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// =============================================
// ROI Analytics Hooks
// =============================================

interface ROIAnalyticsParams {
  campaignId?: string;
  brandId?: string;
  distributorId?: string;
  startDate?: string;
  endDate?: string;
  periodMonths?: number;
  granularity?: "monthly" | "quarterly";
}

export function useCampaignROISummary(params?: ROIAnalyticsParams) {
  return useQuery({
    queryKey: ["campaign-roi-summary", params],
    queryFn: async (): Promise<CampaignROISummary[]> => {
      const searchParams = new URLSearchParams({ type: "summary" });
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(`/api/marketing/analytics/roi?${searchParams}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch ROI summary");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useChannelPerformance(params?: ROIAnalyticsParams) {
  return useQuery({
    queryKey: ["channel-performance", params],
    queryFn: async (): Promise<ChannelPerformance[]> => {
      const searchParams = new URLSearchParams({ type: "channel" });
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(`/api/marketing/analytics/roi?${searchParams}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch channel performance");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDistributorCampaignPerformance(params?: ROIAnalyticsParams) {
  return useQuery({
    queryKey: ["distributor-campaign-performance", params],
    queryFn: async (): Promise<DistributorCampaignPerformance[]> => {
      const searchParams = new URLSearchParams({ type: "distributor" });
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(`/api/marketing/analytics/roi?${searchParams}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch distributor performance");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useROITrendAnalysis(params?: ROIAnalyticsParams) {
  return useQuery({
    queryKey: ["roi-trend-analysis", params],
    queryFn: async (): Promise<ROITrendData[]> => {
      const searchParams = new URLSearchParams({ type: "trend" });
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(`/api/marketing/analytics/roi?${searchParams}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch ROI trend");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCampaignPerformanceAlerts(params?: ROIAnalyticsParams) {
  return useQuery({
    queryKey: ["campaign-performance-alerts", params],
    queryFn: async (): Promise<CampaignPerformanceAlert[]> => {
      const searchParams = new URLSearchParams({ type: "alerts" });
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(`/api/marketing/analytics/roi?${searchParams}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch performance alerts");
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for alerts
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// =============================================
// Campaign Status Actions
// =============================================

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      status, 
      approvalStatus 
    }: { 
      campaignId: string; 
      status?: string; 
      approvalStatus?: string; 
    }): Promise<MarketingCampaign> => {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (approvalStatus) updateData.approvalStatus = approvalStatus;

      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update campaign status");
      }

      return response.json();
    },
    onSuccess: (updatedCampaign) => {
      // Update campaign in cache
      queryClient.setQueryData(
        ["marketing-campaign", updatedCampaign.id],
        updatedCampaign
      );

      // Invalidate campaigns list and analytics
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-roi-summary"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-performance-alerts"] });

      toast.success("Campaign status updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// =============================================
// Utility Hooks
// =============================================

export function useMarketingDashboardMetrics(brandId?: string, distributorId?: string) {
  const { data: campaigns, isLoading: campaignsLoading } = useMarketingCampaigns({ brandId, distributorId });
  const { data: roiSummary } = useCampaignROISummary({ brandId, distributorId });
  const { data: channelPerformance } = useChannelPerformance({ brandId, distributorId });
  const { data: alerts } = useCampaignPerformanceAlerts({ brandId, distributorId });

  return useQuery({
    queryKey: ["marketing-dashboard-metrics", brandId, distributorId, campaigns?.totalCount],
    queryFn: async () => {
      const campaignList = campaigns?.campaigns || [];
      const activeCampaigns = campaignList.filter(c => c.status === "active");
      const totalBudget = campaignList.reduce((sum, c) => sum + (c.totalBudget || 0), 0);
      const spentBudget = campaignList.reduce((sum, c) => sum + (c.spentBudget || 0), 0);
      const totalRevenue = campaignList.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
      
      // Calculate basic ROI metrics from campaign data if ROI summary is not available
      let averageROI = 0;
      let averageROAS = 0;
      
      if (roiSummary && roiSummary.length > 0) {
        averageROI = roiSummary.reduce((sum, r) => sum + r.roiPercentage, 0) / roiSummary.length;
        averageROAS = roiSummary.reduce((sum, r) => sum + r.roas, 0) / roiSummary.length;
      } else if (campaignList.length > 0) {
        // Fallback: calculate from campaign actual ROI data
        const campaignsWithROI = campaignList.filter(c => c.actualRoiPercentage !== undefined);
        if (campaignsWithROI.length > 0) {
          averageROI = campaignsWithROI.reduce((sum, c) => sum + (c.actualRoiPercentage || 0), 0) / campaignsWithROI.length;
        }
        
        const campaignsWithROAS = campaignList.filter(c => c.returnOnAdSpend !== undefined && c.returnOnAdSpend > 0);
        if (campaignsWithROAS.length > 0) {
          averageROAS = campaignsWithROAS.reduce((sum, c) => sum + (c.returnOnAdSpend || 0), 0) / campaignsWithROAS.length;
        }
      }

      // Generate channel performance from campaign data if analytics are not available
      let processedChannelPerformance = channelPerformance || [];
      if (!channelPerformance && campaignList.length > 0) {
        const channelMap = new Map();
        
        campaignList.forEach(campaign => {
          if (!campaign.channel) return;
          
          const existing = channelMap.get(campaign.channel) || {
            channel: campaign.channel,
            campaignCount: 0,
            totalRevenue: 0,
            totalSpent: 0,
            averageRoi: 0,
          };
          
          existing.campaignCount += 1;
          existing.totalRevenue += campaign.totalRevenue || 0;
          existing.totalSpent += campaign.spentBudget || 0;
          
          channelMap.set(campaign.channel, existing);
        });
        
        // Calculate average ROI for each channel
        channelMap.forEach((channel, key) => {
          const campaignsInChannel = campaignList.filter(c => c.channel === key);
          const roiValues = campaignsInChannel
            .filter(c => c.actualRoiPercentage !== undefined)
            .map(c => c.actualRoiPercentage || 0);
          
          if (roiValues.length > 0) {
            channel.averageRoi = roiValues.reduce((sum, roi) => sum + roi, 0) / roiValues.length;
          }
        });
        
        processedChannelPerformance = Array.from(channelMap.values())
          .sort((a, b) => b.averageRoi - a.averageRoi);
      }

      const topPerformingCampaign = roiSummary?.length > 0 
        ? campaigns?.campaigns.find(c => c.id === roiSummary.sort((a, b) => b.roiPercentage - a.roiPercentage)[0]?.campaignId)
        : campaignList.sort((a, b) => (b.actualRoiPercentage || 0) - (a.actualRoiPercentage || 0))[0];

      return {
        totalCampaigns: campaigns?.totalCount || 0,
        activeCampaigns: activeCampaigns.length,
        totalBudget,
        spentBudget,
        totalRevenue,
        averageROI,
        averageROAS,
        topPerformingCampaign,
        worstPerformingCampaign: campaignList.sort((a, b) => (a.actualRoiPercentage || 0) - (b.actualRoiPercentage || 0))[0],
        budgetUtilization: totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0,
        recentAlerts: alerts?.slice(0, 5) || [],
        channelPerformance: processedChannelPerformance,
        // Add loading and error states
        isLoading: campaignsLoading,
        hasError: false,
      };
    },
    enabled: !!campaigns || !campaignsLoading, // Enable when we have campaigns or when not loading
    staleTime: 5 * 60 * 1000,
  });
}