"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedPage } from "@/components/common/protected-page";
import { useRequireProfile } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Target, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Plus,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  useMarketingDashboardMetrics,
  useCampaignPerformanceAlerts 
} from "@/hooks/use-marketing-campaigns";
import { MarketingCampaignsList } from "@/components/marketing/marketing-campaigns-list";
import { CampaignROIDashboard } from "@/components/marketing/campaign-roi-dashboard";
import { CampaignFormDialog } from "@/components/marketing/campaign-form-dialog";
import { MarketingAnalytics } from "@/components/marketing/marketing-analytics";

export default function MarketingPage() {
  const { user, profile, loading } = useRequireProfile();
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Get user's brand/organization for filtering
  const brandId = profile?.role_name?.includes("brand") ? 
    profile?.brand_id : undefined;
  const distributorId = !profile?.role_name?.includes("brand") && 
                       !profile?.role_name?.includes("super") ? 
    profile?.distributor_id : undefined;

  const { data: dashboardMetrics, isLoading: metricsLoading, error: metricsError } = useMarketingDashboardMetrics(
    brandId, 
    distributorId
  );

  const { data: alerts } = useCampaignPerformanceAlerts({
    brandId,
    distributorId
  });

  if (loading) {
    return (
      <ProtectedPage>
        <MainLayout pageTitle="Marketing">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </MainLayout>
      </ProtectedPage>
    );
  }

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
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

  return (
    <ProtectedPage>
      <MainLayout pageTitle="Marketing">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
              <p className="text-sm text-gray-500">
                Campaign tracking, ROI analysis, and fund management
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {metricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="h-8 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : metricsError ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-red-600 mb-2">Failed to load dashboard metrics</div>
                <p className="text-sm text-gray-500">Please try refreshing the page</p>
              </CardContent>
            </Card>
          ) : dashboardMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Total Campaigns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardMetrics.totalCampaigns}</div>
                  <p className="text-sm text-green-600">
                    {dashboardMetrics.activeCampaigns} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(dashboardMetrics.totalBudget)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(dashboardMetrics.spentBudget)} spent
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Average ROI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercentage(dashboardMetrics.averageROI)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {dashboardMetrics.averageROAS.toFixed(2)}x ROAS
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(dashboardMetrics.totalRevenue)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatPercentage(dashboardMetrics.budgetUtilization)} budget used
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Alerts */}
          {alerts && alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Performance Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.campaignId + alert.alertType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getAlertSeverityColor(alert.alertSeverity)}>
                            {alert.alertSeverity}
                          </Badge>
                          <span className="font-medium">{alert.campaignName}</span>
                        </div>
                        <p className="text-sm text-gray-600">{alert.alertMessage}</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {alerts.length > 5 && (
                    <div className="text-center">
                      <Button variant="outline" size="sm">
                        View All Alerts ({alerts.length})
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="roi">ROI Dashboard</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Campaigns */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Campaigns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MarketingCampaignsList
                      filters={{ 
                        brandId, 
                        distributorId,
                        status: ["active", "paused", "completed"]
                      }}
                      compact={true}
                      onCampaignSelect={(campaign) => {
                        console.log("View campaign:", campaign.id);
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Top Performing Channels */}
                <Card>
                  <CardHeader>
                    <CardTitle>Channel Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metricsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-16"></div>
                              </div>
                              <div className="text-right">
                                <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-16"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : dashboardMetrics?.channelPerformance && dashboardMetrics.channelPerformance.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardMetrics.channelPerformance.slice(0, 5).map((channel) => (
                          <div key={channel.channel} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium capitalize">
                                {channel.channel.replace(/_/g, " ")}
                              </div>
                              <div className="text-sm text-gray-500">
                                {channel.campaignCount} campaigns
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                {formatPercentage(channel.averageRoi)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatCurrency(channel.totalRevenue)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        {dashboardMetrics?.totalCampaigns === 0 
                          ? "Create your first campaign to see channel performance" 
                          : "No channel performance data available yet"
                        }
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-6">
              <MarketingCampaignsList
                filters={{ brandId, distributorId }}
                onCampaignEdit={(campaignId) => {
                  console.log("Edit campaign:", campaignId);
                  // TODO: Open edit dialog
                }}
                onCampaignDelete={(campaignId) => {
                  console.log("Delete campaign:", campaignId);
                  // TODO: Handle delete
                }}
                allowSelection={true}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <MarketingAnalytics 
                brandId={brandId}
                distributorId={distributorId}
              />
            </TabsContent>

            <TabsContent value="roi" className="space-y-6">
              <CampaignROIDashboard 
                brandId={brandId}
                distributorId={distributorId}
                timeframe="12m"
                onCampaignClick={(campaignId) => {
                  console.log("View campaign details:", campaignId);
                  // TODO: Navigate to campaign detail
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Create Campaign Dialog */}
        <CampaignFormDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      </MainLayout>
    </ProtectedPage>
  );
}