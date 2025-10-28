"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Settings } from "lucide-react";
import { AvatarUpload } from "@/components/ui/avatar-upload";

interface SettingsSidebarProps {
  activeTab: "profile" | "password" | "general";
  onTabChange: (tab: "profile" | "password" | "general") => void;
  profile: any;
  onAvatarChange?: (newAvatarUrl: string) => void;
}

export function SettingsSidebar({
  activeTab,
  onTabChange,
  profile,
  onAvatarChange,
}: SettingsSidebarProps) {
  const getRoleBadgeColor = () => {
    switch (profile?.role_type) {
      case "brand":
        return "bg-purple-100 text-purple-800";
      case "distributor":
        return "bg-green-100 text-green-800";
      case "manufacturer":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const tabs = [
    {
      id: "profile" as const,
      label: "Profile",
      icon: Users,
      description: "Manage your profile information",
    },
    {
      id: "password" as const,
      label: "Security",
      icon: Shield,
      description: "Password and security settings",
    },
    {
      id: "general" as const,
      label: "Preferences",
      icon: Settings,
      description: "Notifications and privacy",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <AvatarUpload
              currentAvatar={profile?.avatar}
              userName={profile?.contact_name || "User"}
              onAvatarChange={onAvatarChange}
              size="lg"
            />

            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {profile?.contact_name || "User"}
              </h3>
              <p className="text-sm text-gray-600">
                {profile?.company_name || "Company"}
              </p>
              <Badge
                variant="secondary"
                className={`mt-2 ${getRoleBadgeColor()}`}
              >
                {profile?.role_name
                  ? (() => {
                      const words = profile.role_name
                        .split("_")
                        .map(
                          (w: string) =>
                            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                        );
                      return words.join(" ");
                    })()
                  : "User"}
              </Badge>
            </div>
          </div>

          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full text-left px-3 py-3 rounded-md text-sm font-medium transition-colors group ${
                    activeTab === tab.id
                      ? "bg-teal-100 text-teal-700 border border-teal-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center">
                    <Icon
                      className={`w-4 h-4 mr-3 ${
                        activeTab === tab.id
                          ? "text-teal-600"
                          : "text-gray-400 group-hover:text-gray-600"
                      }`}
                    />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {tab.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}
