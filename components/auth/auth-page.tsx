"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Package, Factory, ArrowLeft } from "lucide-react";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "react-toastify";
import Link from "next/link";
import { ForgotPassword } from "./forgot-password";

interface AuthPageProps {
  role: "brand" | "distributor" | "manufacturer";
}

const roleConfig = {
  brand: {
    title: "Brand Portal",
    subtitle:
      "Transform your product distribution with intelligent brand management, distributor networks, and data-driven growth insights.",
    icon: Building,
    color: "purple",
    features: [
      {
        title: "Distributor Network",
        description:
          "Manage your distribution channels, track partner performance, and optimize regional coverage.",
        icon: "👥",
      },
      {
        title: "Analytics & Insights",
        description:
          "Get real-time sales data, market trends, and actionable insights to drive growth.",
        icon: "📊",
      },
      {
        title: "Product Catalog",
        description:
          "Showcase your products with rich media, pricing tiers, and inventory management.",
        icon: "📦",
      },
      {
        title: "Automation Tools",
        description:
          "Streamline orders, automate pricing updates, and manage workflows efficiently.",
        icon: "⚡",
      },
    ],
  },
  distributor: {
    title: "Distributor Portal",
    subtitle:
      "Streamline your distribution operations with intelligent inventory management, order processing, and comprehensive logistics control.",
    icon: Package,
    color: "green",
    features: [
      {
        title: "Order Management",
        description:
          "Process orders, track shipments, and manage multi-brand fulfillment efficiently.",
        icon: "🛒",
      },
      {
        title: "Warehouse Control",
        description:
          "Monitor real-time inventory, stock levels, and optimize warehouse operations.",
        icon: "🏢",
      },
      {
        title: "Performance Analytics",
        description:
          "Track sales performance, delivery metrics, and operational efficiency.",
        icon: "📈",
      },
      {
        title: "Route Optimization",
        description:
          "Smart delivery routing, GPS tracking, and logistics optimization.",
        icon: "🗺️",
      },
    ],
  },
  manufacturer: {
    title: "Manufacturer Portal",
    subtitle:
      "Optimize your manufacturing operations with intelligent production management, quality control, and supply chain coordination.",
    icon: Factory,
    color: "blue",
    features: [
      {
        title: "Production Management",
        description:
          "Monitor production schedules, track work orders, and manage manufacturing processes.",
        icon: "🏭",
      },
      {
        title: "Quality Control",
        description:
          "Implement quality standards, track defects, and ensure product compliance.",
        icon: "✅",
      },
      {
        title: "Supply Chain",
        description:
          "Manage suppliers, track materials, and optimize procurement processes.",
        icon: "🔗",
      },
      {
        title: "Inventory Tracking",
        description:
          "Real-time inventory monitoring, stock levels, and material management.",
        icon: "📋",
      },
    ],
  },
};

export function AuthPage({ role }: AuthPageProps) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, signUp } = useEnhancedAuth();
  const router = useRouter();

  const config = roleConfig[role];
  const IconComponent = config.icon;

  // Block signup for manufacturer and distributor roles
  const isSignupBlocked = role === "manufacturer" || role === "distributor";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignIn) {
        const { error } = await signIn(email, password, role);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Successfully signed in!");
          router.push("/dashboard");
        }
      } else {
        // Block signup for manufacturer and distributor roles
        if (isSignupBlocked) {
          toast.error(
            `Sign up is not available for ${role}s. Please contact a brand admin to receive an invitation.`
          );
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, role);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success(
            "Account created! Please check your email to verify your account before proceeding."
          );
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getGradientClass = () => {
    switch (role) {
      case "brand":
        return "from-purple-500 to-blue-500";
      case "distributor":
        return "from-green-500 to-teal-500";
      case "manufacturer":
        return "from-blue-500 to-indigo-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getButtonClass = () => {
    switch (role) {
      case "brand":
        return "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600";
      case "distributor":
        return "bg-green-600 hover:bg-green-700";
      case "manufacturer":
        return "bg-blue-600 hover:bg-blue-700";
      default:
        return "bg-gray-600 hover:bg-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  GrowShip
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                ← Back to Main Page
              </Link>
              <div className="flex space-x-4">
                <Link
                  href="/#features"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Features
                </Link>
                <Link
                  href="/#about"
                  className="text-gray-600 hover:text-gray-900"
                >
                  About
                </Link>
                <Link
                  href="/#contact"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                <IconComponent className="w-10 h-10 text-purple-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {config.title}
              </h1>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                {config.subtitle}
              </p>
            </div>

            {showForgotPassword ? (
              <ForgotPassword
                role={role}
                onBack={() => setShowForgotPassword(false)}
              />
            ) : (
              <Card className="max-w-md mx-auto">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      {isSignIn ? "Welcome Back" : "Create Account"}
                    </h2>
                    <p className="text-gray-600">
                      {isSignIn ? "Access your dashboard" : "Join the platform"}
                    </p>
                  </div>

                  <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                    <button
                      type="button"
                      onClick={() => setIsSignIn(true)}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isSignIn
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => !isSignupBlocked && setIsSignIn(false)}
                      disabled={isSignupBlocked}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        !isSignIn && !isSignupBlocked
                          ? "bg-white text-gray-900 shadow-sm"
                          : isSignupBlocked
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  {isSignupBlocked && !isSignIn && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Sign up is not available for {role}s.</strong>{" "}
                        Please contact a brand admin to receive an invitation.
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Input
                        type="email"
                        placeholder={`${role}@company.com`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className={`w-full text-white ${getButtonClass()}`}
                    >
                      {loading ? "Loading..." : `Access ${config.title}`}
                    </Button>
                  </form>

                  <div className="mt-6 text-center space-y-2">
                    {isSignIn ? (
                      <>
                        <p className="text-sm text-gray-600">
                          Don't have an account?{" "}
                          <button
                            type="button"
                            onClick={() => setIsSignIn(false)}
                            className="text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Sign up
                          </button>
                        </p>
                        <p className="text-sm text-gray-600">
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            Forgot password?
                          </button>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">
                          Already have an account?{" "}
                          <button
                            type="button"
                            onClick={() => setIsSignIn(true)}
                            className="text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Sign in
                          </button>
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="order-1 lg:order-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {config.features.map((feature, index) => (
                <Card key={index} className="p-6">
                  <div className="text-center">
                    <div className="text-3xl mb-3">{feature.icon}</div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <div
              className={`bg-gradient-to-r ${getGradientClass()} rounded-lg p-8 text-white`}
            >
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Power Your Success</h3>
                <div className="flex justify-center space-x-6 mb-4">
                  <div className="text-center">
                    <div className="text-2xl mb-1">📊</div>
                    <span className="text-sm">Advanced Analytics</span>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🔒</div>
                    <span className="text-sm">Secure Access</span>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">📈</div>
                    <span className="text-sm">Growth Tracking</span>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🌍</div>
                    <span className="text-sm">Global Reach</span>
                  </div>
                </div>
                <p className="text-sm opacity-90">
                  Join thousands of {role}s growing their business with
                  intelligent insights and seamless automation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="text-xl font-bold">GrowShip</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2024 GrowShip. All rights reserved.
            </div>
          </div>
          <div className="grid grid-cols-4 gap-8 mt-8">
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div>Features</div>
                <div>Pricing</div>
                <div>Demo</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div>Documentation</div>
                <div>Help Center</div>
                <div>Contact Us</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div>Privacy Policy</div>
                <div>Terms of Service</div>
                <div>Cookie Policy</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div>LinkedIn</div>
                <div>Twitter</div>
                <div>Blog</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
