"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/contexts/auth-context";
import { useRequireProfile } from "@/hooks/use-auth";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { PasswordSettings } from "@/components/settings/password-settings";
import { GeneralSettings } from "@/components/settings/general-settings";
import { ProtectedPage } from "@/components/common/protected-page";

export default function Settings() {
  const { user, profile, profileLoading, profileError } = useAuth();
  const { loading } = useRequireProfile();
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "general"
  >("profile");

  const handleAvatarChange = (newAvatarUrl: string) => {
    console.log("Avatar updated:", newAvatarUrl);
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-200 border-t-teal-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-blue-500 opacity-20 animate-pulse"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {loading ? "Loading..." : "Loading profile..."}
          </h3>
          <p className="text-gray-600">
            Please wait while we prepare your settings
          </p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Profile Loading Error
          </h2>
          <p className="text-gray-600 mb-6">{profileError}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings profile={profile} user={user} />;
      case "password":
        return <PasswordSettings />;
      case "general":
        return <GeneralSettings />;
      default:
        return <ProfileSettings profile={profile} user={user} />;
    }
  };

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Settings"
        pageSubtitle="Manage your account and preferences"
      >
        <div className="min-h-screen bg-gray-50 -m-6 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1">
                <SettingsSidebar
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  profile={profile}
                  onAvatarChange={handleAvatarChange}
                />
              </div>

              <div className="lg:col-span-3">
                <div className="space-y-6">{renderActiveTab()}</div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedPage>
  );
}
