import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface GeneratedEvent {
  event_type: "payment_due" | "po_approval_due" | "shipment_arrival" | "pop_upload_due" | "custom";
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  related_entity_type: string;
  related_entity_id: string;
  is_all_day: boolean;
}

/**
 * Generate calendar events from invoices with due dates
 */
export async function generateEventsFromInvoices(brandId: string): Promise<GeneratedEvent[]> {
  const supabase = createAdminClient();
  const events: GeneratedEvent[] = [];

  // Get invoices with due dates in the next 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, due_date, total_amount, payment_status")
    .eq("brand_id", brandId)
    .eq("payment_status", "pending")
    .not("due_date", "is", null)
    .lte("due_date", thirtyDaysFromNow.toISOString().split("T")[0])
    .gte("due_date", new Date().toISOString().split("T")[0]);

  if (error) {
    console.error("Error fetching invoices for calendar events:", error);
    return events;
  }

  if (!invoices || invoices.length === 0) {
    return events;
  }

  // Create events for each invoice
  for (const invoice of invoices) {
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toISOString().split("T")[0] : null;
    if (!dueDate) continue;

    const daysUntilDue = Math.ceil(
      (new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    events.push({
      event_type: "payment_due",
      title: `Payment Due: ${invoice.invoice_number}`,
      description: `Invoice ${invoice.invoice_number} payment is due${daysUntilDue === 0 ? " today" : ` in ${daysUntilDue} day(s)`}. Amount: $${invoice.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`,
      event_date: dueDate,
      related_entity_type: "invoice",
      related_entity_id: invoice.id,
      is_all_day: true,
    });
  }

  return events;
}

/**
 * Generate calendar events from purchase orders
 */
export async function generateEventsFromPOs(brandId: string): Promise<GeneratedEvent[]> {
  const supabase = createAdminClient();
  const events: GeneratedEvent[] = [];

  // Get POs that need approval (status = 'submitted')
  const { data: submittedPOs, error: submittedError } = await supabase
    .from("purchase_orders")
    .select("id, po_number, submitted_at, total_amount")
    .eq("brand_id", brandId)
    .eq("po_status", "submitted");

  if (submittedError) {
    console.error("Error fetching submitted POs for calendar events:", submittedError);
  } else if (submittedPOs && submittedPOs.length > 0) {
    // Create approval due events (due 3 days after submission)
    for (const po of submittedPOs) {
      if (po.submitted_at) {
        const submittedDate = new Date(po.submitted_at);
        const dueDate = new Date(submittedDate);
        dueDate.setDate(dueDate.getDate() + 3); // 3 days to approve

        events.push({
          event_type: "po_approval_due",
          title: `PO Approval Due: ${po.po_number}`,
          description: `Purchase Order ${po.po_number} requires approval. Amount: $${po.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`,
          event_date: dueDate.toISOString().split("T")[0],
          related_entity_type: "po",
          related_entity_id: po.id,
          is_all_day: true,
        });
      }
    }
  }

  // Get POs with expected delivery dates
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: deliveryPOs, error: deliveryError } = await supabase
    .from("purchase_orders")
    .select("id, po_number, expected_delivery_date, total_amount, po_status")
    .eq("brand_id", brandId)
    .not("expected_delivery_date", "is", null)
    .lte("expected_delivery_date", thirtyDaysFromNow.toISOString().split("T")[0])
    .gte("expected_delivery_date", new Date().toISOString().split("T")[0])
    .in("po_status", ["approved", "ordered"]);

  if (deliveryError) {
    console.error("Error fetching delivery POs for calendar events:", deliveryError);
  } else if (deliveryPOs && deliveryPOs.length > 0) {
    // Create shipment arrival events
    for (const po of deliveryPOs) {
      if (po.expected_delivery_date) {
        const deliveryDate = new Date(po.expected_delivery_date).toISOString().split("T")[0];

        events.push({
          event_type: "shipment_arrival",
          title: `Shipment Arrival: ${po.po_number}`,
          description: `Purchase Order ${po.po_number} shipment is expected to arrive. Amount: $${po.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`,
          event_date: deliveryDate,
          related_entity_type: "po",
          related_entity_id: po.id,
          is_all_day: true,
        });
      }
    }
  }

  return events;
}

/**
 * Sync calendar events for a brand
 * Creates new events, updates existing ones, and removes events for cancelled/completed entities
 */
export async function syncCalendarEvents(
  brandId: string,
  eventTypes?: Array<"payment_due" | "po_approval_due" | "shipment_arrival">
): Promise<{
  created: number;
  updated: number;
  deleted: number;
}> {
  const supabase = createAdminClient();
  let created = 0;
  let updated = 0;
  let deleted = 0;

  const allEvents: GeneratedEvent[] = [];

  // Generate events based on requested types (or all if not specified)
  if (!eventTypes || eventTypes.includes("payment_due")) {
    const invoiceEvents = await generateEventsFromInvoices(brandId);
    allEvents.push(...invoiceEvents);
  }

  if (!eventTypes || eventTypes.includes("po_approval_due") || eventTypes.includes("shipment_arrival")) {
    const poEvents = await generateEventsFromPOs(brandId);
    allEvents.push(...poEvents);
  }

  // Get existing auto-generated events for this brand
  const { data: existingEvents, error: existingError } = await supabase
    .from("calendar_events")
    .select("id, event_type, related_entity_type, related_entity_id, event_date")
    .eq("brand_id", brandId)
    .in("event_type", ["payment_due", "po_approval_due", "shipment_arrival"]);

  if (existingError) {
    console.error("Error fetching existing calendar events:", existingError);
  }

  // Create a map of existing events by entity
  const existingEventsMap = new Map<string, any>();
  if (existingEvents) {
    for (const event of existingEvents) {
      const key = `${event.event_type}_${event.related_entity_type}_${event.related_entity_id}`;
      existingEventsMap.set(key, event);
    }
  }

  // Process new events
  const eventsToCreate: GeneratedEvent[] = [];
  const eventsToUpdate: Array<{ id: string; event: GeneratedEvent }> = [];

  for (const event of allEvents) {
    const key = `${event.event_type}_${event.related_entity_type}_${event.related_entity_id}`;
    const existing = existingEventsMap.get(key);

    if (existing) {
      // Check if event date changed
      if (existing.event_date !== event.event_date) {
        eventsToUpdate.push({ id: existing.id, event });
      }
      // Remove from map so we know it still exists
      existingEventsMap.delete(key);
    } else {
      // New event to create
      eventsToCreate.push(event);
    }
  }

  // Create new events
  if (eventsToCreate.length > 0) {
    const eventsToInsert = eventsToCreate.map((event) => ({
      brand_id: brandId,
      event_type: event.event_type,
      title: event.title,
      description: event.description || null,
      event_date: event.event_date,
      event_time: event.event_time || null,
      related_entity_type: event.related_entity_type,
      related_entity_id: event.related_entity_id,
      is_all_day: event.is_all_day,
      created_by: null, // System-generated
    }));

    const { error: createError } = await supabase
      .from("calendar_events")
      .insert(eventsToInsert);

    if (createError) {
      console.error("Error creating calendar events:", createError);
    } else {
      created = eventsToCreate.length;
    }
  }

  // Update changed events
  for (const { id, event } of eventsToUpdate) {
    const { error: updateError } = await supabase
      .from("calendar_events")
      .update({
        event_date: event.event_date,
        title: event.title,
        description: event.description || null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating calendar event:", updateError);
    } else {
      updated++;
    }
  }

  // Delete events for entities that no longer exist or are completed
  // (events remaining in existingEventsMap are no longer needed)
  const eventsToDelete = Array.from(existingEventsMap.values()).map((e) => e.id);

  if (eventsToDelete.length > 0) {
    // Verify entities still exist before deleting
    const eventsToActuallyDelete: string[] = [];

    for (const event of existingEventsMap.values()) {
      let shouldDelete = false;

      if (event.related_entity_type === "invoice") {
        const { data: invoice } = await supabase
          .from("invoices")
          .select("id, payment_status, due_date")
          .eq("id", event.related_entity_id)
          .single();

        // Delete if invoice is paid or due date passed
        if (!invoice || invoice.payment_status === "paid" || (invoice.due_date && new Date(invoice.due_date) < new Date())) {
          shouldDelete = true;
        }
      } else if (event.related_entity_type === "po") {
        const { data: po } = await supabase
          .from("purchase_orders")
          .select("id, po_status, expected_delivery_date")
          .eq("id", event.related_entity_id)
          .single();

        // Delete if PO is cancelled, received, or delivery date passed
        if (!po || po.po_status === "cancelled" || po.po_status === "received" || 
            (po.expected_delivery_date && new Date(po.expected_delivery_date) < new Date())) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        eventsToActuallyDelete.push(event.id);
      }
    }

    if (eventsToActuallyDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("calendar_events")
        .delete()
        .in("id", eventsToActuallyDelete);

      if (deleteError) {
        console.error("Error deleting calendar events:", deleteError);
      } else {
        deleted = eventsToActuallyDelete.length;
      }
    }
  }

  return { created, updated, deleted };
}

