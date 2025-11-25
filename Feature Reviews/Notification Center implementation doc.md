# Notification Center Implementation Documentation

**Date:** November 24, 2025  
**Version:** 1.0  
**Status:** Completed

---

## Table of Contents

1. [Overview](#overview)
2. [Data Model](#data-model)
3. [Notification Types](#notification-types)
4. [Architecture](#architecture)
5. [Backend Services](#backend-services)
6. [Frontend Components](#frontend-components)
7. [Real-time Updates](#real-time-updates)
8. [Integration Points](#integration-points)
9. [Permissions & Security](#permissions--security)
10. [Usage Examples](#usage-examples)
11. [Future Enhancements](#future-enhancements)

---

## Overview

The Notification Center is a comprehensive real-time alert system that keeps users informed about critical events across the GrowShip platform. It provides:

- **Real-time notifications** via Supabase Realtime subscriptions
- **Priority-based alerts** (Low, Medium, High, Urgent)
- **Multi-channel support** (In-app notifications with extensibility for email/SMS)
- **User preferences** for notification customization
- **Automated background checks** via cron jobs
- **Integration** with Purchase Orders, Inventory, Payments, Calendar, and more

---

## Data Model

### Notifications Table

**Table:** `notifications`

| Column                  | Type                | Description                                    |
|-------------------------|---------------------|------------------------------------------------|
| `id`                    | uuid (PK)           | Unique notification ID                         |
| `user_id`               | uuid (FK)           | User who receives the notification             |
| `type`                  | varchar             | Notification type (order, payment, warning, etc.) |
| `title`                 | varchar             | Notification title                             |
| `message`               | text                | Notification message                           |
| `brand_id`              | uuid (FK, nullable) | Related brand                                  |
| `related_entity_type`   | varchar (nullable)  | Entity type (po, order, invoice, etc.)         |
| `related_entity_id`     | uuid (nullable)     | Related entity ID                              |
| `priority`              | enum                | Low, Medium, High, Urgent                      |
| `action_required`       | boolean             | Whether action is required                     |
| `action_url`            | text (nullable)     | URL to navigate when clicked                   |
| `expires_at`            | timestamptz (nullable) | When the notification expires              |
| `is_read`               | boolean             | Read status                                    |
| `created_at`            | timestamptz         | Creation timestamp                             |

**Indexes:**
- `idx_notifications_user_id` on `user_id`
- `idx_notifications_related_entity` on `(related_entity_type, related_entity_id)`
- `idx_notifications_priority` on `priority`
- `idx_notifications_is_read` on `is_read`

### Notification Preferences Table

**Table:** `notification_preferences`

| Column              | Type                | Description                          |
|---------------------|---------------------|--------------------------------------|
| `id`                | uuid (PK)           | Unique preference ID                 |
| `user_id`           | uuid (FK)           | User who owns the preference         |
| `notification_type` | varchar             | Type of notification                 |
| `email_enabled`     | boolean             | Email notifications enabled          |
| `in_app_enabled`    | boolean             | In-app notifications enabled         |
| `frequency`         | enum                | immediate, daily_digest, weekly_digest |
| `created_at`        | timestamptz         | Creation timestamp                   |
| `updated_at`        | timestamptz         | Last update timestamp                |

**Constraints:**
- Unique constraint on `(user_id, notification_type)`

---

## Notification Types

### Core Types

| Type       | Description                                      | Priority Default | Action Required |
|------------|--------------------------------------------------|------------------|-----------------|
| `order`    | Purchase order and order notifications           | Medium           | Yes             |
| `payment`  | Invoice and payment reminders                    | High             | Yes             |
| `shipment` | Shipment tracking and delivery updates           | Medium           | No              |
| `warning`  | Inventory alerts, compliance warnings            | High             | Yes             |
| `info`     | General information and updates                  | Low              | No              |
| `success`  | Successful operations                            | Low              | No              |
| `error`    | Error notifications                              | High             | Yes             |

### Related Entity Types

- `po` - Purchase Order
- `order` - Order
- `invoice` - Invoice
- `inventory` - Inventory/Product
- `shipment` - Shipment
- `calendar_event` - Calendar Event

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Event Triggers                         │
├─────────────────────────────────────────────────────────────┤
│  • PO Created/Approved/Rejected                             │
│  • Order Status Changed                                     │
│  • Inventory Threshold Crossed                              │
│  • Invoice Due Soon                                         │
│  • Calendar Event Reminder                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Notification Service Layer                       │
├─────────────────────────────────────────────────────────────┤
│  • lib/notifications/alert-generator.ts                     │
│  • lib/notifications/po-alerts.ts                           │
│  • lib/notifications/inventory-alerts.ts                    │
│  • lib/notifications/payment-alerts.ts                      │
│  • Check User Preferences                                   │
│  • Create Notification Records                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                             │
├─────────────────────────────────────────────────────────────┤
│  • Insert into notifications table                          │
│  • Trigger Realtime event                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│               Supabase Realtime                             │
├─────────────────────────────────────────────────────────────┤
│  • Broadcast INSERT event                                   │
│  • Filter by user_id                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend Listeners                             │
├─────────────────────────────────────────────────────────────┤
│  • hooks/use-notifications.ts (data updates)                │
│  • components/notifications/notification-listener.tsx       │
│    (toast alerts)                                           │
│  • Update UI components                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Services

### 1. Alert Generator (`lib/notifications/alert-generator.ts`)

Core service for creating notifications with preference checking.

**Key Functions:**

#### `createNotification(alert: AlertData)`
Creates a notification for a specific user.
- Checks user preferences before creating
- Returns early if user has disabled notifications
- Inserts into database

#### `createNotificationsForBrand(alert, brandId)`
Creates notifications for all active users in a brand.
- Fetches all approved users for the brand
- Filters based on notification preferences
- Batch inserts notifications

#### `checkNotificationPreference(supabase, userId, notificationType)`
Helper function to check if user wants a specific notification type.
- Returns `true` by default if no preference is set
- Respects `in_app_enabled` setting

### 2. PO Alerts (`lib/notifications/po-alerts.ts`)

Handles Purchase Order related notifications.

**Functions:**

- `createPOCreatedAlert()` - Notifies reviewers when new PO is created
- `createPOApprovalAlert()` - Notifies when PO requires approval
- `createPOStatusChangeAlert()` - Notifies on approval/rejection

### 3. Inventory Alerts (`lib/notifications/inventory-alerts.ts`)

Monitors inventory levels and creates alerts.

**Functions:**

- `checkInventoryAlerts(brandId)` - Checks low stock and out-of-stock items
  - Uses `get_low_stock_products` RPC
  - Creates urgent alerts for out-of-stock items
  - Creates medium alerts for low stock items

### 4. Payment Alerts (`lib/notifications/payment-alerts.ts`)

Handles invoice and payment reminders.

**Functions:**

- `checkPaymentDueAlerts()` - Checks for upcoming invoice due dates
  - Looks ahead 7 days
  - Priority escalates as due date approaches (urgent ≤1 day, high ≤3 days)

### 5. Cron Job Endpoint (`app/api/cron/process-alerts/route.ts`)

Automated background job for periodic alert checks.

**Endpoint:** `POST /api/cron/process-alerts`

**Functionality:**
- Fetches all active brands
- Runs inventory checks for each brand
- Runs global payment checks
- Syncs calendar events for reminders

**Security:**
- Optional `CRON_SECRET` environment variable
- Authorization header: `Bearer ${CRON_SECRET}`

**Configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/process-alerts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```
*Runs every 6 hours*

---

## Frontend Components

### 1. Notification Hook (`hooks/use-notifications.ts`)

Primary hook for accessing notifications.

**Features:**
- Fetches notifications with filtering options
- Subscribes to Realtime updates (INSERT and UPDATE events)
- Tracks unread count
- Mark as read functionality
- Mark all as read functionality

**Options:**
```typescript
{
  isRead?: boolean;
  type?: string;
  priority?: string;
  actionRequired?: boolean;
  limit?: number;
  enableRealtime?: boolean; // default: true
}
```

**Returns:**
```typescript
{
  notifications: Notification[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}
```

### 2. Notification Drawer (`components/notifications/notification-drawer.tsx`)

Side panel for quick access to recent notifications.

**Features:**
- Opens from header bell icon
- Shows last 20 notifications
- Quick filters (all/unread, type)
- Mark as read inline
- Mark all as read
- Scrollable list
- Links to full notification center

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

### 3. Notification List (`components/notifications/notification-list.tsx`)

Full-page notification management interface.

**Features:**
- Advanced filtering:
  - Status (all/unread/read)
  - Type (order, payment, shipment, warning, info)
  - Priority (urgent, high, medium, low)
  - Entity type (po, order, invoice, inventory, shipment)
  - Date range (all time, today, last 7 days, last 30 days)
- Shows count of filtered vs total notifications
- Mark individual notifications as read
- Mark all as read
- Navigate to related entities

### 4. Notification Bell (`components/layout/notification-bell.tsx`)

Header component showing unread count.

**Features:**
- Badge with unread count
- Opens notification drawer on click
- Real-time count updates

### 5. Notification Listener (`components/notifications/notification-listener.tsx`)

Global listener for high-priority toast alerts.

**Features:**
- Subscribes to new notifications via Realtime
- Shows toast for high and urgent priority notifications
- Configurable display duration (5s for high, 10s for urgent)
- Action button to navigate to related entity
- Does not render any visible UI

**Integration:**
Added to `app/layout.tsx` to be active globally.

---

## Real-time Updates

### Supabase Realtime Configuration

The system uses Supabase's Realtime feature to broadcast notification changes instantly.

**Subscription Setup:**

```typescript
const channel = supabase
  .channel("notifications-changes")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      // Handle new notification
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      fetchUnreadCount();
    }
  )
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      // Handle notification update
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      fetchUnreadCount();
    }
  )
  .subscribe();
```

**Fallback Polling:**
- Polling interval: 5 minutes (reduced from 60 seconds)
- Only used if Realtime connection fails
- Ensures notifications are eventually delivered

---

## Integration Points

### 1. Purchase Orders

**Trigger Points:**

#### PO Creation
- **File:** `hooks/use-purchase-orders.ts`
- **Function:** `createPOMutation`
- **Action:** Creates notification via API call
- **Recipients:** Brand admins, logistics, reviewers (except creator)
- **Priority:** Medium
- **Action Required:** Yes

#### PO Approval
- **File:** `app/api/purchase-orders/[id]/approve/route.ts`
- **Function:** `POST handler`
- **Action:** Calls `createPOStatusChangeAlert()`
- **Recipients:** PO creator
- **Priority:** Low
- **Action Required:** No

#### PO Rejection
- **File:** `app/api/purchase-orders/[id]/reject/route.ts`
- **Function:** `POST handler`
- **Action:** Calls `createPOStatusChangeAlert()`
- **Recipients:** PO creator
- **Priority:** Medium
- **Action Required:** No

### 2. Inventory

**Trigger:** Automated via cron job

- **Frequency:** Every 6 hours
- **Function:** `checkInventoryAlerts(brandId)`
- **Checks:**
  - Out of stock items → Urgent, Action Required
  - Low stock items (below reorder level) → Medium, Action Required
- **Recipients:** All approved users in the brand

### 3. Payments & Invoices

**Trigger:** Automated via cron job

- **Frequency:** Every 6 hours
- **Function:** `checkPaymentDueAlerts()`
- **Checks:** Invoices due within 7 days
- **Priority Escalation:**
  - ≤1 day: Urgent
  - ≤3 days: High
  - 4-7 days: Medium
- **Recipients:** All approved users in the brand

### 4. Calendar Events

**Trigger:** Automated via cron job

- **Frequency:** Every 6 hours
- **Function:** `syncCalendarEvents(brandId)`
- **Generates:**
  - Payment due reminders
  - PO approval deadline reminders
  - Shipment arrival reminders
  - Custom event reminders

---

## Permissions & Security

### Row Level Security (RLS)

**Notifications Table:**
- Users can only view their own notifications
- Users can only update their own notifications
- Super admins can view all notifications (for debugging)

**Notification Preferences Table:**
- Users can only view/update/delete their own preferences
- Super admins can view all preferences

### API Authorization

All notification endpoints require authentication:
- User must be logged in via Supabase Auth
- User ID extracted from JWT token
- All queries filtered by `user_id`

### Cron Job Security

The cron endpoint supports optional secret-based authentication:
- Set `CRON_SECRET` environment variable
- Include in request header: `Authorization: Bearer ${CRON_SECRET}`
- Returns 401 if secret doesn't match

---

## Usage Examples

### Creating a Notification Programmatically

```typescript
import { createNotification } from "@/lib/notifications/alert-generator";

await createNotification({
  user_id: "user-uuid",
  type: "order",
  title: "Order Shipped",
  message: "Your order #ORD-12345 has been shipped",
  brand_id: "brand-uuid",
  related_entity_type: "order",
  related_entity_id: "order-uuid",
  priority: "low",
  action_required: false,
  action_url: "/orders/order-uuid",
});
```

### Creating Notifications for a Brand

```typescript
import { createNotificationsForBrand } from "@/lib/notifications/alert-generator";

await createNotificationsForBrand(
  {
    type: "warning",
    title: "Low Stock Alert",
    message: "5 products are running low on stock",
    related_entity_type: "inventory",
    priority: "medium",
    action_required: true,
    action_url: "/inventory",
  },
  brandId
);
```

### Using the Notification Hook

```typescript
import { useNotifications } from "@/hooks/use-notifications";

function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading,
  } = useNotifications({
    isRead: false,
    priority: "high",
    limit: 10,
  });

  return (
    <div>
      <h2>Unread Notifications ({unreadCount})</h2>
      {notifications.map((n) => (
        <div key={n.id} onClick={() => markAsRead(n.id)}>
          {n.title}
        </div>
      ))}
      <button onClick={markAllAsRead}>Mark All Read</button>
    </div>
  );
}
```

### Triggering the Cron Job Manually

```bash
# Without secret
curl -X POST https://your-domain.com/api/cron/process-alerts

# With secret
curl -X POST https://your-domain.com/api/cron/process-alerts \
  -H "Authorization: Bearer your-cron-secret"
```

---

## Future Enhancements

### Planned Features

1. **Email Notifications**
   - Respect `email_enabled` preference
   - Configurable digest frequency (immediate, daily, weekly)
   - Email templates with branding

2. **SMS Notifications**
   - For urgent/critical alerts
   - Phone number verification
   - Cost management controls

3. **Push Notifications**
   - Browser push notifications
   - Mobile app push (when available)

4. **Archive Functionality**
   - Soft delete old notifications
   - Archive drawer/page
   - Auto-archive after expiration

5. **Advanced Filtering**
   - Search by keyword
   - Filter by date range picker
   - Save filter presets

6. **Notification Groups**
   - Group related notifications (e.g., all PO updates)
   - Collapsible groups
   - Batch actions on groups

7. **Rich Content**
   - Inline images
   - Action buttons (Approve/Reject from notification)
   - Quick preview of related entity

8. **Analytics**
   - Notification open rates
   - Action completion rates
   - User engagement metrics

9. **Webhooks**
   - Allow third-party integrations
   - Configurable webhook endpoints
   - Retry logic and error handling

10. **Notification Templates**
    - Admin-configurable templates
    - Variable substitution
    - Multilingual support

### Technical Debt

- Add comprehensive unit tests
- Add integration tests for cron job
- Implement exponential backoff for failed notifications
- Add rate limiting for notification creation
- Implement notification batching for performance
- Add database indexes for common query patterns
- Monitor and optimize Realtime connection stability

---

## Troubleshooting

### Notifications Not Appearing

1. **Check user preferences:**
   - Query `notification_preferences` table
   - Ensure `in_app_enabled = true` for the notification type

2. **Check Realtime subscription:**
   - Open browser console
   - Look for "Notification subscription status: SUBSCRIBED"
   - Check for connection errors

3. **Verify notification was created:**
   - Check `notifications` table in database
   - Ensure `user_id` matches the logged-in user

4. **Check browser console for errors:**
   - React Query errors
   - Supabase connection errors
   - Authentication issues

### Cron Job Not Running

1. **Verify Vercel cron configuration:**
   - Check `vercel.json` exists and is properly configured
   - Verify deployment includes cron config

2. **Check cron job logs:**
   - Access Vercel dashboard
   - View function logs for `/api/cron/process-alerts`

3. **Test endpoint manually:**
   - Use curl or Postman
   - Verify endpoint returns 200 OK

4. **Check environment variables:**
   - Ensure `CRON_SECRET` is set (if using)
   - Verify Supabase credentials are correct

### Realtime Connection Issues

1. **Check Supabase project settings:**
   - Ensure Realtime is enabled
   - Verify API URL and anon key

2. **Check browser console:**
   - Look for WebSocket connection errors
   - Check for CORS issues

3. **Fallback to polling:**
   - Polling runs every 5 minutes
   - Notifications will still appear, just with delay

---

## Performance Considerations

### Database Query Optimization

- Indexes on `user_id`, `is_read`, `created_at`, `priority`
- Composite index on `(related_entity_type, related_entity_id)`
- Limit query results (default: 50, max: 100)
- Use `maybeSingle()` for preference checks to avoid errors

### Realtime Scalability

- Each user has their own channel subscription filtered by `user_id`
- Supabase handles multiplexing automatically
- Connection reuses existing WebSocket
- Graceful fallback to polling on connection failure

### Cron Job Performance

- Runs in parallel for each brand
- Error in one brand doesn't affect others
- Uses admin client for unrestricted access
- Logs duration for monitoring

### Frontend Optimization

- React Query caching (30s stale time)
- Optimistic updates for mark as read
- Debounced search/filters (300ms)
- Virtualized scrolling for large lists (future enhancement)

---

## Conclusion

The Notification Center is a robust, scalable, and extensible system that provides real-time alerts across the GrowShip platform. It integrates seamlessly with core modules (PO, Inventory, Payments, Calendar) and provides a solid foundation for future enhancements.

**Key Achievements:**
- ✅ Real-time notifications via Supabase Realtime
- ✅ Priority-based alerting system
- ✅ User preference management
- ✅ Automated background checks via cron
- ✅ Comprehensive UI (drawer, list, bell, toasts)
- ✅ Full integration with PO workflow
- ✅ Inventory and payment monitoring
- ✅ Permission-based access control
- ✅ Extensible architecture for future channels

**Next Steps:**
1. Deploy to production
2. Monitor Realtime connection stability
3. Gather user feedback on notification preferences
4. Implement email notifications (Phase 2)
5. Add analytics and reporting (Phase 2)

---

**Document Version:** 1.0  
**Last Updated:** November 24, 2025  
**Maintained By:** GrowShip Development Team

