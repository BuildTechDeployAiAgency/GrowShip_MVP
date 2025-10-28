"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { HeroSection } from "@/components/landing/hero-section";
import { DemoAccessSection } from "@/components/landing/demo-access-section";
import { PlatformFeaturesSection } from "@/components/landing/platform-features-section";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";

export function LandingPage() {
  const router = useRouter();
  const { user, profile, loading, profileLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "hero" | "brand-login" | "distributor-login" | "manufacturer-login"
  >("hero");

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && !profileLoading && user) {
      // Check if profile setup is complete
      if (profile && profile.is_profile_complete) {
        router.push("/dashboard");
      } else if (profile && !profile.is_profile_complete) {
        router.push("/profile/setup");
      }
    }
  }, [user, profile, loading, profileLoading, router]);

  const handleBrandLogin = () => {
    window.location.href = "/auth/brand";
  };

  const handleDistributorLogin = () => {
    window.location.href = "/auth/distributor";
  };

  const handleManufacturerLogin = () => {
    window.location.href = "/auth/manufacturer";
  };

  const handleBackToHero = () => {
    setActiveTab("hero");
  };

  // Show loading state while checking authentication
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show loading while redirecting
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {activeTab === "hero" && (
        <HeroSection
          onBrandLogin={handleBrandLogin}
          onDistributorLogin={handleDistributorLogin}
          onManufacturerLogin={handleManufacturerLogin}
        />
      )}

      {activeTab === "hero" && (
        <>
          <DemoAccessSection
            onBrandDemo={handleBrandLogin}
            onDistributorDemo={handleDistributorLogin}
            onManufacturerDemo={handleManufacturerLogin}
          />
          <PlatformFeaturesSection />
        </>
      )}

      <Footer />
    </div>
  );
}
