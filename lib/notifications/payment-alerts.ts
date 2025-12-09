/**
 * ============================================================================
 * PAYMENT ALERTS NOTIFICATION SERVICE
 * ============================================================================
 * Creates notifications for payment-related events using the role-based
 * NotificationDispatcher.
 * 
 * Notification Types:
 *   - payment_due_soon: Invoice due within 7 days
 */

import { createClient } from "@/lib/supabase/server";
import { NotificationDispatcher } from "./dispatcher";

/**
 * Check for invoices due soon and create payment reminders
 * Uses role-based dispatch for recipient resolution
 */
export async function checkPaymentDueAlerts(): Promise<{
  notificationsCreated: number;
}> {
  const supabase = await createClient();
  let notificationsCreated = 0;

  // Get invoices with due dates in the next 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const { data: dueInvoices, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, due_date, total_amount, brand_id, order_id")
    .eq("payment_status", "pending")
    .lte("due_date", sevenDaysFromNow.toISOString().split("T")[0])
    .gte("due_date", new Date().toISOString().split("T")[0]);

  if (error) {
    console.error("[checkPaymentDueAlerts] Error fetching invoices:", error);
    return { notificationsCreated: 0 };
  }

  if (!dueInvoices || dueInvoices.length === 0) {
    return { notificationsCreated: 0 };
  }

  // Process each invoice
  for (const invoice of dueInvoices) {
    // Check if we already sent a notification for this invoice recently (within 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: existingNotification } = await supabase
      .from("notifications")
      .select("id")
      .eq("related_entity_type", "invoice")
      .eq("related_entity_id", invoice.id)
      .gte("created_at", oneDayAgo.toISOString())
      .limit(1)
      .maybeSingle();

    // Skip if we already sent a notification recently
    if (existingNotification) {
      continue;
    }

    const daysUntilDue = Math.ceil(
      (new Date(invoice.due_date).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Determine priority based on days until due
    let priority: "low" | "medium" | "high" | "urgent";
    if (daysUntilDue <= 1) {
      priority = "urgent";
    } else if (daysUntilDue <= 3) {
      priority = "high";
    } else {
      priority = "medium";
    }

    // Dispatch using role-based system
    const result = await NotificationDispatcher.dispatch(
      "payment_due_soon",
      {
        title: "Payment Due Soon",
        message: `Invoice ${invoice.invoice_number} is due in ${daysUntilDue} day(s)`,
        brandId: invoice.brand_id,
        relatedEntityType: "invoice",
        relatedEntityId: invoice.id,
        priority,
        actionRequired: true,
        actionUrl: `/invoices/${invoice.id}`,
        expiresAt: invoice.due_date,
      }
    );

    if (result.success) {
      notificationsCreated += result.notificationsSent;
    } else {
      console.error(`[checkPaymentDueAlerts] Error for invoice ${invoice.invoice_number}:`, result.error);
    }
  }

  console.log(`[checkPaymentDueAlerts] Created ${notificationsCreated} payment notifications`);
  return { notificationsCreated };
}
