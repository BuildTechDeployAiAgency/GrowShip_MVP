import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export type CalendarEventType = 
  | "payment_due"
  | "po_approval_due"
  | "shipment_arrival"
  | "pop_upload_due"
  | "delivery_milestone"
  | "compliance_review"
  | "campaign_start"
  | "campaign_end"
  | "backorder_review"
  | "custom";

export interface GeneratedEvent {
  event_type: CalendarEventType;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  related_entity_type: string;
  related_entity_id: string;
  is_all_day: boolean;
  distributor_id?: string;
  status?: "upcoming" | "done" | "overdue" | "cancelled";
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
    .select("id, invoice_number, due_date, total_amount, payment_status, distributor_id")
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
      distributor_id: invoice.distributor_id || undefined,
      status: "upcoming",
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
    .select("id, po_number, submitted_at, total_amount, distributor_id")
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
          distributor_id: po.distributor_id || undefined,
          status: "upcoming",
        });
      }
    }
  }

  // Get POs with expected delivery dates
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: deliveryPOs, error: deliveryError } = await supabase
    .from("purchase_orders")
    .select("id, po_number, expected_delivery_date, total_amount, po_status, distributor_id")
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
          distributor_id: po.distributor_id || undefined,
          status: "upcoming",
        });
      }
    }
  }

  // Get POs with backorders or low fill rates
  const { data: backorderPOs, error: backorderError } = await supabase
    .from("purchase_orders")
    .select("id, po_number, po_date, distributor_id")
    .eq("brand_id", brandId)
    .in("po_status", ["approved", "ordered"]);

  if (!backorderError && backorderPOs && backorderPOs.length > 0) {
    for (const po of backorderPOs) {
      // Schedule backorder review 14 days after PO date
      if (po.po_date) {
        const poDate = new Date(po.po_date);
        const reviewDate = new Date(poDate);
        reviewDate.setDate(reviewDate.getDate() + 14);

        // Only create if review date is in the future
        if (reviewDate >= new Date()) {
          events.push({
            event_type: "backorder_review",
            title: `Backorder Review: ${po.po_number}`,
            description: `Review backorder status and fill rate for Purchase Order ${po.po_number}`,
            event_date: reviewDate.toISOString().split("T")[0],
            related_entity_type: "po",
            related_entity_id: po.id,
            is_all_day: true,
            distributor_id: po.distributor_id || undefined,
            status: "upcoming",
          });
        }
      }
    }
  }

  return events;
}

/**
 * Generate calendar events from shipments
 */
export async function generateEventsFromShipments(brandId: string): Promise<GeneratedEvent[]> {
  const supabase = createAdminClient();
  const events: GeneratedEvent[] = [];

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("id, tracking_number, estimated_delivery_date, shipment_status, distributor_id")
    .eq("brand_id", brandId)
    .not("estimated_delivery_date", "is", null)
    .lte("estimated_delivery_date", thirtyDaysFromNow.toISOString().split("T")[0])
    .gte("estimated_delivery_date", new Date().toISOString().split("T")[0])
    .in("shipment_status", ["pending", "in_transit", "out_for_delivery"]);

  if (error) {
    console.error("Error fetching shipments for calendar events:", error);
    return events;
  }

  if (!shipments || shipments.length === 0) {
    return events;
  }

  for (const shipment of shipments) {
    if (shipment.estimated_delivery_date) {
      const deliveryDate = new Date(shipment.estimated_delivery_date).toISOString().split("T")[0];

      events.push({
        event_type: "delivery_milestone",
        title: `Delivery Expected: ${shipment.tracking_number}`,
        description: `Shipment ${shipment.tracking_number} is expected to be delivered. Current status: ${shipment.shipment_status}`,
        event_date: deliveryDate,
        related_entity_type: "shipment",
        related_entity_id: shipment.id,
        is_all_day: true,
        distributor_id: shipment.distributor_id || undefined,
        status: "upcoming",
      });
    }
  }

  return events;
}

/**
 * Generate calendar events from marketing campaigns
 */
export async function generateEventsFromCampaigns(brandId: string): Promise<GeneratedEvent[]> {
  const supabase = createAdminClient();
  const events: GeneratedEvent[] = [];

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: campaigns, error } = await supabase
    .from("marketing_campaigns")
    .select("id, name, start_date, end_date, status")
    .eq("brand_id", brandId)
    .in("status", ["planned", "active"]);

  if (error) {
    console.error("Error fetching campaigns for calendar events:", error);
    return events;
  }

  if (!campaigns || campaigns.length === 0) {
    return events;
  }

  for (const campaign of campaigns) {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysOut = thirtyDaysFromNow.toISOString().split("T")[0];

    // Create campaign start event
    if (campaign.start_date && campaign.start_date >= today && campaign.start_date <= thirtyDaysOut) {
      events.push({
        event_type: "campaign_start",
        title: `Campaign Start: ${campaign.name}`,
        description: `Marketing campaign "${campaign.name}" starts today`,
        event_date: campaign.start_date,
        related_entity_type: "campaign",
        related_entity_id: campaign.id,
        is_all_day: true,
        status: "upcoming",
      });
    }

    // Create campaign end event
    if (campaign.end_date && campaign.end_date >= today && campaign.end_date <= thirtyDaysOut) {
      events.push({
        event_type: "campaign_end",
        title: `Campaign End: ${campaign.name}`,
        description: `Marketing campaign "${campaign.name}" ends today`,
        event_date: campaign.end_date,
        related_entity_type: "campaign",
        related_entity_id: campaign.id,
        is_all_day: true,
        status: "upcoming",
      });

      // Create POP upload due event (3 days after campaign end)
      const popDueDate = new Date(campaign.end_date);
      popDueDate.setDate(popDueDate.getDate() + 3);
      const popDueDateStr = popDueDate.toISOString().split("T")[0];

      if (popDueDateStr >= today && popDueDateStr <= thirtyDaysOut) {
        events.push({
          event_type: "pop_upload_due",
          title: `POP Upload Due: ${campaign.name}`,
          description: `Proof of performance documents are due for campaign "${campaign.name}"`,
          event_date: popDueDateStr,
          related_entity_type: "campaign",
          related_entity_id: campaign.id,
          is_all_day: true,
          status: "upcoming",
        });
      }
    }
  }

  return events;
}

/**
 * Generate calendar events from monthly distributor reports (compliance)
 */
export async function generateEventsFromReports(brandId: string): Promise<GeneratedEvent[]> {
  const supabase = createAdminClient();
  const events: GeneratedEvent[] = [];

  // Get all distributors for this brand
  const { data: distributors, error: distError } = await supabase
    .from("distributors")
    .select("id, name")
    .eq("brand_id", brandId)
    .eq("status", "active");

  if (distError || !distributors || distributors.length === 0) {
    return events;
  }

  // Generate compliance review events for the next 2 months
  const today = new Date();
  for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const reportDueDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 5); // Due on 5th of next month
    const reportDueDateStr = reportDueDate.toISOString().split("T")[0];

    // Only create if due date is in the future
    if (reportDueDate >= today) {
      for (const distributor of distributors) {
        events.push({
          event_type: "compliance_review",
          title: `Monthly Report Due: ${distributor.name}`,
          description: `Monthly distributor report for ${targetMonth.toLocaleString('default', { month: 'long', year: 'numeric' })} is due`,
          event_date: reportDueDateStr,
          related_entity_type: "distributor",
          related_entity_id: distributor.id,
          is_all_day: true,
          distributor_id: distributor.id,
          status: "upcoming",
        });
      }
    }
  }

  return events;
}

/**
 * Sync calendar events for a brand
 * Creates new events, updates existing ones, and marks cancelled events
 */
export async function syncCalendarEvents(
  brandId: string,
  eventTypes?: Array<CalendarEventType>
): Promise<{
  created: number;
  updated: number;
  cancelled: number;
}> {
  const supabase = createAdminClient();
  let created = 0;
  let updated = 0;
  let cancelled = 0;

  const allEvents: GeneratedEvent[] = [];

  // Generate events based on requested types (or all if not specified)
  const shouldGenerate = (type: CalendarEventType) => !eventTypes || eventTypes.includes(type);

  if (shouldGenerate("payment_due")) {
    const invoiceEvents = await generateEventsFromInvoices(brandId);
    allEvents.push(...invoiceEvents);
  }

  if (shouldGenerate("po_approval_due") || shouldGenerate("shipment_arrival") || shouldGenerate("backorder_review")) {
    const poEvents = await generateEventsFromPOs(brandId);
    allEvents.push(...poEvents);
  }

  if (shouldGenerate("delivery_milestone")) {
    const shipmentEvents = await generateEventsFromShipments(brandId);
    allEvents.push(...shipmentEvents);
  }

  if (shouldGenerate("campaign_start") || shouldGenerate("campaign_end") || shouldGenerate("pop_upload_due")) {
    const campaignEvents = await generateEventsFromCampaigns(brandId);
    allEvents.push(...campaignEvents);
  }

  if (shouldGenerate("compliance_review")) {
    const reportEvents = await generateEventsFromReports(brandId);
    allEvents.push(...reportEvents);
  }

  // Get existing auto-generated events for this brand (exclude custom events)
  const { data: existingEvents, error: existingError } = await supabase
    .from("calendar_events")
    .select("id, event_type, related_entity_type, related_entity_id, event_date, distributor_id, status")
    .eq("brand_id", brandId)
    .neq("event_type", "custom");

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
      distributor_id: event.distributor_id || null,
      status: event.status || "upcoming",
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
        distributor_id: event.distributor_id || null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating calendar event:", updateError);
    } else {
      updated++;
    }
  }

  // Mark events as cancelled for entities that no longer exist or are completed
  // (events remaining in existingEventsMap are no longer needed)
  const eventsToCancelIds: string[] = [];

  for (const event of existingEventsMap.values()) {
    let shouldCancel = false;

    if (event.related_entity_type === "invoice") {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, payment_status, due_date")
        .eq("id", event.related_entity_id)
        .maybeSingle();

      // Cancel if invoice is paid or due date passed
      if (!invoice || invoice.payment_status === "paid" || (invoice.due_date && new Date(invoice.due_date) < new Date())) {
        shouldCancel = true;
      }
    } else if (event.related_entity_type === "po") {
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("id, po_status, expected_delivery_date")
        .eq("id", event.related_entity_id)
        .maybeSingle();

      // Cancel if PO is cancelled, received, or delivery date passed
      if (!po || po.po_status === "cancelled" || po.po_status === "received" || 
          (po.expected_delivery_date && new Date(po.expected_delivery_date) < new Date())) {
        shouldCancel = true;
      }
    } else if (event.related_entity_type === "shipment") {
      const { data: shipment } = await supabase
        .from("shipments")
        .select("id, shipment_status")
        .eq("id", event.related_entity_id)
        .maybeSingle();

      // Cancel if shipment is delivered, failed, or returned
      if (!shipment || ["delivered", "failed", "returned"].includes(shipment.shipment_status)) {
        shouldCancel = true;
      }
    } else if (event.related_entity_type === "campaign") {
      const { data: campaign } = await supabase
        .from("marketing_campaigns")
        .select("id, status")
        .eq("id", event.related_entity_id)
        .maybeSingle();

      // Cancel if campaign is completed or cancelled
      if (!campaign || ["completed", "cancelled"].includes(campaign.status)) {
        shouldCancel = true;
      }
    }

    if (shouldCancel && event.status !== "cancelled") {
      eventsToCancelIds.push(event.id);
    }
  }

  // Update events to cancelled status instead of deleting
  if (eventsToCancelIds.length > 0) {
    const { error: cancelError } = await supabase
      .from("calendar_events")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .in("id", eventsToCancelIds);

    if (cancelError) {
      console.error("Error cancelling calendar events:", cancelError);
    } else {
      cancelled = eventsToCancelIds.length;
    }
  }

  return { created, updated, cancelled };
}
