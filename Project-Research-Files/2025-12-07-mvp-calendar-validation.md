# MVP Calendar Functionality - Validation Report

**Date:** December 7, 2025  
**Author:** GrowShip MVP Team

---

## Summary

The MVP Calendar functionality has been validated and is **fully operational**. The architecture is robust, featuring:

- A dedicated `calendar_events` table as the central source of truth
- An automated sync engine that pulls data from Invoices, Purchase Orders, Shipments, and Marketing Campaigns
- Role-based visibility enforced at the API level
- A complete UI with Month, Week, and List views

---

## Data Model

### Calendar Events Table

| Column                | Type         | Description                                          |
| --------------------- | ------------ | ---------------------------------------------------- |
| `id`                  | uuid         | Primary key                                          |
| `brand_id`            | uuid         | Links to brands table                                |
| `distributor_id`      | uuid         | Optional - for distributor filtering                 |
| `event_type`          | enum         | payment_due, pop_upload_due, compliance_review, etc. |
| `title`               | varchar(255) | Event title                                          |
| `description`         | text         | Event description                                    |
| `event_date`          | date         | When the event occurs                                |
| `event_time`          | time         | Optional time                                        |
| `related_entity_type` | varchar(50)  | invoice, po, shipment, campaign, distributor         |
| `related_entity_id`   | uuid         | Links to the related record                          |
| `status`              | enum         | upcoming, done, overdue, cancelled                   |
| `is_all_day`          | boolean      | Default true                                         |
| `created_by`          | uuid         | User who created (null for system-generated)         |
| `completed_at`        | timestamptz  | When marked as done                                  |
| `completed_by`        | uuid         | User who marked as done                              |
| `cancelled_at`        | timestamptz  | When cancelled                                       |
| `cancelled_by`        | uuid         | User who cancelled                                   |

### Event Types (Enum)

- `payment_due` - Invoice payment deadlines
- `po_approval_due` - Purchase order approval deadlines
- `shipment_arrival` - Expected shipment arrivals
- `pop_upload_due` - Proof of performance upload deadlines
- `delivery_milestone` - Delivery tracking milestones
- `compliance_review` - Monthly distributor compliance reviews
- `campaign_start` - Marketing campaign start dates
- `campaign_end` - Marketing campaign end dates
- `backorder_review` - Backorder review reminders
- `custom` - User-created custom events

---

## Event Generation Logic

The sync engine (`lib/calendar/event-generator.ts`) automatically generates events from:

### 1. Invoices (`payment_due`)

- Queries invoices with `payment_status = 'pending'` and `due_date` within 30 days
- Creates events on the invoice due date

### 2. Purchase Orders

- `po_approval_due`: Created 3 days after PO submission
- `shipment_arrival`: Based on `expected_delivery_date`
- `backorder_review`: 14 days after PO date for approved/ordered POs

### 3. Shipments (`delivery_milestone`)

- Based on `estimated_delivery_date` for active shipments

### 4. Marketing Campaigns

- `campaign_start`: On campaign start date
- `campaign_end`: On campaign end date
- `pop_upload_due`: 3 days after campaign ends

### 5. Compliance (`compliance_review`)

- Generated for the 5th of each month for all active distributors

---

## API Endpoints

### GET `/api/calendar/events`

Retrieves calendar events with filtering:

- `start_date`, `end_date` - Date range
- `event_type` - Filter by type
- `status` - Filter by status
- `distributor_id` - Filter by distributor

### POST `/api/calendar/events`

Create a new calendar event

### PATCH `/api/calendar/events`

Update event (status, date, title, description)

### DELETE `/api/calendar/events?id=...`

Delete a calendar event

### POST `/api/calendar/auto-generate`

Trigger manual sync of calendar events

### POST `/api/cron/process-alerts`

Background job that:

1. Syncs calendar events for all brands
2. Creates notifications for upcoming events
3. Checks compliance deadlines

---

## Role-Based Visibility

| Role             | Visibility                                  |
| ---------------- | ------------------------------------------- |
| Super Admin      | All events across all brands                |
| Brand User       | Events for their brand                      |
| Distributor User | Events for their distributor OR their brand |

---

## UI Components

### Pages

- `app/(authenticated)/calendar/page.tsx` - Main calendar page

### Components

- `components/calendar/calendar-view.tsx` - Month view
- `components/calendar/week-view.tsx` - Week view
- `components/calendar/event-list.tsx` - List view
- `components/calendar/event-form-dialog.tsx` - Create/edit events
- `components/calendar/event-detail-dialog.tsx` - View event details with deep links

---

## Changes Made (December 7, 2025)

### 1. Created Vercel Cron Configuration

**File:** `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/process-alerts",
      "schedule": "0 6 * * *"
    }
  ]
}
```

The cron job runs daily at 6:00 AM UTC to:

- Sync calendar events from all source entities
- Create notifications for upcoming deadlines
- Check compliance review dates

### 2. Added CRON_SECRET to Environment Variables

**File:** `env.example`

Added `CRON_SECRET` environment variable documentation for securing the cron endpoint.

### 3. Fixed Deep Links in Event Details

**File:** `components/calendar/event-detail-dialog.tsx`

Updated the `getEntityLink` function to use appropriate links based on available pages:

- Invoice links: `/invoices` (list page only - no detail view exists)
- Campaign links: `/marketing` (placeholder page - full implementation pending)
- PO links: `/purchase-orders/${id}` (detail page available)
- Shipment links: `/shipments/${id}` (detail page available)
- Distributor links: `/distributors/${id}` (detail page available)

**Note:** Future enhancement could add highlight/scroll-to functionality for list pages when detail views are not available.

---

## Deployment Notes

### Environment Variables Required

| Variable      | Description                                            |
| ------------- | ------------------------------------------------------ |
| `CRON_SECRET` | Secret for authenticating cron job requests (REQUIRED) |

Generate with: `openssl rand -hex 32`

### Vercel Cron Setup

1. The `vercel.json` file configures the cron automatically
2. **REQUIRED**: Set `CRON_SECRET` in Vercel Environment Variables
   - Go to: https://vercel.com/[your-team]/grow-ship-mvp/settings/environment-variables
   - Add: `CRON_SECRET` = (your generated secret)
   - Scope: Production (recommended) or All Environments
3. Verify cron appears at: https://vercel.com/[your-team]/grow-ship-mvp/settings/cron-jobs
4. The cron runs at 6:00 AM UTC daily

**Security Note**: The cron endpoint will return a 500 error if `CRON_SECRET` is not configured. This is intentional to prevent accidental exposure in production.

---

## Future Enhancements (P1/P2)

### P1 - Nice to Have

- Add highlight/scroll-to functionality when navigating to invoices page
- Add campaign management UI to marketing page

### P2 - Future Phases

- Standalone POP requirements (outside of campaigns)
- Advanced calendar with recurrence support
- Smart reminder automation
- Calendar sharing between users

---

## Testing

### Manual Testing Steps

1. **Sync Events**: Click "Sync Events" button on Calendar page
2. **Create Event**: Use "New Event" button to create a custom event
3. **View Event**: Click any event to see details
4. **Deep Links**: Click "View [entity]" in event details to navigate
5. **Mark Complete**: Use "Mark as Done" button on upcoming events
6. **Filter Events**: Use type and status filters

### Cron Testing

```bash
# Test cron endpoint locally
curl -X POST http://localhost:3000/api/cron/process-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
