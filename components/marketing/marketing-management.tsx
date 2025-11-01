"use client";

import { useState } from "react";
import {
  Plus,
  Megaphone,
  Mail,
  Users,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/main-layout";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

type CampaignStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  reach: number;
  engagement: number;
}

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Q1 Product Launch",
    type: "Email",
    status: "active",
    startDate: "2024-01-01",
    endDate: "2024-03-31",
    reach: 5000,
    engagement: 12.5,
  },
  {
    id: "2",
    name: "Summer Promotion",
    type: "Social Media",
    status: "scheduled",
    startDate: "2024-06-01",
    endDate: "2024-08-31",
    reach: 0,
    engagement: 0,
  },
];

const statusConfig: Record<CampaignStatus, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: Clock },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800", icon: Calendar },
  active: { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-purple-100 text-purple-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
};

export function MarketingManagement() {
  const { profile } = useEnhancedAuth();
  const [activeTab, setActiveTab] = useState<"campaigns" | "analytics">("campaigns");

  return (
    <MainLayout
      pageTitle="Marketing"
      pageSubtitle="Manage marketing campaigns and analytics"
      actions={
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`px-4 py-2 font-medium ${
              activeTab === "campaigns"
                ? "border-b-2 border-teal-500 text-teal-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 font-medium ${
              activeTab === "analytics"
                ? "border-b-2 border-teal-500 text-teal-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Analytics
          </button>
        </div>

        {activeTab === "campaigns" ? (
          <>
            {/* Campaign Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockCampaigns.map((campaign) => {
                const StatusIcon = statusConfig[campaign.status].icon;
                return (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <CardDescription className="mt-1">{campaign.type}</CardDescription>
                        </div>
                        <Badge className={statusConfig[campaign.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[campaign.status].label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Period:</span>
                          <span>
                            {new Date(campaign.startDate).toLocaleDateString()} -{" "}
                            {new Date(campaign.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        {campaign.status === "active" && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Reach:</span>
                              <span className="font-medium">{campaign.reach.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Engagement:</span>
                              <span className="font-medium">{campaign.engagement}%</span>
                            </div>
                          </>
                        )}
                        <Button variant="outline" size="sm" className="w-full mt-4">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Marketing Analytics</CardTitle>
              <CardDescription>Campaign performance and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-400">
                Analytics dashboard placeholder - Campaign performance charts
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}