#!/usr/bin/env node

/**
 * Test script to verify PO notification system after schema fix
 * Run with: node scripts/test-po-notification-fix.js
 */

const { createClient } = require('@supabase/supabase-js');

async function testPONotificationSystem() {
  console.log('🧪 Testing PO Notification System After Schema Fix\n');
  
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    console.log('Run: source .env.local && node scripts/test-po-notification-fix.js');
    return;
  }
  
  // Create admin client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('✅ Connected to Supabase');
  
  try {
    // Test 1: Check notifications table schema
    console.log('\n🔍 Test 1: Checking notifications table schema...');
    
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, character_maximum_length')
      .eq('table_name', 'notifications')
      .eq('column_name', 'type');
    
    if (schemaError || !schemaInfo || schemaInfo.length === 0) {
      console.log('❌ Could not check notifications table schema');
      return;
    }
    
    console.log(`✅ notifications.type column: ${schemaInfo[0].data_type} (max_length: ${schemaInfo[0].character_maximum_length})`);
    
    // Test 2: Try to create a test notification
    console.log('\n🔍 Test 2: Creating test notification...');
    
    // Get a test user (super admin)
    const { data: testUser } = await supabase
      .from('user_profiles')
      .select('user_id, role_name, brand_id')
      .eq('role_name', 'super_admin')
      .eq('user_status', 'approved')
      .limit(1)
      .single();
    
    if (!testUser) {
      console.log('❌ No super_admin user found for testing');
      return;
    }
    
    console.log(`✅ Found test user: ${testUser.role_name}`);
    
    // Create a test notification with po_approval_required type
    const testNotification = {
      user_id: testUser.user_id,
      type: 'po_approval_required',
      title: 'Test PO Approval Required',
      message: 'This is a test notification for PO approval',
      brand_id: testUser.brand_id,
      priority: 'high',
      action_required: true,
      action_url: '/purchase-orders/test-123',
      is_read: false
    };
    
    const { data: newNotification, error: insertError } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Failed to create test notification:');
      console.log('   Error:', insertError.message);
      console.log('   This indicates the schema fix is still needed');
      return;
    }
    
    console.log('✅ Successfully created test notification');
    console.log(`   ID: ${newNotification.id}`);
    console.log(`   Type: ${newNotification.type}`);
    
    // Test 3: Check notification_types configuration
    console.log('\n🔍 Test 3: Checking notification_types configuration...');
    
    const { data: notificationType } = await supabase
      .from('notification_types')
      .select('id, key, name, is_active')
      .eq('key', 'po_approval_required')
      .single();
    
    if (!notificationType) {
      console.log('❌ po_approval_required type not found in notification_types');
      return;
    }
    
    console.log(`✅ Found notification type: ${notificationType.name}`);
    console.log(`   Active: ${notificationType.is_active}`);
    
    // Test 4: Check role settings
    console.log('\n🔍 Test 4: Checking role settings...');
    
    const { data: roleSettings } = await supabase
      .from('notification_role_settings')
      .select('role, is_enabled, frequency')
      .eq('notification_type_id', notificationType.id)
      .eq('role', 'super_admin');
    
    if (!roleSettings || roleSettings.length === 0) {
      console.log('❌ No role settings found for super_admin and po_approval_required');
      return;
    }
    
    console.log('✅ Role settings for super_admin:');
    roleSettings.forEach(setting => {
      console.log(`   - ${setting.role}: enabled=${setting.is_enabled}, frequency=${setting.frequency}`);
    });
    
    // Test 5: Clean up test notification
    console.log('\n🔍 Test 5: Cleaning up test notification...');
    
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', newNotification.id);
    
    if (deleteError) {
      console.log('⚠️ Could not clean up test notification (not critical)');
    } else {
      console.log('✅ Test notification cleaned up');
    }
    
    console.log('\n🎉 All tests passed!');
    console.log('\n📋 What this means:');
    console.log('   ✅ Database schema supports new notification types');
    console.log('   ✅ po_approval_required notifications can be created');
    console.log('   ✅ Super admin role is properly configured');
    console.log('   ✅ Notification system should work for PO approvals');
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Create a new purchase order');
    console.log('   2. Check super admin notifications in the UI');
    console.log('   3. Look for console logs in the PO API routes');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\nThis suggests the database schema migration needs to be applied.');
    console.log('Please run the migration: 20251211_fix_notifications_type_column.sql');
  }
}

testPONotificationSystem().catch(console.error);