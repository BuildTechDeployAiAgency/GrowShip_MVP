# Calendar Module Implementation Documentation

## Overview

The Calendar Module provides a comprehensive event management system integrated with Purchase Orders, Invoices, Shipments, Marketing Campaigns, and Compliance workflows. It features multiple view modes (Month, Week, List), role-based filtering, and automated event synchronization.

**Implementation Date:** November 24, 2025  
**Status:** ✅ Complete

---

## Table of Contents

1. [Data Models](#data-models)
2. [Event Types](#event-types)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Components](#frontend-components)
5. [API Endpoints](#api-endpoints)
6. [Integration Points](#integration-points)
7. [Permissions & Role-Based Access](#permissions--role-based-access)
8. [Automated Sync & Notifications](#automated-sync--notifications)
9. [Event Lifecycle](#event-lifecycle)
10. [Extension Points](#extension-points)

---

## Data Models

### Calendar Events Table

**Table Name:** `calendar_events`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `brand_id` | UUID | FK → brands, NOT NULL | Brand owning the event |
| `distributor_id` | UUID | FK → distributors, NULL | Optional distributor scope |
| `event_type` | ENUM | NOT NULL | Type of calendar event |
| `title` | VARCHAR(255) | NOT NULL | Event title |
| `description` | TEXT | NULL | Detailed description |
| `event_date` | DATE | NOT NULL | Date of the event |
| `event_time` | TIME | NULL | Optional time (for non-all-day events) |
| `related_entity_type` | VARCHAR(50) | NULL | Linked entity type (po, invoice, shipment, campaign, distributor) |
| `related_entity_id` | UUID | NULL | Linked entity ID |
| `is_all_day` | BOOLEAN | DEFAULT true | Whether event spans entire day |
| `status` | ENUM | DEFAULT 'upcoming' | Current status of event |
| `created_by` | UUID | FK → auth.users, NULL | User who created (NULL = system-generated) |
| `completed_at` | TIMESTAMPTZ | NULL | When marked as done |
| `completed_by` | UUID | FK → auth.users, NULL | User who completed |
| `cancelled_at` | TIMESTAMPTZ | NULL | When marked as cancelled |
| `cancelled_by` | UUID | FK → auth.users, NULL | User who cancelled |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

### Enums

#### `calendar_event_type`
```sql
CREATE TYPE calendar_event_type AS ENUM (
  'payment_due',           -- Invoice payment due date
  'po_approval_due',       -- Purchase order needs approval
  'shipment_arrival',      -- PO expected delivery
  'pop_upload_due',        -- Proof of performance upload deadline
  'delivery_milestone',    -- Shipment tracking milestone
  'compliance_review',     -- Monthly distributor report due
  'campaign_start',        -- Marketing campaign start date
  'campaign_end',          -- Marketing campaign end date
  'backorder_review',      -- PO backorder fill rate review
  'custom'                 -- User-created custom events
);
```

#### `calendar_event_status`
```sql
CREATE TYPE calendar_event_status AS ENUM (
  'upcoming',   -- Not yet occurred
  'done',       -- Completed successfully
  'overdue',    -- Past due date and still pending
  'cancelled'   -- Event cancelled or parent entity invalidated
);
```

---

## Event Types

### 1. Payment Due (`payment_due`)
- **Source:** `invoices` table
- **Trigger:** Invoice with `payment_status = 'pending'` and `due_date` within 30 days
- **Auto-Generated:** Yes
- **Description:** Alerts when invoice payments are coming due
- **Linked Entity:** `invoice`

### 2. PO Approval Due (`po_approval_due`)
- **Source:** `purchase_orders` table
- **Trigger:** PO with `po_status = 'submitted'`, due 3 days after submission
- **Auto-Generated:** Yes
- **Description:** Reminds approvers to review submitted purchase orders
- **Linked Entity:** `po`

### 3. Shipment Arrival (`shipment_arrival`)
- **Source:** `purchase_orders` table
- **Trigger:** PO with `po_status IN ('approved', 'ordered')` and `expected_delivery_date` within 30 days
- **Auto-Generated:** Yes
- **Description:** Tracks expected delivery dates for approved POs
- **Linked Entity:** `po`

### 4. Delivery Milestone (`delivery_milestone`)
- **Source:** `shipments` table
- **Trigger:** Shipment with `shipment_status IN ('pending', 'in_transit', 'out_for_delivery')` and `estimated_delivery_date` within 30 days
- **Auto-Generated:** Yes
- **Description:** Tracks individual shipment delivery milestones
- **Linked Entity:** `shipment`

### 5. Backorder Review (`backorder_review`)
- **Source:** `purchase_orders` table
- **Trigger:** PO with `po_status IN ('approved', 'ordered')`, review scheduled 14 days after PO date
- **Auto-Generated:** Yes
- **Description:** Scheduled review of backorder status and fill rates
- **Linked Entity:** `po`

### 6. Campaign Start/End (`campaign_start`, `campaign_end`)
- **Source:** `marketing_campaigns` table
- **Trigger:** Campaign with `status IN ('planned', 'active')` and `start_date`/`end_date` within 30 days
- **Auto-Generated:** Yes
- **Description:** Marks beginning and end of marketing campaigns
- **Linked Entity:** `campaign`

### 7. POP Upload Due (`pop_upload_due`)
- **Source:** `marketing_campaigns` table
- **Trigger:** Campaign end date + 3 days
- **Auto-Generated:** Yes
- **Description:** Deadline for uploading proof-of-performance documentation
- **Linked Entity:** `campaign`

### 8. Compliance Review (`compliance_review`)
- **Source:** `distributors` table
- **Trigger:** Monthly, due on 5th of next month for each active distributor
- **Auto-Generated:** Yes
- **Description:** Monthly distributor report submission deadline
- **Linked Entity:** `distributor`

### 9. Custom (`custom`)
- **Source:** User-created
- **Trigger:** Manual creation
- **Auto-Generated:** No
- **Description:** Flexible events for any purpose
- **Linked Entity:** Optional

---

## Backend Architecture

### Event Generator (`lib/calendar/event-generator.ts`)

The event generator is responsible for automatically creating, updating, and managing calendar events based on changes in related entities.

#### Key Functions

##### `generateEventsFromInvoices(brandId: string)`
Scans invoices with pending payments and creates `payment_due` events.

##### `generateEventsFromPOs(brandId: string)`
Creates multiple event types from purchase orders:
- `po_approval_due` for submitted POs
- `shipment_arrival` for approved POs with delivery dates
- `backorder_review` for orders needing fill rate review

##### `generateEventsFromShipments(brandId: string)`
Creates `delivery_milestone` events for active shipments.

##### `generateEventsFromCampaigns(brandId: string)`
Creates campaign-related events:
- `campaign_start` on campaign start date
- `campaign_end` on campaign end date
- `pop_upload_due` 3 days after campaign end

##### `generateEventsFromReports(brandId: string)`
Creates `compliance_review` events for monthly distributor reports (due 5th of next month).

##### `syncCalendarEvents(brandId: string, eventTypes?: Array<CalendarEventType>)`
Master sync function that:
1. Generates all event types for a brand
2. Compares with existing events in database
3. Creates new events
4. Updates changed events (date changes)
5. Marks events as `cancelled` when parent entities are completed/cancelled

**Returns:**
```typescript
{
  created: number,    // New events created
  updated: number,    // Existing events updated
  cancelled: number   // Events marked as cancelled
}
```

### Soft Deletion Strategy

Instead of hard-deleting events when parent entities are completed, the system marks them as `cancelled` with:
- `status = 'cancelled'`
- `cancelled_at = current_timestamp`

This preserves event history for audit purposes.

---

## Frontend Components

### 1. CalendarView (`components/calendar/calendar-view.tsx`)
**Purpose:** Traditional monthly grid calendar  
**Features:**
- Day-by-day grid layout
- Displays up to 2 events per day (with "+X more" indicator)
- Color-coded event badges by type
- Click events to view details
- Navigation: Previous/Next Month, Today button

### 2. WeekView (`components/calendar/week-view.tsx`)
**Purpose:** Weekly view with more event detail  
**Features:**
- 7-day column layout (Sunday-Saturday)
- Shows all events for each day
- Event time display (if not all-day)
- Status indicators (✓ for done, ! for overdue)
- Color-coded left border by status
- Navigation: Previous/Next Week, Today button

### 3. EventList (`components/calendar/event-list.tsx`)
**Purpose:** Searchable, filterable list of events  
**Features:**
- Search by title/description
- Filter by event type
- Chronological sorting
- Linked entity quick-access
- Status badges

### 4. EventDetailDialog (`components/calendar/event-detail-dialog.tsx`)
**Purpose:** Detailed view and actions for a single event  
**Features:**
- Full event information display
- Event type and status badges
- Linked entity card with direct navigation
- Quick actions: "Mark as Done", "Cancel Event"
- Completion/cancellation history

### 5. EventFormDialog (`components/calendar/event-form-dialog.tsx`)
**Purpose:** Create/edit custom events  
**Features:**
- Event type selection
- Date/time picker
- Optional entity linking
- Description field

---

## API Endpoints

### `GET /api/calendar/events`
Fetch calendar events with filters.

**Query Parameters:**
- `start_date` (string): Filter events >= this date (YYYY-MM-DD)
- `end_date` (string): Filter events <= this date (YYYY-MM-DD)
- `event_type` (string): Filter by event type
- `distributor_id` (string): Filter by distributor (brand users only)
- `status` (string): Filter by status

**Role-Based Filtering:**
- **Super Admin:** See all events across all brands
- **Brand Users:** See all events for their brand
- **Distributor Users:** See events for their distributor OR their brand

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "brand_id": "uuid",
      "distributor_id": "uuid",
      "event_type": "payment_due",
      "title": "Payment Due: INV-001",
      "description": "Invoice INV-001 payment is due in 3 day(s).",
      "event_date": "2025-11-27",
      "event_time": null,
      "related_entity_type": "invoice",
      "related_entity_id": "uuid",
      "is_all_day": true,
      "status": "upcoming",
      "created_at": "2025-11-24T10:00:00Z",
      "updated_at": "2025-11-24T10:00:00Z"
    }
  ]
}
```

### `POST /api/calendar/events`
Create a new calendar event (custom events only).

**Request Body:**
```json
{
  "event_type": "custom",
  "title": "Client Meeting",
  "description": "Quarterly review with distributor",
  "event_date": "2025-12-01",
  "event_time": "14:00:00",
  "is_all_day": false,
  "distributor_id": "uuid",
  "status": "upcoming"
}
```

**Response:**
```json
{
  "event": { /* created event */ }
}
```

### `PATCH /api/calendar/events`
Update an existing event.

**Request Body:**
```json
{
  "id": "uuid",
  "status": "done",
  "event_date": "2025-12-02"
}
```

**Auto-Populated Fields:**
- If `status = 'done'`: Sets `completed_at` and `completed_by`
- If `status = 'cancelled'`: Sets `cancelled_at` and `cancelled_by`

### `DELETE /api/calendar/events?id={uuid}`
Delete a calendar event (hard delete, use with caution).

### `POST /api/calendar/auto-generate`
Trigger manual sync of calendar events.

**Request Body:**
```json
{
  "brand_id": "uuid",  // Optional, defaults to user's brand
  "event_types": ["payment_due", "po_approval_due"]  // Optional, defaults to all
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": 5,
    "updated": 2,
    "cancelled": 1,
    "total": 7
  }
}
```

---

## Integration Points

### 1. Purchase Orders
**Integration:** When PO status or dates change, related events are synced.

**Event Types Created:**
- `po_approval_due` when PO is submitted
- `shipment_arrival` when PO has expected delivery date
- `backorder_review` for approved/ordered POs

**Cancellation Triggers:**
- PO status changes to `cancelled` or `received`
- Expected delivery date passes

### 2. Invoices
**Integration:** When invoice due dates approach, payment reminders are created.

**Event Types Created:**
- `payment_due` for pending invoices

**Cancellation Triggers:**
- Payment status changes to `paid`
- Due date passes

### 3. Shipments
**Integration:** Active shipments create delivery milestone events.

**Event Types Created:**
- `delivery_milestone` for pending/in-transit shipments

**Cancellation Triggers:**
- Shipment status changes to `delivered`, `failed`, or `returned`

### 4. Marketing Campaigns
**Integration:** Campaign lifecycle dates trigger event creation.

**Event Types Created:**
- `campaign_start` on start date
- `campaign_end` on end date
- `pop_upload_due` 3 days after end date

**Cancellation Triggers:**
- Campaign status changes to `completed` or `cancelled`

### 5. Distributors & Compliance
**Integration:** Monthly reports generate compliance review events.

**Event Types Created:**
- `compliance_review` due on 5th of next month for each active distributor

**Cancellation Triggers:**
- Distributor status changes to `inactive` or `archived`

### 6. Notification Center
**Integration:** Calendar events trigger notifications when due dates approach.

**Notification Flow:**
1. Cron job (`/api/cron/process-alerts`) runs periodically
2. Syncs calendar events via `syncCalendarEvents()`
3. Notification system checks for events within alert window
4. Creates notifications for upcoming/overdue events

---

## Permissions & Role-Based Access

### RLS Policies

#### SELECT Policy: "Users can view events for their brand or distributor"
```sql
USING (
  -- Super admins see all
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role_name = 'super_admin')
  OR
  -- Brand users see events for their brand
  brand_id IN (SELECT brand_id FROM user_profiles WHERE user_id = auth.uid())
  OR
  -- Distributor users see events for their distributor
  distributor_id IN (
    SELECT distributor_id FROM user_profiles 
    WHERE user_id = auth.uid() AND distributor_id IS NOT NULL
  )
)
```

#### INSERT/UPDATE/DELETE Policies
- **Brand users:** Can manage events for their brand
- **Super admins:** Can manage all events
- **Distributor users:** Read-only access (no insert/update/delete)

### API-Level Filtering

The API endpoint applies additional filtering:

```typescript
if (profile.role_name === "super_admin") {
  // No filter - see everything
} else if (profile.role_type === "distributor" && profile.distributor_id) {
  // Distributors see events for their distributor OR their brand
  query = query.or(`distributor_id.eq.${profile.distributor_id},brand_id.eq.${profile.brand_id}`);
} else if (profile.brand_id) {
  // Brand users see all events for their brand
  query = query.eq("brand_id", profile.brand_id);
}
```

---

## Automated Sync & Notifications

### Cron Job Integration

**Endpoint:** `POST /api/cron/process-alerts`  
**Schedule:** Configured in `vercel.json` or external scheduler  
**Frequency:** Recommended every 1-6 hours

**Process:**
1. Fetch all active brands
2. For each brand:
   - Run `syncCalendarEvents(brand.id)`
   - Check inventory alerts
   - Check payment due alerts
3. Return summary of sync results

**Cron Job Flow:**
```
[Scheduler] → POST /api/cron/process-alerts
              ↓
         Fetch all brands
              ↓
    For each brand:
      → syncCalendarEvents()
      → checkInventoryAlerts()
      → checkPaymentDueAlerts()
              ↓
     Return {created, updated, cancelled}
```

### Manual Sync

Users can trigger manual sync via:
- UI Button: "Sync Events" in calendar page
- API Call: `POST /api/calendar/auto-generate`

---

## Event Lifecycle

### State Diagram

```
[Entity Created/Updated] → [Event Generated] → status: 'upcoming'
                                                      ↓
                                            ┌─────────┴─────────┐
                                            ↓                   ↓
                                    [Date Passes]       [User Action]
                                            ↓                   ↓
                                    status: 'overdue'   status: 'done'
                                            ↓                   ↓
                                    [Entity Completed]   [Completed_at set]
                                            ↓
                                    status: 'cancelled'
                                            ↓
                                    [Cancelled_at set]
```

### Status Transitions

| From | To | Trigger | Action |
|------|----|---------| -------|
| upcoming | overdue | Date passes | Auto-updated by cron or UI check |
| upcoming | done | User marks complete | Set `completed_at`, `completed_by` |
| upcoming | cancelled | Entity completed/cancelled | Set `cancelled_at`, soft delete |
| overdue | done | User marks complete | Set `completed_at`, `completed_by` |
| overdue | cancelled | Entity completed/cancelled | Set `cancelled_at`, soft delete |

---

## Extension Points

### 1. Recurring Events
**Future Enhancement:** Add support for recurring events (daily, weekly, monthly).

**Suggested Implementation:**
- Add `recurrence_rule` column (JSONB or RRULE string)
- Add `parent_event_id` for linking recurring instances
- Update sync logic to generate future instances

### 2. Event Reminders
**Future Enhancement:** Multiple reminders per event (1 day before, 1 hour before, etc.).

**Suggested Implementation:**
- Create `event_reminders` table:
  - `event_id` (FK)
  - `remind_at` (TIMESTAMPTZ)
  - `reminder_type` (email, in-app, sms)
  - `sent` (BOOLEAN)

### 3. Event Attachments
**Future Enhancement:** Attach files/documents to events.

**Suggested Implementation:**
- Add `attachments` JSONB column
- Store Supabase Storage URLs

### 4. Calendar Subscriptions (iCal)
**Future Enhancement:** Export calendar as iCal feed for external calendar apps.

**Suggested Implementation:**
- Create `GET /api/calendar/ical/:brand_id` endpoint
- Generate iCal format response

### 5. Team Calendar Sharing
**Future Enhancement:** Share specific events with team members or external users.

**Suggested Implementation:**
- Create `event_shares` table
- Add `shared_with_user_id` or `shared_with_email`

---

## Testing Checklist

### Manual Testing

- [ ] **Create Custom Event**: Verify event appears in all views
- [ ] **Sync Events**: Trigger sync and verify auto-generated events
- [ ] **Role-Based Access**:
  - [ ] Super admin sees all events
  - [ ] Brand user sees only their brand events
  - [ ] Distributor user sees only their distributor events
- [ ] **View Modes**:
  - [ ] Month view displays correctly
  - [ ] Week view displays correctly
  - [ ] List view filters work
- [ ] **Event Actions**:
  - [ ] Mark event as done
  - [ ] Cancel event
  - [ ] Click linked entity navigates correctly
- [ ] **Event Detail Dialog**:
  - [ ] Shows all event metadata
  - [ ] Linked entity card works
  - [ ] Quick actions function
- [ ] **Filters**:
  - [ ] Event type filter works
  - [ ] Status filter works
  - [ ] Distributor filter works (brand users only)

### Integration Testing

- [ ] **PO Integration**: Create PO → Verify events created
- [ ] **Invoice Integration**: Create invoice → Verify payment due event
- [ ] **Shipment Integration**: Create shipment → Verify delivery milestone
- [ ] **Campaign Integration**: Create campaign → Verify start/end/POP events
- [ ] **Cancellation**: Cancel PO → Verify related events marked cancelled

---

## Limitations

1. **Time Zones:** All dates/times stored in UTC. Client-side rendering must handle timezone conversion.
2. **Event History:** Soft deletion preserves cancelled events, but no detailed edit history.
3. **Bulk Operations:** No UI for bulk event operations (e.g., cancel all events for a distributor).
4. **Notification Timing:** Dependent on cron job frequency; not real-time.
5. **Custom Event Validation:** Limited validation on custom event entity links.

---

## Performance Considerations

### Indexes

The following indexes optimize calendar queries:

```sql
idx_calendar_events_brand_id
idx_calendar_events_distributor_id
idx_calendar_events_event_date
idx_calendar_events_event_type
idx_calendar_events_status
idx_calendar_events_related_entity
idx_calendar_events_brand_date
idx_calendar_events_brand_distributor
idx_calendar_events_status_date
```

### Query Optimization

- Date range queries use indexed `event_date` column
- Role-based filtering uses indexed `brand_id` and `distributor_id`
- Event type and status filters use indexed columns

### Sync Performance

- Sync is incremental (only creates/updates changed events)
- Batch operations for creating multiple events
- Limits lookback window to 30 days for most event types

---

## Migration Guide

### Applying the Schema Changes

```bash
# Run the migration
psql -h your-db-host -U your-db-user -d your-db-name -f supabase_migrations/049_enhance_calendar_events.sql
```

### Post-Migration Steps

1. **Initial Sync:** Run sync for all brands to populate events
   ```bash
   curl -X POST https://your-app.com/api/calendar/auto-generate \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. **Verify RLS Policies:** Test with different user roles to ensure proper access control

3. **Update Cron Schedule:** Ensure cron job is running at desired frequency

---

## Conclusion

The Calendar Module provides a robust, integrated event management system that automatically synchronizes with core business entities. Its flexible architecture supports future enhancements while maintaining performance and security through role-based access controls.

**Key Benefits:**
- ✅ Automated event generation from business entities
- ✅ Multiple view modes (Month, Week, List)
- ✅ Role-based access with distributor scoping
- ✅ Soft deletion preserves audit history
- ✅ Extensible architecture for future features
- ✅ Integration with Notification Center

**Maintainability:**
- Clear separation between event generation and UI
- TypeScript types ensure data consistency
- Comprehensive documentation for future developers
- Scalable sync logic handles large datasets

---

**Document Version:** 1.0  
**Last Updated:** November 24, 2025  
**Author:** GrowShip MVP Team

