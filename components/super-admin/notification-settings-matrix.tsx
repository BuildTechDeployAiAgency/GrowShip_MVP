"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Bell, 
  Mail, 
  Clock,
  Check,
  X,
  Loader2,
  RefreshCw,
  Info,
  ShoppingCart,
  Package,
  CreditCard,
  Truck,
  Calendar,
  ClipboardCheck,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

// Types
interface NotificationType {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  default_priority: string;
  default_action_required: boolean;
  supported_roles: string[];
  is_active: boolean;
}

interface RoleSetting {
  role: string;
  setting_id: string | null;
  is_enabled: boolean;
  frequency: string;
  channels: string[];
  updated_at: string | null;
}

interface NotificationWithSettings extends NotificationType {
  role_settings: RoleSetting[];
}

interface SettingsMatrix {
  matrix: NotificationWithSettings[];
  byCategory: Record<string, NotificationWithSettings[]>;
  availableRoles: string[];
  totalTypes: number;
}

// Role display names
const ROLE_LABELS: Record<string, string> = {
  brand_admin: "Brand Admin",
  brand_manager: "Brand Manager",
  brand_logistics: "Brand Logistics",
  brand_reviewer: "Brand Reviewer",
  distributor_admin: "Distributor Admin",
  super_admin: "Super Admin",
};

// Category icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  purchase_order: <ShoppingCart className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  shipment: <Truck className="h-4 w-4" />,
  order: <ClipboardCheck className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  compliance: <AlertTriangle className="h-4 w-4" />,
  system: <Bell className="h-4 w-4" />,
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  purchase_order: "Purchase Orders",
  inventory: "Inventory Management",
  payment: "Payments & Invoices",
  shipment: "Shipments",
  order: "Orders",
  calendar: "Calendar Events",
  compliance: "Compliance",
  system: "System",
};

// Frequency options
const FREQUENCY_OPTIONS = [
  { value: "instant", label: "Instant" },
  { value: "hourly_digest", label: "Hourly Digest" },
  { value: "daily_digest", label: "Daily Digest" },
  { value: "weekly_digest", label: "Weekly Digest" },
];

export function NotificationSettingsMatrix() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [settingsData, setSettingsData] = useState<SettingsMatrix | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const supabase = createClient();

  // Load settings data
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/notifications/settings");
      
      if (!response.ok) {
        throw new Error("Failed to load settings");
      }
      
      const data = await response.json();
      setSettingsData(data);
      
      // Expand all categories by default
      if (data.byCategory) {
        setExpandedCategories(Object.keys(data.byCategory));
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
      toast.error("Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Update a single setting
  const updateSetting = async (
    notificationTypeId: string,
    role: string,
    updates: { is_enabled?: boolean; frequency?: string; channels?: string[] }
  ) => {
    const settingKey = `${notificationTypeId}_${role}`;
    setSaving(settingKey);
    
    try {
      const response = await fetch("/api/admin/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_type_id: notificationTypeId,
          role,
          ...updates,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update setting");
      }
      
      // Update local state
      setSettingsData((prev) => {
        if (!prev) return prev;
        
        const updated = { ...prev };
        updated.matrix = updated.matrix.map((type) => {
          if (type.id === notificationTypeId) {
            return {
              ...type,
              role_settings: type.role_settings.map((rs) => {
                if (rs.role === role) {
                  return { ...rs, ...updates, updated_at: new Date().toISOString() };
                }
                return rs;
              }),
            };
          }
          return type;
        });
        
        // Update byCategory as well
        Object.keys(updated.byCategory).forEach((cat) => {
          updated.byCategory[cat] = updated.byCategory[cat].map((type) => {
            if (type.id === notificationTypeId) {
              return {
                ...type,
                role_settings: type.role_settings.map((rs) => {
                  if (rs.role === role) {
                    return { ...rs, ...updates, updated_at: new Date().toISOString() };
                  }
                  return rs;
                }),
              };
            }
            return type;
          });
        });
        
        return updated;
      });
      
      toast.success("Setting updated");
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setSaving(null);
    }
  };

  // Toggle enabled status
  const toggleEnabled = (notificationTypeId: string, role: string, currentValue: boolean) => {
    updateSetting(notificationTypeId, role, { is_enabled: !currentValue });
  };

  // Change frequency
  const changeFrequency = (notificationTypeId: string, role: string, frequency: string) => {
    updateSetting(notificationTypeId, role, { frequency });
  };

  // Render priority badge
  const renderPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-green-100 text-green-700",
    };
    return (
      <Badge className={colors[priority] || "bg-gray-100 text-gray-700"}>
        {priority}
      </Badge>
    );
  };

  // Render role setting row
  const renderRoleSettingRow = (
    notification: NotificationWithSettings,
    roleSetting: RoleSetting
  ) => {
    const settingKey = `${notification.id}_${roleSetting.role}`;
    const isSaving = saving === settingKey;
    
    return (
      <TableRow key={settingKey} className="hover:bg-gray-50">
        <TableCell className="font-medium">
          {ROLE_LABELS[roleSetting.role] || roleSetting.role}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Switch
              checked={roleSetting.is_enabled}
              onCheckedChange={() => 
                toggleEnabled(notification.id, roleSetting.role, roleSetting.is_enabled)
              }
              disabled={isSaving}
            />
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
        </TableCell>
        <TableCell>
          <Select
            value={roleSetting.frequency}
            onValueChange={(value) => 
              changeFrequency(notification.id, roleSetting.role, value)
            }
            disabled={!roleSetting.is_enabled || isSaving}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              roleSetting.channels?.includes("in_app") 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-500"
            }`}>
              <Bell className="h-3 w-3" />
              In-App
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              roleSetting.channels?.includes("email") 
                ? "bg-purple-100 text-purple-700" 
                : "bg-gray-100 text-gray-500"
            }`}>
              <Mail className="h-3 w-3" />
              Email
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading notification settings...</p>
        </div>
      </div>
    );
  }

  if (!settingsData) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-600">Failed to load notification settings</p>
            <Button onClick={loadSettings} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{settingsData.totalTypes}</p>
                <p className="text-sm text-gray-500">Notification Types</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {settingsData.matrix.reduce((acc, type) => 
                    acc + type.role_settings.filter(rs => rs.is_enabled).length, 0
                  )}
                </p>
                <p className="text-sm text-gray-500">Enabled Settings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.keys(settingsData.byCategory).length}
                </p>
                <p className="text-sm text-gray-500">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">How Notification Settings Work</p>
              <p className="text-sm text-blue-700 mt-1">
                Configure which roles receive each notification type. Disabled notifications will not be sent 
                to users with that role. Frequency determines whether notifications are sent instantly or 
                aggregated into digests.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings by Category */}
      <Accordion 
        type="multiple" 
        value={expandedCategories}
        onValueChange={setExpandedCategories}
        className="space-y-4"
      >
        {Object.entries(settingsData.byCategory).map(([category, notifications]) => (
          <AccordionItem 
            key={category} 
            value={category}
            className="border rounded-lg bg-white shadow-sm"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {CATEGORY_ICONS[category] || <Bell className="h-4 w-4" />}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">
                    {CATEGORY_LABELS[category] || category}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {notifications.length} notification type{notifications.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-6">
                {notifications.map((notification) => (
                  <Card key={notification.id} className="border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{notification.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {notification.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderPriorityBadge(notification.default_priority)}
                          {notification.default_action_required && (
                            <Badge variant="outline" className="border-orange-300 text-orange-600">
                              Action Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-48">Role</TableHead>
                            <TableHead className="w-24">Enabled</TableHead>
                            <TableHead className="w-40">Frequency</TableHead>
                            <TableHead>Channels</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notification.role_settings.map((roleSetting) =>
                            renderRoleSettingRow(notification, roleSetting)
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={loadSettings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh Settings
        </Button>
      </div>
    </div>
  );
}
