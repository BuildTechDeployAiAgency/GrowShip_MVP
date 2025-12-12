"use client";

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle, 
  AlertTriangle,
  Edit,
  Target,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Building,
  Globe,
  Zap,
  Info,
  Eye,
  UserPlus,
  Percent,
  BarChart3,
  MapPin
} from "lucide-react";

// Campaign type and channel mappings for display
const CAMPAIGN_TYPE_LABELS: Record<string, { label: string; icon: any }> = {
  'brand_awareness': { label: 'Brand Awareness', icon: Target },
  'product_launch': { label: 'Product Launch', icon: Zap },
  'seasonal': { label: 'Seasonal Campaign', icon: Calendar },
  'promotional': { label: 'Promotional', icon: Target },
  'digital_marketing': { label: 'Digital Marketing', icon: Globe },
  'content_marketing': { label: 'Content Marketing', icon: Edit },
  'social_media': { label: 'Social Media', icon: Users },
  'email_marketing': { label: 'Email Marketing', icon: Edit },
};

const CHANNEL_LABELS: Record<string, { label: string; icon: any }> = {
  'digital': { label: 'Digital', icon: Globe },
  'social_media': { label: 'Social Media', icon: Users },
  'email': { label: 'Email', icon: Edit },
  'print': { label: 'Print', icon: Edit },
  'radio': { label: 'Radio', icon: Edit },
  'tv': { label: 'Television', icon: Edit },
  'outdoor': { label: 'Outdoor', icon: MapPin },
  'events': { label: 'Events', icon: Calendar },
};

const FUND_SOURCE_LABELS: Record<string, string> = {
  'brand_direct': 'Brand Direct',
  'mdf': 'Market Development Fund',
  'coop': 'Co-op Marketing',
  'distributor_self': 'Distributor Self-Funded',
  'shared': 'Shared Investment',
};

interface ReviewSectionProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  isValid: boolean;
  onEdit: () => void;
}

function ReviewSection({ title, icon: Icon, children, isValid, onEdit }: ReviewSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
            {isValid ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

export function CampaignReviewStep() {
  const { watch, formState: { errors } } = useFormContext();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Watch all form values
  const formData = watch();
  
  // Validation status for each section
  const validationStatus = {
    basic: !errors.name && !errors.campaignType && !errors.channel && formData.name && formData.campaignType && formData.channel,
    targeting: !errors.distributorIds && formData.distributorIds?.length > 0,
    budget: !errors.totalBudget && !errors.allocatedBudget && formData.totalBudget > 0 && formData.allocatedBudget > 0,
    performance: true, // Performance targets are optional
    timeline: !errors.startDate && !errors.endDate && formData.startDate && formData.endDate,
  };

  const allValid = Object.values(validationStatus).every(Boolean);

  // Calculate totals and metrics
  const totalContribution = (formData.brandContribution || 0) + (formData.distributorContribution || 0);
  const campaignDuration = formData.startDate && formData.endDate 
    ? Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const projectedROI = formData.totalBudget && formData.targetRoiPercentage 
    ? formData.totalBudget * (formData.targetRoiPercentage / 100)
    : 0;

  const costPerLead = formData.totalBudget && formData.targetLeads 
    ? formData.totalBudget / formData.targetLeads
    : 0;

  const handleEditSection = (step: number) => {
    setCurrentStep(step);
    // This would trigger navigation back to the specific step
    // Implementation would depend on parent component
  };

  return (
    <div className="space-y-6">
      {/* Campaign Overview */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Eye className="h-6 w-6 text-blue-600" />
            Campaign Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                ${(formData.totalBudget || 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Total Budget</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {campaignDuration}
              </div>
              <div className="text-sm text-green-700">Days</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {(formData.distributorIds || []).length}
              </div>
              <div className="text-sm text-purple-700">Distributors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <ReviewSection
        title="Campaign Details"
        icon={Target}
        isValid={validationStatus.basic}
        onEdit={() => handleEditSection(0)}
      >
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-900">{formData.name || 'Untitled Campaign'}</h3>
            {formData.description && (
              <p className="text-sm text-gray-600 mt-1">{formData.description}</p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {formData.campaignType && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {CAMPAIGN_TYPE_LABELS[formData.campaignType]?.icon && 
                  React.createElement(CAMPAIGN_TYPE_LABELS[formData.campaignType].icon, { className: "h-3 w-3" })
                }
                {CAMPAIGN_TYPE_LABELS[formData.campaignType]?.label || formData.campaignType}
              </Badge>
            )}
            {formData.channel && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {CHANNEL_LABELS[formData.channel]?.icon && 
                  React.createElement(CHANNEL_LABELS[formData.channel].icon, { className: "h-3 w-3" })
                }
                {CHANNEL_LABELS[formData.channel]?.label || formData.channel}
              </Badge>
            )}
            {formData.tags?.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {formData.externalCampaignId && (
            <div className="text-sm">
              <span className="font-medium">External ID:</span> {formData.externalCampaignId}
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Targeting */}
      <ReviewSection
        title="Targeting & Audience"
        icon={Users}
        isValid={validationStatus.targeting}
        onEdit={() => handleEditSection(1)}
      >
        <div className="space-y-3">
          {formData.targetAudience && (
            <div>
              <span className="font-medium">Target Audience:</span>
              <p className="text-sm text-gray-600 mt-1">{formData.targetAudience}</p>
            </div>
          )}
          
          <div>
            <span className="font-medium">Selected Distributors:</span>
            <div className="text-sm text-gray-600 mt-1">
              {(formData.distributorIds || []).length > 0 
                ? `${formData.distributorIds.length} distributors selected`
                : 'No distributors selected'
              }
            </div>
          </div>

          {(formData.regionIds?.length > 0 || formData.territoryIds?.length > 0) && (
            <div>
              <span className="font-medium">Geographic Filters:</span>
              <div className="flex gap-2 mt-1">
                {formData.regionIds?.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {formData.regionIds.length} regions
                  </Badge>
                )}
                {formData.territoryIds?.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {formData.territoryIds.length} territories
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Budget & Funding */}
      <ReviewSection
        title="Budget & Funding"
        icon={DollarSign}
        isValid={validationStatus.budget}
        onEdit={() => handleEditSection(2)}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="font-medium text-gray-900">
                ${(formData.totalBudget || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Total Budget</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">
                ${(formData.allocatedBudget || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Allocated</div>
            </div>
            <div>
              <div className="font-medium text-blue-600">
                ${(formData.brandContribution || 0).toLocaleString()}
              </div>
              <div className="text-xs text-blue-600">Brand</div>
            </div>
            <div>
              <div className="font-medium text-green-600">
                ${(formData.distributorContribution || 0).toLocaleString()}
              </div>
              <div className="text-xs text-green-600">Distributor</div>
            </div>
          </div>

          {formData.fundSource && (
            <div>
              <span className="font-medium">Fund Source:</span>
              <span className="ml-2 text-sm text-gray-600">
                {FUND_SOURCE_LABELS[formData.fundSource] || formData.fundSource}
              </span>
            </div>
          )}

          {totalContribution !== formData.totalBudget && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Contribution total (${totalContribution.toLocaleString()}) doesn't match budget
              </span>
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Performance Targets */}
      <ReviewSection
        title="Performance Targets"
        icon={BarChart3}
        isValid={validationStatus.performance}
        onEdit={() => handleEditSection(3)}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {formData.targetRoiPercentage > 0 && (
            <div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium">{formData.targetRoiPercentage}%</span>
              </div>
              <div className="text-xs text-gray-600">Target ROI</div>
            </div>
          )}
          
          {formData.targetSalesAmount > 0 && (
            <div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="font-medium">${formData.targetSalesAmount.toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-600">Target Sales</div>
            </div>
          )}
          
          {formData.targetReach > 0 && (
            <div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="font-medium">{formData.targetReach.toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-600">Target Reach</div>
            </div>
          )}
          
          {formData.targetImpressions > 0 && (
            <div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4 text-orange-600" />
                <span className="font-medium">{formData.targetImpressions.toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-600">Impressions</div>
            </div>
          )}
          
          {formData.targetLeads > 0 && (
            <div>
              <div className="flex items-center gap-1">
                <UserPlus className="h-4 w-4 text-red-600" />
                <span className="font-medium">{formData.targetLeads.toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-600">Target Leads</div>
            </div>
          )}
        </div>

        {/* Performance Projections */}
        {(projectedROI > 0 || costPerLead > 0) && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">Projected Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {projectedROI > 0 && (
                <div>
                  <span className="text-gray-600">Projected Revenue:</span>
                  <div className="font-medium">${projectedROI.toLocaleString()}</div>
                </div>
              )}
              {costPerLead > 0 && (
                <div>
                  <span className="text-gray-600">Cost per Lead:</span>
                  <div className="font-medium">${costPerLead.toFixed(2)}</div>
                </div>
              )}
              {campaignDuration > 0 && formData.totalBudget > 0 && (
                <div>
                  <span className="text-gray-600">Daily Spend:</span>
                  <div className="font-medium">${(formData.totalBudget / campaignDuration).toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </ReviewSection>

      {/* Timeline */}
      <ReviewSection
        title="Campaign Timeline"
        icon={Calendar}
        isValid={validationStatus.timeline}
        onEdit={() => handleEditSection(4)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formData.startDate && (
            <div>
              <span className="font-medium">Start Date:</span>
              <div className="text-sm text-gray-600 mt-1">
                {new Date(formData.startDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}
          
          {formData.endDate && (
            <div>
              <span className="font-medium">End Date:</span>
              <div className="text-sm text-gray-600 mt-1">
                {new Date(formData.endDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}
          
          {formData.launchDate && (
            <div>
              <span className="font-medium">Launch Date:</span>
              <div className="text-sm text-gray-600 mt-1">
                {new Date(formData.launchDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}
        </div>

        {campaignDuration > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="font-medium text-gray-900">{campaignDuration}</div>
                <div className="text-xs text-gray-600">Total Days</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{Math.ceil(campaignDuration / 7)}</div>
                <div className="text-xs text-gray-600">Weeks</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{Math.ceil(campaignDuration / 30.44)}</div>
                <div className="text-xs text-gray-600">Months</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{Math.ceil(campaignDuration / 7) * 5}</div>
                <div className="text-xs text-gray-600">Business Days</div>
              </div>
            </div>
          </div>
        )}
      </ReviewSection>

      {/* Validation Summary */}
      {!allValid && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Validation Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!validationStatus.basic && (
                <div className="text-sm text-amber-800">• Complete basic campaign information</div>
              )}
              {!validationStatus.targeting && (
                <div className="text-sm text-amber-800">• Select at least one distributor</div>
              )}
              {!validationStatus.budget && (
                <div className="text-sm text-amber-800">• Set valid budget amounts</div>
              )}
              {!validationStatus.timeline && (
                <div className="text-sm text-amber-800">• Provide valid start and end dates</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terms and Confirmation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Terms and Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-2">
            <Checkbox 
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the terms and conditions
              </label>
              <p className="text-xs text-muted-foreground">
                I confirm that all campaign details are accurate and I have authorization to create this marketing campaign
                with the specified budget allocation.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Next Steps:</strong> After creation, your campaign will be in 'draft' status. 
                You can add expenses, track performance, and submit for approval when ready.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}