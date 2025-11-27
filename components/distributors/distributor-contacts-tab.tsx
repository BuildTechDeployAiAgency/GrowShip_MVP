"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Distributor } from "@/hooks/use-distributors";
import { UserProfile } from "@/types/auth";
import { createClient } from "@/lib/supabase/client";
import { Mail, Phone, User as UserIcon, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface DistributorContactsTabProps {
  distributor: Distributor;
}

export function DistributorContactsTab({ distributor }: DistributorContactsTabProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelatedUsers() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("distributor_id", distributor.id);

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching distributor users:", error);
      } finally {
        setLoading(false);
      }
    }

    if (distributor.id) {
      fetchRelatedUsers();
    }
  }, [distributor.id]);

  return (
    <div className="space-y-6">
      {/* Primary Contact from Distributor Record */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-teal-600" />
            Primary Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-teal-100 text-teal-700">
                  {distributor.contact_name?.slice(0, 2).toUpperCase() || "CN"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-semibold text-base">{distributor.contact_name || "No contact name"}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{distributor.contact_email || "No email"}</span>
                </div>
                {distributor.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{distributor.contact_phone}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-gray-700">Address</p>
                  <p className="text-gray-600 mt-1">
                    {[
                      distributor.address_line1,
                      distributor.address_line2,
                      distributor.city,
                      distributor.state,
                      distributor.postal_code,
                      distributor.country
                    ].filter(Boolean).join(", ") || "No address provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Associated Users */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Associated Users ({users.length})</h3>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse h-32" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="p-6 text-center text-gray-500">
              No other users associated with this customer account.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {user.contact_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {user.contact_name || "Unknown"}
                      </p>
                      <p className="text-sm text-gray-500 truncate max-w-[180px]" title={user.email}>
                        {user.email}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {user.role_name?.replace("distributor_", "").replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

