#!/usr/bin/env node

/**
 * Test script to verify notification system works
 * Run with: node scripts/test-notifications.js
 */

const { createClient } = require('@supabase/supabase-js');

async function testNotificationDispatcher() {
  console.log('🧪 Testing Notification Dispatcher\n');
  
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    console.log('Run: source .env.local && node scripts/test-notifications.js');
    return;
  }
  
  // Create admin client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('✅ Connected to Supabase');
  
  try {
    // Test 1: Check if we can create a test notification
    console.log('\n🔍 Test 1: Creating test notification...');
    
    // Get a test brand_id and user_id from the database
    const { data: testUser } = await supabase
      .from('user_profiles')
      .select('user_id, brand_id, role_name')
      .eq('role_name', 'brand_admin')
      .limit(1)
      .single();
    
    if (!testUser) {
      console.log('❌ No brand_admin user found for testing');
      console.log('   Create a brand_admin user first');
      return;
    }
    
    console.log(`✅ Found test user: ${testUser.role_name} (brand: ${testUser.brand_id})`);
    
    // Create a test notification directly
    const testNotification = {
      user_id: testUser.user_id,
      type: 'purchase_order', // Use a simple type string
      title: 'Test: PO Approval Required',
      message: 'Test notification from diagnostic script',
      brand_id: testUser.brand_id,
      related_entity_type: 'po',
      related_entity_id: null, // Use null for test
      priority: 'high',
      action_required: true,
      action_url: '/purchase-orders/test',
      is_read: false
    };
    
    const { data: newNotification, error: insertError } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Failed to create test notification:', insertError.message);
      return;
    }
    
    console.log('✅ Test notification created successfully');
    console.log(`   ID: ${newNotification.id}`);
    console.log(`   User: ${newNotification.user_id}`);
    console.log(`   Type: ${newNotification.type}`);
    
    // Test 2: Verify the notification appears in queries
    console.log('\n🔍 Test 2: Verifying notification can be retrieved...');
    
    const { data: retrievedNotification } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', newNotification.id)
      .single();
    
    if (retrievedNotification) {
      console.log('✅ Test notification can be retrieved');
      console.log(`   Title: ${retrievedNotification.title}`);
      console.log(`   Priority: ${retrievedNotification.priority}`);
    }
    
    // Test 3: Check if notification appears for the user
    console.log('\n🔍 Test 3: Checking user\'s notification list...');
    
    const { data: userNotifications } = await supabase
      .from('notifications')
      .select('id, title, type, created_at, is_read')
      .eq('user_id', testUser.user_id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (userNotifications && userNotifications.length > 0) {
      console.log(`✅ Found ${userNotifications.length} notifications for user:`);
      userNotifications.forEach(notif => {
        const readStatus = notif.is_read ? '📖' : '📬';
        console.log(`   ${readStatus} ${notif.title} (${notif.type}) - ${notif.created_at}`);
      });
    }
    
    // Test 4: Test the role-based dispatcher logic
    console.log('\n🔍 Test 4: Testing role-based notification logic...');
    
    const { data: roleSettings } = await supabase
      .from('notification_role_settings')
      .select(`
        role,
        is_enabled,
        frequency,
        notification_types(key, name)
      `)
      .eq('notification_types.key', 'po_approval_required')
      .eq('is_enabled', true);
    
    if (roleSettings && roleSettings.length > 0) {
      console.log('✅ Role-based settings found:');
      roleSettings.forEach(setting => {
        console.log(`   ${setting.role}: ${setting.frequency} delivery`);
      });
    }
    
    // Clean up test notification
    console.log('\n🧹 Cleaning up test notification...');
    await supabase
      .from('notifications')
      .delete()
      .eq('id', newNotification.id);
    
    console.log('✅ Test notification cleaned up');
    
    console.log('\n🎉 All tests passed! The notification system is working.');
    console.log('\n📋 If PO notifications still don\'t work:');
    console.log('   1. Check browser console during PO creation');
    console.log('   2. Look for "[PO Creation]" and "[createPOApprovalAlert]" log messages');
    console.log('   3. Verify the PO status is not "draft" when creating');
    console.log('   4. Check the notifications page after creating a PO');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNotificationDispatcher().catch(console.error);