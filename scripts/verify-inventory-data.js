/**
 * Inventory Data Verification Script
 * 
 * This script checks the consistency of inventory data in the database:
 * - Verifies products have inventory fields populated
 * - Checks inventory_transactions are properly linked to products
 * - Reports any data inconsistencies
 * 
 * Usage: node scripts/verify-inventory-data.js
 * 
 * Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

const { createClient } = require("@supabase/supabase-js");

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  console.log("Please set these variables before running this script.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyInventoryData() {
  console.log("🔍 Starting Inventory Data Verification...\n");
  
  const issues = [];
  const warnings = [];
  const stats = {
    totalProducts: 0,
    activeProducts: 0,
    productsWithInventory: 0,
    productsWithoutInventory: 0,
    totalTransactions: 0,
    orphanedTransactions: 0,
    productsWithMissingThresholds: 0,
  };

  // 1. Check products table
  console.log("📦 Checking products table...");
  
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(`
      id,
      sku,
      product_name,
      brand_id,
      status,
      quantity_in_stock,
      allocated_stock,
      inbound_stock,
      available_stock,
      low_stock_threshold,
      critical_stock_threshold,
      enable_stock_alerts
    `);

  if (productsError) {
    console.error("❌ Error fetching products:", productsError.message);
    process.exit(1);
  }

  stats.totalProducts = products.length;
  stats.activeProducts = products.filter(p => p.status === "active").length;

  console.log(`   Found ${stats.totalProducts} products (${stats.activeProducts} active)\n`);

  // 2. Check inventory fields
  console.log("📊 Checking inventory fields...");

  for (const product of products) {
    const hasQuantity = product.quantity_in_stock !== null && product.quantity_in_stock !== undefined;
    const hasAllocated = product.allocated_stock !== null;
    const hasInbound = product.inbound_stock !== null;
    
    if (hasQuantity || hasAllocated || hasInbound) {
      stats.productsWithInventory++;
    } else {
      stats.productsWithoutInventory++;
    }

    // Check thresholds for active products
    if (product.status === "active") {
      const hasLowThreshold = product.low_stock_threshold !== null && product.low_stock_threshold > 0;
      const hasCriticalThreshold = product.critical_stock_threshold !== null && product.critical_stock_threshold > 0;
      
      if (!hasLowThreshold && !hasCriticalThreshold) {
        stats.productsWithMissingThresholds++;
        warnings.push({
          type: "missing_thresholds",
          product_id: product.id,
          sku: product.sku,
          message: `Product "${product.sku}" (${product.product_name}) has no stock thresholds set`
        });
      }
    }

    // Check for negative values
    if (product.quantity_in_stock < 0) {
      issues.push({
        type: "negative_stock",
        product_id: product.id,
        sku: product.sku,
        message: `Product "${product.sku}" has negative quantity_in_stock: ${product.quantity_in_stock}`
      });
    }

    if (product.allocated_stock < 0) {
      issues.push({
        type: "negative_allocated",
        product_id: product.id,
        sku: product.sku,
        message: `Product "${product.sku}" has negative allocated_stock: ${product.allocated_stock}`
      });
    }
  }

  console.log(`   Products with inventory data: ${stats.productsWithInventory}`);
  console.log(`   Products without inventory data: ${stats.productsWithoutInventory}`);
  console.log(`   Active products missing thresholds: ${stats.productsWithMissingThresholds}\n`);

  // 3. Check inventory_transactions table
  console.log("📋 Checking inventory_transactions table...");

  const { data: transactions, error: transactionsError, count: txCount } = await supabase
    .from("inventory_transactions")
    .select("id, product_id, sku, product_name, transaction_type, quantity_change", { count: "exact" });

  if (transactionsError) {
    console.error("❌ Error fetching transactions:", transactionsError.message);
    // Continue with other checks
  } else {
    stats.totalTransactions = txCount || transactions.length;
    console.log(`   Found ${stats.totalTransactions} inventory transactions\n`);

    // 4. Check for orphaned transactions (transactions without matching products)
    console.log("🔗 Checking for orphaned transactions...");
    
    const productIds = new Set(products.map(p => p.id));
    
    for (const tx of transactions || []) {
      if (tx.product_id && !productIds.has(tx.product_id)) {
        stats.orphanedTransactions++;
        issues.push({
          type: "orphaned_transaction",
          transaction_id: tx.id,
          product_id: tx.product_id,
          sku: tx.sku,
          message: `Transaction for "${tx.sku}" references non-existent product_id: ${tx.product_id}`
        });
      }
    }

    console.log(`   Orphaned transactions: ${stats.orphanedTransactions}\n`);
  }

  // 5. Print summary
  console.log("═══════════════════════════════════════════════════════");
  console.log("                    VERIFICATION SUMMARY");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log("📊 Statistics:");
  console.log(`   Total Products: ${stats.totalProducts}`);
  console.log(`   Active Products: ${stats.activeProducts}`);
  console.log(`   Products with Inventory: ${stats.productsWithInventory}`);
  console.log(`   Total Transactions: ${stats.totalTransactions}`);
  console.log("");

  if (issues.length === 0 && warnings.length === 0) {
    console.log("✅ All checks passed! No issues found.\n");
  } else {
    if (issues.length > 0) {
      console.log(`❌ Found ${issues.length} issue(s):\n`);
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. [${issue.type}] ${issue.message}`);
      });
      console.log("");
    }

    if (warnings.length > 0) {
      console.log(`⚠️  Found ${warnings.length} warning(s):\n`);
      warnings.slice(0, 10).forEach((warning, idx) => {
        console.log(`   ${idx + 1}. [${warning.type}] ${warning.message}`);
      });
      if (warnings.length > 10) {
        console.log(`   ... and ${warnings.length - 10} more warnings`);
      }
      console.log("");
    }
  }

  // 6. Provide recommendations
  if (stats.productsWithMissingThresholds > 0) {
    console.log("📌 Recommendations:");
    console.log("   - Set low_stock_threshold and critical_stock_threshold for active products");
    console.log("   - Consider running the following SQL to set default thresholds:");
    console.log("");
    console.log("   UPDATE products");
    console.log("   SET low_stock_threshold = COALESCE(reorder_level, 10),");
    console.log("       critical_stock_threshold = GREATEST(FLOOR(COALESCE(reorder_level, 10) * 0.5), 1)");
    console.log("   WHERE status = 'active'");
    console.log("     AND (low_stock_threshold IS NULL OR low_stock_threshold = 0);");
    console.log("");
  }

  if (stats.orphanedTransactions > 0) {
    console.log("📌 To fix orphaned transactions:");
    console.log("   - Review the inventory_transactions table for records with invalid product_id");
    console.log("   - Either delete orphaned records or reassign them to valid products");
    console.log("");
  }

  console.log("═══════════════════════════════════════════════════════\n");
  
  // Return exit code based on issues
  return issues.length > 0 ? 1 : 0;
}

// Run verification
verifyInventoryData()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(err => {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  });

