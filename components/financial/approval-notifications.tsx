"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNotifications } from '@/hooks/use-notifications';
import { toast } from 'sonner';
import { Check, X, Clock, DollarSign, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalStatus } from '@/types/financial';

interface FinancialApprovalNotification {
  id: string;
  type: 'budget_approval' | 'expense_approval';
  entityId: string;
  entityName: string;
  amount: number;
  currency: string;
  requestedBy: string;
  requestedAt: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  status: ApprovalStatus;
  notes?: string;
  department?: string;
  budgetRemaining?: number;
}

interface ApprovalNotificationItemProps {
  notification: FinancialApprovalNotification;
  onApprove: (id: string, comments?: string) => void;
  onReject: (id: string, reason: string) => void;
  onView: (id: string) => void;
}

function ApprovalNotificationItem({ 
  notification, 
  onApprove, 
  onReject, 
  onView 
}: ApprovalNotificationItemProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const getIcon = () => {
    switch (notification.type) {
      case 'budget_approval':
        return <TrendingUp className="h-5 w-5" />;
      case 'expense_approval':
        return <FileText className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getUrgencyColor = () => {
    switch (notification.urgency) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-orange-600 bg-orange-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
    }
  };

  const handleApprove = () => {
    onApprove(notification.id, approvalComments);
    setShowApproveDialog(false);
    setApprovalComments('');
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(notification.id, rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    } else {
      toast.error('Please provide a reason for rejection');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className={cn("p-2 rounded-lg", getUrgencyColor())}>
            {getIcon()}
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  {notification.entityName}
                  <Badge variant="outline" className="text-xs">
                    {notification.type === 'budget_approval' ? 'Budget' : 'Expense'}
                  </Badge>
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Requested by {notification.requestedBy} • {formatDate(notification.requestedAt)}
                </p>
              </div>
              <Badge className={cn("ml-2", getUrgencyColor())}>
                {notification.urgency.toUpperCase()}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-lg">
                  {notification.currency} {notification.amount.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">Category:</span>
                <span className="font-medium">{notification.category}</span>
              </div>
              
              {notification.department && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">Department:</span>
                  <span className="font-medium">{notification.department}</span>
                </div>
              )}
              
              {notification.budgetRemaining !== undefined && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">Budget Remaining:</span>
                  <span className={cn(
                    "font-medium",
                    notification.budgetRemaining < notification.amount ? "text-red-600" : "text-green-600"
                  )}>
                    {notification.currency} {notification.budgetRemaining.toLocaleString()}
                  </span>
                </div>
              )}
              
              {notification.notes && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                  {notification.notes}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(notification.id)}
                className="text-gray-600"
              >
                View Details
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowApproveDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                className="text-red-600 hover:text-red-700 hover:border-red-300"
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {notification.type === 'budget_approval' ? 'Budget' : 'Expense'}</DialogTitle>
            <DialogDescription>
              You are about to approve {notification.entityName} for {notification.currency} {notification.amount.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approvalComments">Comments (Optional)</Label>
              <Textarea
                id="approvalComments"
                placeholder="Add any comments about this approval..."
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {notification.type === 'budget_approval' ? 'Budget' : 'Expense'}</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {notification.entityName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectReason">Rejection Reason</Label>
              <Textarea
                id="rejectReason"
                placeholder="Explain why this request is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject} 
              variant="destructive"
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface FinancialApprovalNotificationsProps {
  limit?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function FinancialApprovalNotifications({ 
  limit, 
  showViewAll = true, 
  onViewAll 
}: FinancialApprovalNotificationsProps) {
  // In a real implementation, this would fetch from the API
  const mockNotifications: FinancialApprovalNotification[] = [
    {
      id: '1',
      type: 'budget_approval',
      entityId: 'budget-1',
      entityName: 'Q4 Marketing Campaign Budget',
      amount: 45000,
      currency: '$',
      requestedBy: 'John Doe',
      requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      category: 'Marketing',
      urgency: 'high',
      status: 'pending',
      notes: 'Urgent approval needed for upcoming campaign launch',
      department: 'Marketing',
      budgetRemaining: 50000,
    },
    {
      id: '2',
      type: 'expense_approval',
      entityId: 'expense-1',
      entityName: 'Office Supplies Purchase',
      amount: 1250,
      currency: '$',
      requestedBy: 'Jane Smith',
      requestedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      category: 'Office Supplies',
      urgency: 'low',
      status: 'pending',
      department: 'Administration',
    },
  ];

  const handleApprove = async (id: string, comments?: string) => {
    try {
      // Call API to approve
      toast.success('Approval submitted successfully');
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      // Call API to reject
      toast.success('Request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleView = (id: string) => {
    // Navigate to detail view or open modal
    console.log('View details for:', id);
  };

  const notifications = limit ? mockNotifications.slice(0, limit) : mockNotifications;
  const pendingCount = mockNotifications.filter(n => n.status === 'pending').length;

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No pending approvals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Pending Approvals
            <Badge variant="secondary">{pendingCount}</Badge>
          </h3>
          {showViewAll && onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
            </Button>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {notifications.map((notification) => (
          <ApprovalNotificationItem
            key={notification.id}
            notification={notification}
            onApprove={handleApprove}
            onReject={handleReject}
            onView={handleView}
          />
        ))}
      </div>
    </div>
  );
}