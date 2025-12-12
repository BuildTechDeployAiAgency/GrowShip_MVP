"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  CalendarDays,
  Timer,
  Zap,
  Target,
  TrendingUp,
  Users,
  Info,
  PlayCircle
} from "lucide-react";

// Timeline templates for different campaign durations
const TIMELINE_TEMPLATES = [
  {
    name: 'Sprint Campaign',
    duration: 14,
    description: '2-week intensive campaign',
    icon: Zap,
    phases: [
      { name: 'Preparation', duration: 2, color: '#3B82F6' },
      { name: 'Launch', duration: 1, color: '#10B981' },
      { name: 'Active', duration: 10, color: '#F59E0B' },
      { name: 'Analysis', duration: 1, color: '#8B5CF6' },
    ]
  },
  {
    name: 'Standard Campaign',
    duration: 30,
    description: '1-month balanced campaign',
    icon: Target,
    phases: [
      { name: 'Preparation', duration: 5, color: '#3B82F6' },
      { name: 'Soft Launch', duration: 3, color: '#10B981' },
      { name: 'Full Campaign', duration: 20, color: '#F59E0B' },
      { name: 'Analysis', duration: 2, color: '#8B5CF6' },
    ]
  },
  {
    name: 'Extended Campaign',
    duration: 90,
    description: '3-month comprehensive campaign',
    icon: TrendingUp,
    phases: [
      { name: 'Preparation', duration: 10, color: '#3B82F6' },
      { name: 'Phase 1: Launch', duration: 20, color: '#10B981' },
      { name: 'Phase 2: Scale', duration: 30, color: '#F59E0B' },
      { name: 'Phase 3: Optimize', duration: 25, color: '#EF4444' },
      { name: 'Analysis', duration: 5, color: '#8B5CF6' },
    ]
  },
  {
    name: 'Always-On Campaign',
    duration: 365,
    description: '1-year continuous campaign',
    icon: Users,
    phases: [
      { name: 'Q1: Foundation', duration: 90, color: '#3B82F6' },
      { name: 'Q2: Growth', duration: 90, color: '#10B981' },
      { name: 'Q3: Peak', duration: 90, color: '#F59E0B' },
      { name: 'Q4: Optimization', duration: 95, color: '#8B5CF6' },
    ]
  },
];

// Key milestones and checkpoints
const MILESTONE_TYPES = [
  { name: 'Creative Review', icon: CheckCircle, suggested: -7 },
  { name: 'Legal Approval', icon: CheckCircle, suggested: -5 },
  { name: 'Media Booking', icon: CheckCircle, suggested: -3 },
  { name: 'Campaign Launch', icon: PlayCircle, suggested: 0 },
  { name: 'Mid-Campaign Review', icon: TrendingUp, suggested: 0.5 },
  { name: 'Performance Optimization', icon: Target, suggested: 0.75 },
  { name: 'Final Analysis', icon: CheckCircle, suggested: 1 },
];

export function CampaignTimelineStep() {
  const { control, watch, setValue, formState: { errors } } = useFormContext();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customMilestones, setCustomMilestones] = useState<any[]>([]);
  
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const launchDate = watch('launchDate');
  
  // Calculate campaign duration
  const calculateDuration = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  const duration = calculateDuration();

  // Apply timeline template
  const applyTemplate = (template: any) => {
    setSelectedTemplate(template.name);
    
    if (startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + template.duration);
      setValue('endDate', end.toISOString().split('T')[0]);
      
      // Set launch date (typically start date unless specified)
      if (!launchDate) {
        setValue('launchDate', startDate);
      }
    }
  };

  // Generate suggested milestones based on timeline
  useEffect(() => {
    if (startDate && endDate && duration > 0) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const milestones = MILESTONE_TYPES.map(milestone => {
        let milestoneDate;
        
        if (milestone.suggested < 0) {
          // Days before start
          milestoneDate = new Date(start);
          milestoneDate.setDate(milestoneDate.getDate() + milestone.suggested);
        } else if (milestone.suggested === 0) {
          // Start date
          milestoneDate = new Date(start);
        } else if (milestone.suggested < 1) {
          // Fraction through campaign
          const totalMs = end.getTime() - start.getTime();
          milestoneDate = new Date(start.getTime() + (totalMs * milestone.suggested));
        } else {
          // Days after end
          milestoneDate = new Date(end);
          milestoneDate.setDate(milestoneDate.getDate() + (milestone.suggested - 1));
        }
        
        return {
          ...milestone,
          date: milestoneDate.toISOString().split('T')[0],
        };
      });
      
      setCustomMilestones(milestones);
    }
  }, [startDate, endDate, duration]);

  // Get today's date for validation
  const today = new Date().toISOString().split('T')[0];

  // Date validation
  const isStartDateValid = !startDate || startDate >= today;
  const isEndDateValid = !endDate || !startDate || endDate > startDate;
  const isLaunchDateValid = !launchDate || !startDate || !endDate || 
    (launchDate >= startDate && launchDate <= endDate);

  return (
    <div className="space-y-6">
      {/* Timeline Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Timeline Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TIMELINE_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <div
                  key={template.name}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-opacity-70 ${
                    selectedTemplate === template.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => applyTemplate(template)}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className="h-6 w-6 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {template.duration} days
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.phases.length} phases
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Campaign Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Start Date *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={today}
                      className={!isStartDateValid ? 'border-red-500' : ''}
                    />
                  </FormControl>
                  {!isStartDateValid && (
                    <p className="text-sm text-red-600">Start date cannot be in the past</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign End Date *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={startDate || today}
                      className={!isEndDateValid ? 'border-red-500' : ''}
                    />
                  </FormControl>
                  {!isEndDateValid && startDate && (
                    <p className="text-sm text-red-600">End date must be after start date</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="launchDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public Launch Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={startDate || today}
                      max={endDate}
                      className={!isLaunchDateValid ? 'border-red-500' : ''}
                    />
                  </FormControl>
                  <FormDescription>
                    When the campaign goes live to the public (optional)
                  </FormDescription>
                  {!isLaunchDateValid && (
                    <p className="text-sm text-red-600">Launch date must be between start and end dates</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Campaign Duration Summary */}
          {duration > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{duration}</div>
                  <div className="text-sm text-blue-700">Total Days</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{Math.ceil(duration / 7)}</div>
                  <div className="text-sm text-green-700">Weeks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{Math.ceil(duration / 30.44)}</div>
                  <div className="text-sm text-purple-700">Months</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.ceil(duration / 7) * 5}
                  </div>
                  <div className="text-sm text-orange-700">Business Days</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Visualization */}
      {selectedTemplate && duration > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Campaign Timeline Visualization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Timeline Bar */}
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                {(() => {
                  const template = TIMELINE_TEMPLATES.find(t => t.name === selectedTemplate);
                  return template?.phases.map((phase, index) => {
                    const percentage = (phase.duration / duration) * 100;
                    const left = template.phases
                      .slice(0, index)
                      .reduce((sum, p) => sum + p.duration, 0) / duration * 100 || 0;
                  
                  return (
                    <div
                      key={index}
                      className="absolute top-0 h-full flex items-center justify-center text-white text-xs font-medium"
                      style={{
                        left: `${left}%`,
                        width: `${percentage}%`,
                        backgroundColor: phase.color,
                      }}
                    >
                      {percentage > 10 && phase.name}
                    </div>
                  );
                  });
                })()}
              </div>

              {/* Phase Legend */}
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const template = TIMELINE_TEMPLATES.find(t => t.name === selectedTemplate);
                  return template?.phases.map((phase, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: phase.color }}
                    />
                    <span className="text-sm text-gray-700">
                      {phase.name} ({phase.duration} days)
                    </span>
                  </div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign Milestones */}
      {customMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Suggested Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customMilestones.map((milestone, index) => {
                const Icon = milestone.icon;
                const milestoneDate = new Date(milestone.date);
                const isOverdue = milestoneDate < new Date() && milestone.date !== today;
                const isToday = milestone.date === today;
                const isUpcoming = milestoneDate > new Date();
                
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isToday 
                        ? 'border-blue-500 bg-blue-50' 
                        : isOverdue 
                        ? 'border-red-200 bg-red-50'
                        : isUpcoming
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <Icon 
                      className={`h-5 w-5 ${
                        isToday 
                          ? 'text-blue-600' 
                          : isOverdue 
                          ? 'text-red-600'
                          : isUpcoming
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`} 
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{milestone.name}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(milestone.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <Badge 
                      variant={isToday ? 'default' : isOverdue ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {isToday ? 'Today' : isOverdue ? 'Overdue' : 'Upcoming'}
                    </Badge>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Pro tip:</strong> These are suggested milestones based on your campaign timeline. 
                  Adjust dates as needed for your specific campaign requirements and team workflow.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Warnings */}
      <div className="space-y-2">
        {duration > 0 && duration < 7 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Very short campaign duration ({duration} days). Consider if this provides enough time for meaningful results.
            </span>
          </div>
        )}
        
        {duration > 365 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Extended campaign duration ({Math.ceil(duration / 30.44)} months). Consider breaking into phases for better management and optimization.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}