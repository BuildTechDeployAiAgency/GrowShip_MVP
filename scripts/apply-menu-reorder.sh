#!/bin/bash

# Script to apply menu reorganization
# This will update the sidebar menu order and hide Production/Financials

echo "🔄 Applying Menu Reorganization..."
echo ""
echo "This will:"
echo "  ✅ Reorder menu items as requested"
echo "  ✅ Hide Production and Financials menu items"
echo ""
echo "📋 You need to run this SQL in Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/runefgxmlbsegacjrvvu/sql/new"
echo ""
echo "================================================"
cat "$(dirname "$0")/../supabase_migrations/010_reorganize_menu_order.sql"
echo "================================================"
echo ""
echo "After running the SQL:"
echo "  1. Refresh your application (Cmd+R or Ctrl+R)"
echo "  2. The menu will show in the new order"
echo "  3. Production and Financials will be hidden"
echo ""

