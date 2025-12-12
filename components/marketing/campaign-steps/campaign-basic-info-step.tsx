"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  Target, 
  Megaphone, 
  Monitor, 
  Mail,
  Radio,
  Tv,
  MapPin,
  Users,
  Calendar,
  Zap,
  X
} from "lucide-react";
import { useState } from "react";

// Campaign type and channel definitions with icons
const CAMPAIGN_TYPES = [
  {
    value: 'brand_awareness',
    label: 'Brand Awareness',
    description: 'Increase brand visibility and recognition',
    icon: Target,
  },
  {
    value: 'product_launch',
    label: 'Product Launch',
    description: 'Introduce new products to the market',
    icon: Zap,
  },
  {
    value: 'seasonal',
    label: 'Seasonal Campaign',
    description: 'Holiday or seasonal promotions',
    icon: Calendar,
  },
  {
    value: 'promotional',
    label: 'Promotional',
    description: 'Sales promotions and discounts',
    icon: Target,
  },
  {
    value: 'digital_marketing',
    label: 'Digital Marketing',
    description: 'Online marketing initiatives',
    icon: Monitor,
  },
  {
    value: 'content_marketing',
    label: 'Content Marketing',
    description: 'Educational and engaging content',
    icon: Mail,
  },
  {
    value: 'social_media',
    label: 'Social Media',
    description: 'Social platform campaigns',
    icon: Users,
  },
  {
    value: 'email_marketing',
    label: 'Email Marketing',
    description: 'Direct email campaigns',
    icon: Mail,
  },
];

const MARKETING_CHANNELS = [
  {
    value: 'digital',
    label: 'Digital',
    description: 'Online advertising and marketing',
    icon: Monitor,
  },
  {
    value: 'social_media',
    label: 'Social Media',
    description: 'Facebook, Instagram, LinkedIn, Twitter',
    icon: Users,
  },
  {
    value: 'email',
    label: 'Email',
    description: 'Email newsletters and campaigns',
    icon: Mail,
  },
  {
    value: 'print',
    label: 'Print',
    description: 'Newspapers, magazines, brochures',
    icon: Megaphone,
  },
  {
    value: 'radio',
    label: 'Radio',
    description: 'Radio advertising and sponsorships',
    icon: Radio,
  },
  {
    value: 'tv',
    label: 'Television',
    description: 'TV commercials and sponsorships',
    icon: Tv,
  },
  {
    value: 'outdoor',
    label: 'Outdoor',
    description: 'Billboards, transit, outdoor displays',
    icon: MapPin,
  },
  {
    value: 'events',
    label: 'Events',
    description: 'Trade shows, conferences, sponsorships',
    icon: Calendar,
  },
];

export function CampaignBasicInfoStep() {
  const { control, watch, setValue, formState: { errors } } = useFormContext();
  const [selectedTags, setSelectedTags] = useState<string[]>(watch('tags') || []);
  const [tagInput, setTagInput] = useState('');

  const selectedCampaignType = watch('campaignType');
  const selectedChannel = watch('channel');

  const addTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      const newTags = [...selectedTags, tagInput.trim()];
      setSelectedTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newTags);
    setValue('tags', newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Name and Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaign Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter campaign name..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="externalCampaignId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External Campaign ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional external tracking ID"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Link to external platforms (Google Ads, Facebook, etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your campaign goals and strategy..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide a detailed description of your campaign objectives and approach
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Campaign Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Type *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAMPAIGN_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-200 ${selectedCampaignType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                  onClick={() => setValue('campaignType', type.value)}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className="h-6 w-6 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{type.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {errors.campaignType && (
            <p className="text-sm text-red-600 mt-2">Please select a campaign type</p>
          )}
        </CardContent>
      </Card>

      {/* Marketing Channel Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Channel *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MARKETING_CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-green-200 ${selectedChannel === channel.value ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                  onClick={() => setValue('channel', channel.value)}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className="h-6 w-6 text-green-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{channel.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {errors.channel && (
            <p className="text-sm text-red-600 mt-2">Please select a marketing channel</p>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Add tags for categorization..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTag}
              disabled={!tagInput.trim() || selectedTags.includes(tagInput.trim())}
            >
              Add Tag
            </Button>
          </div>
          
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-500"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
          
          <FormDescription>
            Add tags to help categorize and filter campaigns (e.g., "Q1 2024", "Holiday", "B2B")
          </FormDescription>
        </CardContent>
      </Card>
    </div>
  );
}