"use client";

import { useState } from "react";
import { CampaignFormProps } from "@/types/marketing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";

interface CampaignFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export function CampaignFormDialog({ 
  open, 
  onClose, 
  onSubmit 
}: CampaignFormDialogProps) {
  
  // Placeholder component - will be implemented with full campaign form
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Campaign Form - Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Settings className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Campaign Creation Form
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                A comprehensive form for creating and managing marketing campaigns 
                with budget allocation, targeting, and ROI tracking will be available here.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <Badge variant="outline">Campaign Details</Badge>
                <Badge variant="outline">Budget Management</Badge>
                <Badge variant="outline">Target Audience</Badge>
                <Badge variant="outline">ROI Goals</Badge>
                <Badge variant="outline">Fund Allocation</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}