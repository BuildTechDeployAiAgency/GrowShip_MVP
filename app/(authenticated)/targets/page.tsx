"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { TargetsList } from "@/components/targets/targets-list";
import { TargetFormDialog } from "@/components/targets/target-form-dialog";
import { TargetUploadDialog } from "@/components/targets/target-upload-dialog";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TargetsPage() {
  const { user, profile, loading } = useRequireProfile();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  if (loading) {
    return (
      <MainLayout pageTitle="Sales Targets" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <EnhancedAuthProvider>
      <ProtectedPage allowedStatuses={["approved"]}>
        <MainLayout
          pageTitle="Sales Targets"
          pageSubtitle="Manage sales targets and track performance"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import Targets
              </Button>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Target
              </Button>
            </div>
          }
        >
          <TargetsList />
          <TargetFormDialog
            open={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            target={null}
            onSuccess={() => setIsFormOpen(false)}
          />
          <TargetUploadDialog
            open={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            onSuccess={() => {
              setIsUploadOpen(false);
              // Refresh targets list
              window.location.reload();
            }}
          />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}


