"use client";

import { useState, useEffect } from "react";
import { CreateCampaignRequest } from "@/types/marketing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save,
  Send,
  AlertCircle
} from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateMarketingCampaign } from "@/hooks/use-marketing-campaigns";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

// Import step components (to be created)
import { CampaignBasicInfoStep } from "./campaign-steps/campaign-basic-info-step";
import { CampaignTargetingStep } from "./campaign-steps/campaign-targeting-step";
import { CampaignBudgetStep } from "./campaign-steps/campaign-budget-step";
import { CampaignPerformanceStep } from "./campaign-steps/campaign-performance-step";
import { CampaignTimelineStep } from "./campaign-steps/campaign-timeline-step";
import { CampaignReviewStep } from "./campaign-steps/campaign-review-step";

// Form validation schema
const campaignFormSchema = z.object({
  // Basic Info
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  description: z.string().optional(),
  campaignType: z.string().min(1, "Please select a campaign type"),
  channel: z.string().min(1, "Please select a marketing channel"),
  tags: z.array(z.string()).optional(),
  externalCampaignId: z.string().optional(),
  
  // Targeting
  distributorIds: z.array(z.string()).min(1, "Please select at least one distributor"),
  targetAudience: z.string().optional(),
  regionIds: z.array(z.string()).optional(),
  territoryIds: z.array(z.string()).optional(),
  countryCodes: z.array(z.string()).optional(),
  
  // Budget
  totalBudget: z.number().min(1, "Total budget must be greater than 0"),
  allocatedBudget: z.number().min(1, "Allocated budget must be greater than 0"),
  fundSource: z.string().optional(),
  brandContribution: z.number().min(0),
  distributorContribution: z.number().min(0),
  
  // Performance
  targetRoiPercentage: z.number().optional(),
  targetSalesAmount: z.number().optional(),
  targetReach: z.number().optional(),
  targetImpressions: z.number().optional(),
  targetLeads: z.number().optional(),
  
  // Timeline
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  launchDate: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

interface CampaignFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
  campaign?: any; // For editing existing campaigns
}

const FORM_STEPS = [
  { id: 'basic', title: 'Campaign Details', description: 'Basic campaign information' },
  { id: 'targeting', title: 'Targeting', description: 'Select distributors and regions' },
  { id: 'budget', title: 'Budget & Funds', description: 'Allocate campaign budget' },
  { id: 'performance', title: 'Targets & KPIs', description: 'Set performance goals' },
  { id: 'timeline', title: 'Timeline', description: 'Campaign duration and milestones' },
  { id: 'review', title: 'Review', description: 'Review and submit' },
];

export function CampaignFormDialog({ 
  open, 
  onClose, 
  onSubmit,
  campaign 
}: CampaignFormDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useAuth();
  const createCampaign = useCreateMarketingCampaign();
  
  const methods = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: campaign?.name || '',
      description: campaign?.description || '',
      campaignType: campaign?.campaignType || '',
      channel: campaign?.channel || '',
      tags: campaign?.tags || [],
      distributorIds: [],
      targetAudience: campaign?.targetAudience || '',
      totalBudget: campaign?.totalBudget || undefined,
      allocatedBudget: campaign?.allocatedBudget || undefined,
      fundSource: campaign?.fundSource || 'brand_direct',
      brandContribution: campaign?.brandContribution || undefined,
      distributorContribution: campaign?.distributorContribution || undefined,
      targetRoiPercentage: campaign?.targetRoiPercentage || undefined,
      targetSalesAmount: campaign?.targetSalesAmount || undefined,
      startDate: campaign?.startDate || '',
      endDate: campaign?.endDate || '',
    },
  });

  const { handleSubmit, trigger, formState: { errors, isValid } } = methods;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      if (!campaign) {
        methods.reset();
      }
    }
  }, [open, campaign, methods]);

  // Save draft to localStorage
  const saveDraft = () => {
    const formData = methods.getValues();
    localStorage.setItem('campaign-draft', JSON.stringify(formData));
    toast.info('Draft saved');
  };

  // Load draft from localStorage
  const loadDraft = () => {
    const draft = localStorage.getItem('campaign-draft');
    if (draft) {
      const draftData = JSON.parse(draft);
      methods.reset(draftData);
      toast.success('Draft loaded');
    }
  };

  const handleNext = async () => {
    // Validate current step fields
    let fieldsToValidate: (keyof CampaignFormData)[] = [];
    
    switch (currentStep) {
      case 0: // Basic Info
        fieldsToValidate = ['name', 'campaignType', 'channel'];
        break;
      case 1: // Targeting
        fieldsToValidate = ['distributorIds'];
        break;
      case 2: // Budget
        fieldsToValidate = ['totalBudget', 'allocatedBudget', 'brandContribution', 'distributorContribution'];
        break;
      case 3: // Performance
        // Optional fields, no required validation
        break;
      case 4: // Timeline
        fieldsToValidate = ['startDate', 'endDate'];
        break;
    }

    const isStepValid = fieldsToValidate.length === 0 || await trigger(fieldsToValidate);
    
    if (isStepValid) {
      if (currentStep < FORM_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
        saveDraft(); // Auto-save on step navigation
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSubmit = async (data: CampaignFormData) => {
    setIsSubmitting(true);
    
    try {
      // Transform form data to API format
      const campaignData: CreateCampaignRequest = {
        name: data.name,
        description: data.description,
        campaignType: data.campaignType as any,
        channel: data.channel as any,
        targetAudience: data.targetAudience,
        totalBudget: data.totalBudget || 0,
        allocatedBudget: data.allocatedBudget || 0,
        brandId: profile?.brand_id || '',
        distributorId: data.distributorIds?.[0], // TODO: Handle multiple distributors
        fundSource: data.fundSource as any,
        brandContribution: data.brandContribution || 0,
        distributorContribution: data.distributorContribution || 0,
        startDate: data.startDate,
        endDate: data.endDate,
        targetRoiPercentage: data.targetRoiPercentage,
        targetSalesAmount: data.targetSalesAmount,
        tags: data.tags,
      };

      if (onSubmit) {
        // Use custom submit handler if provided
        await onSubmit(campaignData);
      } else {
        // Use default creation
        await createCampaign.mutateAsync(campaignData);
      }
      
      // Clear draft on successful submission
      localStorage.removeItem('campaign-draft');
      onClose();
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      // Show user-friendly error message
      if (error instanceof Error) {
        toast.error(`Failed to create campaign: ${error.message}`);
      } else {
        toast.error('Failed to create campaign. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressValue = ((currentStep + 1) / FORM_STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <CampaignBasicInfoStep />;
      case 1:
        return <CampaignTargetingStep />;
      case 2:
        return <CampaignBudgetStep />;
      case 3:
        return <CampaignPerformanceStep />;
      case 4:
        return <CampaignTimelineStep />;
      case 5:
        return <CampaignReviewStep />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {campaign ? 'Edit Campaign' : 'Create New Campaign'}
          </DialogTitle>
          <DialogDescription>
            {FORM_STEPS[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Step {currentStep + 1} of {FORM_STEPS.length}</span>
            <span>{FORM_STEPS[currentStep].title}</span>
          </div>
          <Progress value={progressValue} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-2">
            {FORM_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600 text-white'
                    : index < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto">
            <div className="py-6">
              {renderStepContent()}
            </div>
          </form>
        </FormProvider>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            {currentStep === 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadDraft}
                disabled={!localStorage.getItem('campaign-draft')}
              >
                Load Draft
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={saveDraft}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < FORM_STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit(handleFormSubmit)}
                disabled={isSubmitting || !isValid}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Create Campaign
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}