"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  BarChart3,
  DollarSign,
  Layers,
  Zap,
  TrendingUp,
} from "lucide-react";

export function PlatformFeaturesSection() {
  const mainFeatures = [
    {
      icon: CheckCircle,
      title: "Order Management",
      description:
        "Track orders, manage shipments, and monitor delivery status in real-time across all channels.",
      color: "text-green-500",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reporting",
      description:
        "Comprehensive analytics for sales performance, demand forecasting, and financial tracking.",
      color: "text-teal-500",
    },
    {
      icon: DollarSign,
      title: "Financial Management",
      description:
        "Manage payments, track margins, and handle invoice reconciliation seamlessly.",
      color: "text-blue-500",
    },
  ];

  return (
    <section id="features" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Platform Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to manage your distribution network and drive
            growth
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mainFeatures.map((feature, index) => (
            <Card key={index} className="text-center h-full">
              <CardHeader>
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <feature.icon className={`w-10 h-10 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
