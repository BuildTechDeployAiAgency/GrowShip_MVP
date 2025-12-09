#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function checkEnumValues() {
  console.log('🔍 Checking notification_type enum values\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Check the notifications table description to see the enum constraint
    console.log('🔍 Getting table schema information...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, udt_name')
      .eq('table_name', 'notifications')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.log('❌ Error getting table info:', tableError.message);
    } else {
      console.log('✅ Notifications table columns:');
      tableInfo.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.udt_name})`);
      });
    }
    
    // Also check what notification types exist in the notification_types table
    console.log('\n🔍 Checking notification_types table...');
    const { data: typeData, error: typeError } = await supabase
      .from('notification_types')
      .select('key, name, is_active')
      .order('key');
    
    if (typeError) {
      console.log('❌ Error getting notification types:', typeError.message);
    } else {
      console.log('✅ Available notification types:');
      typeData.forEach(type => {
        console.log(`   - ${type.key} (${type.name}) - Active: ${type.is_active}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkEnumValues().catch(console.error);