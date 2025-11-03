"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Package, FileCheck, Users, Clock } from "lucide-react";

interface ComingSoonPlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function ComingSoonPlaceholder({
  title,
  description,
  icon,
}: ComingSoonPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="mb-6 p-4 bg-gray-100 rounded-full">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center max-w-md mb-4">{description}</p>
      <Badge variant="outline" className="mt-2">
        <Clock className="mr-1 h-3 w-3" />
        Coming Soon
      </Badge>
    </div>
  );
}

export function PerformanceTabPlaceholder() {
  return (
    <ComingSoonPlaceholder
      title="Performance Analytics"
      description="This feature is under development and will be available soon. You'll be able to view detailed performance metrics, revenue trends, and analytics for this distributor."
      icon={<BarChart3 className="h-8 w-8 text-gray-400" />}
    />
  );
}

export function ProductsTabPlaceholder() {
  return (
    <ComingSoonPlaceholder
      title="Products"
      description="This feature is under development and will be available soon. You'll be able to view all products purchased by this distributor, track product performance, and manage inventory."
      icon={<Package className="h-8 w-8 text-gray-400" />}
    />
  );
}

export function SLATabPlaceholder() {
  return (
    <ComingSoonPlaceholder
      title="SLA Monitoring"
      description="This feature is under development and will be available soon. You'll be able to track Service Level Agreements, sales targets, compliance metrics, and performance indicators."
      icon={<FileCheck className="h-8 w-8 text-gray-400" />}
    />
  );
}

export function ContactsTabPlaceholder() {
  return (
    <ComingSoonPlaceholder
      title="Contact Management"
      description="This feature is under development and will be available soon. You'll be able to manage contacts associated with this distributor, assign roles, and maintain communication records."
      icon={<Users className="h-8 w-8 text-gray-400" />}
    />
  );
}
