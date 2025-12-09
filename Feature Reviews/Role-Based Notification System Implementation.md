# Role-Based Notification System Implementation

**Date:** December 9, 2025  
**Version:** 1.0  
**Status:** Implementation Complete - Ready for Testing

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Service Layer](#service-layer)
4. [API Endpoints](#api-endpoints)
5. [Migration Guide](#migration-guide)
6. [Testing Plan](#testing-plan)
7. [Rollout Strategy](#rollout-strategy)

---

## Overview

### Purpose

This implementation creates a scalable, role-based notification management system that allows Super Admins to configure which roles receive which notifications. It replaces hardcoded notification logic with database-driven configuration.

### Key Features

1. **Centralized Notification Registry** - All 30 notification types registered in `notification_types` table
2. **Per-Role Configuration** - Each role can have custom settings per notification type
3. **Frequency Options** - Instant, hourly digest, daily digest, weekly digest
4. **Multi-Channel Support** - In-app notifications with placeholder for email/SMS
5. **Admin API** - Super Admin-only endpoints for managing settings
6. **Backward Compatibility** - Legacy functions continue to work during migration

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Triggers                           │
│  (PO Created, Stock Low, Shipment Shipped, etc.)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              NotificationDispatcher                         │
│  • Looks up notification_types                              │
│  • Fetches enabled roles from notification_role_settings    │
│  • Resolves recipients (brand/distributor/super admin)      │
│  • Respects user preferences                                │
│  • Routes to instant or digest queue                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  notifications  │     │notification_    │
│    (instant)    │     │   digests       │
└─────────────────┘     └─────────────────┘
```

---

## Database Schema

### New Tables

#### 1. `notification_types` (Registry)

```sql
CREATE TABLE notification_types (
  id UUID PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,        -- e.g., 'po_created'
  name VARCHAR(255) NOT NULL,              -- Human-readable name
  category notification_category NOT NULL, -- purchase_order, inventory, etc.
  description TEXT,
  default_priority notification_priority,
  default_action_required BOOLEAN,
  supported_roles TEXT[],                  -- Roles that can receive this type
  module VARCHAR(100),                     -- Source module
  trigger_location VARCHAR(255),           -- File/function that triggers
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 2. `notification_role_settings` (Configuration)

```sql
CREATE TABLE notification_role_settings (
  id UUID PRIMARY KEY,
  notification_type_id UUID NOT NULL REFERENCES notification_types(id),
  role VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  frequency notification_frequency DEFAULT 'instant',
  channels JSONB DEFAULT '["in_app"]',
  escalation_enabled BOOLEAN DEFAULT false,  -- Future
  escalation_after_hours INTEGER,            -- Future
  escalation_to_role VARCHAR(50),            -- Future
  custom_thresholds JSONB,                   -- Future
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT unique_notification_role UNIQUE (notification_type_id, role)
);
```

#### 3. `notification_digests` (Queue)

```sql
CREATE TABLE notification_digests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type_id UUID NOT NULL,
  frequency notification_frequency NOT NULL,
  data JSONB NOT NULL,                       -- Snapshot of notification data
  status digest_status DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### New Enums

- `notification_category`: purchase_order, inventory, payment, shipment, order, calendar, compliance, system
- `notification_frequency`: instant, hourly_digest, daily_digest, weekly_digest
- `digest_status`: pending, processed, failed

### Migration Files

1. `20251209_notification_registry_system.sql` - Creates tables, enums, indexes, RLS policies
2. `20251209_notification_registry_seed.sql` - Seeds 30 notification types and default settings
3. `20251209_notification_sql_helper.sql` - Creates SQL helper functions for database triggers
4. `20251209_update_shipment_notifications.sql` - Updates shipment functions to use role-based system

---

## Service Layer

### NotificationDispatcher

**Location:** `lib/notifications/dispatcher.ts`

**Main Method:**

```typescript
await NotificationDispatcher.dispatch(
  "po_created", // Notification type key
  {
    title: "New PO Created",
    message: "PO-123 requires review",
    brandId: "uuid",
    relatedEntityType: "po",
    relatedEntityId: "po-uuid",
    actionUrl: "/purchase-orders/po-uuid",
  },
  {
    excludeUserId: creatorId, // Optional: exclude specific user
    priorityOverride: "high", // Optional: override default priority
    targetRoles: ["brand_admin"], // Optional: limit to specific roles
  }
);
```

**Features:**

- Caches notification settings (1 minute TTL)
- Resolves recipients based on brand/distributor context
- Respects user notification preferences
- Routes to instant notifications or digest queue
- Batch inserts for performance

### SQL Helper Functions

**Location:** `20251209_notification_sql_helper.sql`

```sql
-- General role-based notification dispatch
SELECT create_role_based_notification(
  'shipment_shipped',             -- type_key
  'Shipment Shipped',             -- title
  'Shipment SHP-123 is shipped',  -- message
  p_brand_id,                     -- brand_id
  p_distributor_id,               -- distributor_id
  'shipment',                     -- related_entity_type
  p_shipment_id,                  -- related_entity_id
  '/orders/' || p_order_id,       -- action_url
  'medium'::notification_priority -- priority_override
);

-- Shipment-specific wrapper
SELECT create_shipment_notification(
  p_shipment_id,
  p_shipment_number,
  p_order_number,
  p_brand_id,
  p_distributor_id,
  p_status,                       -- Maps to type key automatically
  p_action_url
);
```

---

## API Endpoints

### GET /api/admin/notifications

Fetch all notification types grouped by category.

**Access:** Super Admin only

**Response:**

```json
{
  "types": [...],
  "byCategory": {
    "purchase_order": [...],
    "inventory": [...]
  },
  "totalCount": 30
}
```

### GET /api/admin/notifications/settings

Fetch the full notification × role matrix with current settings.

**Response:**

```json
{
  "matrix": [
    {
      "notification_type_id": "uuid",
      "key": "po_created",
      "name": "New Purchase Order Created",
      "category": "purchase_order",
      "role_settings": [
        {
          "role": "brand_admin",
          "is_enabled": true,
          "frequency": "instant",
          "channels": ["in_app"]
        }
      ]
    }
  ],
  "availableRoles": ["brand_admin", "brand_manager", ...],
  "totalTypes": 30
}
```

### PUT /api/admin/notifications/settings

Update a single notification-role setting.

**Request:**

```json
{
  "notification_type_id": "uuid",
  "role": "brand_admin",
  "is_enabled": false,
  "frequency": "daily_digest",
  "channels": ["in_app", "email"]
}
```

### POST /api/admin/notifications/settings

Bulk update multiple settings.

**Request:**

```json
{
  "settings": [
    {
      "notification_type_id": "uuid1",
      "role": "brand_admin",
      "is_enabled": false
    },
    {
      "notification_type_id": "uuid2",
      "role": "distributor_admin",
      "is_enabled": true
    }
  ]
}
```

---

## Migration Guide

### Files Migrated to NotificationDispatcher

| File                                     | Status | Notes                                  |
| ---------------------------------------- | ------ | -------------------------------------- |
| `lib/notifications/po-alerts.ts`         | DONE   | All 3 functions migrated               |
| `lib/notifications/inventory-alerts.ts`  | DONE   | All 6 functions migrated               |
| `lib/notifications/payment-alerts.ts`    | DONE   | `checkPaymentDueAlerts()` migrated     |
| `lib/notifications/compliance-alerts.ts` | DONE   | Both functions migrated                |
| Shipment SQL functions                   | DONE   | Using `create_shipment_notification()` |

### Files Still Using Legacy Functions

| File                                     | Function                        | Migration Priority |
| ---------------------------------------- | ------------------------------- | ------------------ |
| `lib/inventory/order-sync.ts`            | `createNotificationsForBrand()` | Low (works as-is)  |
| `lib/inventory/po-sync.ts`               | `createNotificationsForBrand()` | Low (works as-is)  |
| `app/api/inventory/adjust/route.ts`      | `createNotificationsForBrand()` | Low (works as-is)  |
| `app/api/inventory/bulk-adjust/route.ts` | `createNotificationsForBrand()` | Low (works as-is)  |

The legacy functions continue to work but don't respect role-based settings. They can be migrated to use `NotificationDispatcher` when time permits.

---

## Testing Plan

### Unit Tests

1. **NotificationDispatcher.dispatch()** - Verify correct recipients resolved
2. **Role filtering** - Test that disabled roles don't receive notifications
3. **User preference** - Test that user opt-outs are respected
4. **Digest routing** - Test that non-instant frequencies go to digest queue

### Integration Tests

1. **PO Created Flow:**

   - Create PO
   - Verify `brand_admin` receives notification (default ON)
   - Disable `brand_admin` via API
   - Create another PO
   - Verify `brand_admin` does NOT receive notification

2. **Shipment Flow:**

   - Create shipment
   - Verify both brand users AND distributor receive notification
   - Disable `distributor_admin` for shipment notifications
   - Create another shipment
   - Verify only brand users receive notification

3. **Settings API:**
   - GET matrix returns all 30 types
   - PUT updates single setting
   - POST bulk updates work
   - Changes take effect immediately (cache cleared)

---

## Rollout Strategy

### Phase 1: Database Setup (Current)

1. Run migrations to create tables
2. Seed notification types and default settings
3. Default settings match current hardcoded behavior
4. No user-facing changes yet

### Phase 2: Enable Role-Based Dispatch

1. Deploy updated alert functions
2. Monitor logs for dispatch success
3. Verify notifications still flow correctly
4. Test Admin API endpoints

### Phase 3: Admin UI (Future)

1. Build Super Admin "Notification Settings" page
2. Display the notification × role matrix
3. Allow toggling and frequency changes
4. Show preview of affected users

### Phase 4: Advanced Features (Future)

1. Implement digest cron job for hourly/daily/weekly aggregation
2. Add email channel integration
3. Add escalation rules
4. Add threshold-based notifications

---

## Summary of Files Created/Modified

### New Files

| File                                                             | Description                      |
| ---------------------------------------------------------------- | -------------------------------- |
| `supabase_migrations/20251209_notification_registry_system.sql`  | Schema for tables, enums, RLS    |
| `supabase_migrations/20251209_notification_registry_seed.sql`    | Seeds 30 notification types      |
| `supabase_migrations/20251209_notification_sql_helper.sql`       | SQL helper functions             |
| `supabase_migrations/20251209_update_shipment_notifications.sql` | Updates shipment functions       |
| `lib/notifications/dispatcher.ts`                                | NotificationDispatcher service   |
| `app/api/admin/notifications/route.ts`                           | Admin API for notification types |
| `app/api/admin/notifications/settings/route.ts`                  | Admin API for role settings      |

### Modified Files

| File                                     | Changes                                |
| ---------------------------------------- | -------------------------------------- |
| `lib/notifications/po-alerts.ts`         | Migrated to use NotificationDispatcher |
| `lib/notifications/inventory-alerts.ts`  | Migrated to use NotificationDispatcher |
| `lib/notifications/payment-alerts.ts`    | Migrated to use NotificationDispatcher |
| `lib/notifications/compliance-alerts.ts` | Migrated to use NotificationDispatcher |
| `lib/notifications/alert-generator.ts`   | Added deprecation notice               |

---

**Document Version:** 1.0  
**Last Updated:** December 9, 2025  
**Maintained By:** GrowShip Development Team
