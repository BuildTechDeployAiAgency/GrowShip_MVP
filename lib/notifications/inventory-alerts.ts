import { createClient } from "@/lib/supabase/server";
import { createNotificationsForBrand } from "./alert-generator";

export async function checkInventoryAlerts(brandId: string): Promise<void> {
  const supabase = await createClient();

  // Get low stock products
  const { data: lowStockProducts, error } = await supabase.rpc(
    "get_low_stock_products",
    { p_brand_id: brandId }
  );

  if (error) {
    console.error("Error checking inventory alerts:", error);
    return;
  }

  if (!lowStockProducts || lowStockProducts.length === 0) {
    return;
  }

  // Create alerts for out-of-stock items
  const outOfStockItems = lowStockProducts.filter(
    (p: any) => p.quantity_in_stock === 0
  );

  if (outOfStockItems.length > 0) {
    await createNotificationsForBrand(
      {
        type: "warning",
        title: "Out of Stock Alert",
        message: `${outOfStockItems.length} product(s) are out of stock`,
        related_entity_type: "inventory",
        priority: "high",
        action_required: true,
        action_url: "/inventory",
      },
      brandId
    );
  }

  // Create alerts for low stock items
  const lowStockItems = lowStockProducts.filter(
    (p: any) => p.quantity_in_stock > 0 && p.quantity_in_stock <= p.reorder_level
  );

  if (lowStockItems.length > 0) {
    await createNotificationsForBrand(
      {
        type: "warning",
        title: "Low Stock Alert",
        message: `${lowStockItems.length} product(s) are below reorder level`,
        related_entity_type: "inventory",
        priority: "medium",
        action_required: true,
        action_url: "/inventory",
      },
      brandId
    );
  }
}


