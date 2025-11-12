import { createClient } from "@/lib/supabase/server";
import { createNotification } from "./alert-generator";

export async function checkPaymentDueAlerts(): Promise<void> {
  const supabase = await createClient();

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
    console.error("Error checking payment due alerts:", error);
    return;
  }

  if (!dueInvoices || dueInvoices.length === 0) {
    return;
  }

  // Get users for each brand
  for (const invoice of dueInvoices) {
    const { data: users } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("brand_id", invoice.brand_id)
      .eq("status", "approved");

    if (!users || users.length === 0) continue;

    const daysUntilDue = Math.ceil(
      (new Date(invoice.due_date).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    for (const user of users) {
      await createNotification({
        user_id: user.user_id,
        type: "payment",
        title: "Payment Due Soon",
        message: `Invoice ${invoice.invoice_number} is due in ${daysUntilDue} day(s)`,
        brand_id: invoice.brand_id,
        related_entity_type: "invoice",
        related_entity_id: invoice.id,
        priority: daysUntilDue <= 1 ? "urgent" : daysUntilDue <= 3 ? "high" : "medium",
        action_required: true,
        action_url: `/invoices/${invoice.id}`,
        expires_at: invoice.due_date,
      });
    }
  }
}


