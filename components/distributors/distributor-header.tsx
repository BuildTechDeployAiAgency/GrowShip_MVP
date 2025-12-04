"use client";

import { Distributor } from "@/hooks/use-distributors";
import { Badge } from "@/components/ui/badge";

interface DistributorHeaderProps {
  distributor: Distributor;
}

export function DistributorHeader({ distributor }: DistributorHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "archived":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      {/* Distributor Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{distributor.name}</h1>
            <Badge className={getStatusColor(distributor.status)}>
              {distributor.status}
            </Badge>
          </div>
          {distributor.code && (
            <p className="text-sm text-gray-600">{distributor.code}</p>
          )}
          {(distributor.city || distributor.country) && (
            <p className="text-sm text-gray-500">
              {distributor.city && distributor.country
                ? `${distributor.city}, ${distributor.country}`
                : distributor.city || distributor.country}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
