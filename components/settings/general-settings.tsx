"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Settings, Bell, Shield, Download, Trash2 } from "lucide-react";

interface NotificationSettings {
  emailNotifications: boolean;
  marketingCommunications: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
}

interface PrivacySettings {
  profileVisibility: boolean;
  dataSharing: boolean;
  analyticsTracking: boolean;
}

export function GeneralSettings() {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    marketingCommunications: false,
    securityAlerts: true,
    productUpdates: true,
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: true,
    dataSharing: false,
    analyticsTracking: true,
  });

  const handleNotificationChange = (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: value,
    }));
    toast.success(`${key.replace(/([A-Z])/g, " $1").toLowerCase()} updated`);
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: boolean) => {
    setPrivacy((prev) => ({
      ...prev,
      [key]: value,
    }));
    toast.success(`${key.replace(/([A-Z])/g, " $1").toLowerCase()} updated`);
  };

  const handleExportData = () => {
    toast.info("Data export initiated. You'll receive an email when ready.");
  };

  const handleDeleteAccount = () => {
    toast.error(
      "Account deletion requires additional verification. Please contact support."
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-500">
                    Receive updates about your account and platform changes
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("emailNotifications", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="marketing-communications"
                    className="text-base"
                  >
                    Marketing Communications
                  </Label>
                  <p className="text-sm text-gray-500">
                    Receive promotional emails and product updates
                  </p>
                </div>
                <Switch
                  id="marketing-communications"
                  checked={notifications.marketingCommunications}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("marketingCommunications", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="security-alerts"
                    className="text-base font-semibold text-gray-900"
                  >
                    Security Alerts
                  </Label>
                  <p className="text-sm text-gray-600">
                    Get notified about important security events
                  </p>
                </div>
                <Switch
                  id="security-alerts"
                  checked={notifications.securityAlerts}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("securityAlerts", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="product-updates"
                    className="text-base font-semibold text-gray-900"
                  >
                    Product Updates
                  </Label>
                  <p className="text-sm text-gray-600">
                    Stay informed about new features and improvements
                  </p>
                </div>
                <Switch
                  id="product-updates"
                  checked={notifications.productUpdates}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("productUpdates", checked)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profile-visibility" className="text-base">
                    Profile Visibility
                  </Label>
                  <p className="text-sm text-gray-500">
                    Allow other users to find your profile
                  </p>
                </div>
                <Switch
                  id="profile-visibility"
                  checked={privacy.profileVisibility}
                  onCheckedChange={(checked) =>
                    handlePrivacyChange("profileVisibility", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="data-sharing" className="text-base">
                    Data Sharing
                  </Label>
                  <p className="text-sm text-gray-500">
                    Share anonymized data to help improve our services
                  </p>
                </div>
                <Switch
                  id="data-sharing"
                  checked={privacy.dataSharing}
                  onCheckedChange={(checked) =>
                    handlePrivacyChange("dataSharing", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics-tracking" className="text-base">
                    Analytics Tracking
                  </Label>
                  <p className="text-sm text-gray-500">
                    Help us understand how you use our platform
                  </p>
                </div>
                <Switch
                  id="analytics-tracking"
                  checked={privacy.analyticsTracking}
                  onCheckedChange={(checked) =>
                    handlePrivacyChange("analyticsTracking", checked)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">
                  Export Your Data
                </h3>
                <p className="text-sm text-gray-600">
                  Download a copy of all your data
                </p>
              </div>
              <Button
                onClick={handleExportData}
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-red-800">
                  Delete Account
                </h3>
                <p className="text-sm text-red-600">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                className="bg-red-500 hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
