#!/usr/bin/env node

/**
 * Debug script to check why super admin is not receiving PO approval notifications
 * Run with: node debug-po-notifications.js
 */

const { createClient } = require('@supabase/supabase-js');

async function debugPONotifications() {
  console.log('🔧 Debugging PO Approval Notifications for Super Admin\n');
  
  // Check environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    console.log('Run: source .env.local && node debug-po-notifications.js');
    return;
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Step 1: Check for super admin users
    console.log('🔍 Step 1: Checking for super admin users...');
    const { data: superAdmins, error: adminError } = await supabase
      .from('user_profiles')
      .select('user_id, email, role_name, user_status, brand_id')
      .eq('role_name', 'super_admin');
    
    if (adminError) {
      console.error('❌ Error querying super admins:', adminError.message);
      return;
    }
    
    if (!superAdmins || superAdmins.length === 0) {
      console.log('❌ No super admin users found!');
      console.log('   This explains why notifications are not being sent.');
      console.log('   Super admin users need to be created first.\n');
      
      console.log('🔧 To create a super admin:');
      console.log('   1. Sign up with a new email');
      console.log('   2. Update user_profiles table:');
      console.log('      UPDATE user_profiles SET role_name = \'super_admin\', user_status = \'approved\' WHERE email = \'admin@example.com\';');
      return;
    }
    
    console.log(`✅ Found ${superAdmins.length} super admin(s):`);
    superAdmins.forEach(admin => {
      console.log(`   - ${admin.email} - Status: ${admin.user_status}`);
    });
    
    // Step 2: Check notification type configuration
    console.log('\n🔍 Step 2: Checking PO approval notification configuration...');
    const { data: notificationType, error: typeError } = await supabase
      .from('notification_types')
      .select('id, key, name, is_active')
      .eq('key', 'po_approval_required')
      .single();
    
    if (typeError || !notificationType) {
      console.log('❌ PO approval notification type not found');
      return;
    }
    
    console.log(`✅ Notification type: ${notificationType.name} - Active: ${notificationType.is_active}`);
    
    // Step 3: Check role settings
    console.log('\n🔍 Step 3: Checking super admin role settings...');
    const { data: roleSettings, error: roleError } = await supabase
      .from('notification_role_settings')
      .select('role, is_enabled, frequency, channels')
      .eq('notification_type_id', notificationType.id)
      .eq('role', 'super_admin');
    
    if (roleError || !roleSettings || roleSettings.length === 0) {
      console.log('❌ No role settings found for super_admin and po_approval_required');
      console.log('   Creating default settings...');
      
      const { error: insertError } = await supabase
        .from('notification_role_settings')
        .insert({
          notification_type_id: notificationType.id,
          role: 'super_admin',
          is_enabled: true,
          frequency: 'instant',
          channels: ['in_app']
        });
      
      if (insertError) {
        console.log('❌ Failed to create role settings:', insertError.message);
      } else {
        console.log('✅ Created super_admin role settings for po_approval_required');
      }
    } else {
      const setting = roleSettings[0];
      console.log(`✅ Super admin role settings:`);
      console.log(`   - Enabled: ${setting.is_enabled}`);
      console.log(`   - Frequency: ${setting.frequency}`);
      console.log(`   - Channels: ${JSON.stringify(setting.channels)}`);
    }
    
    // Step 4: Check recent notifications
    console.log('\n🔍 Step 4: Checking recent PO approval notifications...');
    const { data: recentNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, message, created_at, is_read')
      .eq('type', 'po_approval_required')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (notifError) {
      console.log('❌ Error fetching recent notifications:', notifError.message);
    } else if (!recentNotifications || recentNotifications.length === 0) {
      console.log('❌ No recent po_approval_required notifications found');
      console.log('   This means notifications are not being created at all.');
    } else {
      console.log(`📋 Found ${recentNotifications.length} recent notifications:`);
      recentNotifications.forEach(notif => {
        const date = new Date(notif.created_at).toLocaleString();
        console.log(`   - ${date}: ${notif.title} (User: ${notif.user_id}, Read: ${notif.is_read})`);
      });
    }
    
    // Step 5: Test notification creation process
    console.log('\n🔍 Step 5: Testing notification creation with sample data...');
    
    // Find any existing PO for testing
    const { data: testPO } = await supabase
      .from('purchase_orders')
      .select('id, po_number, brand_id, user_id')
      .limit(1)
      .single();
    
    if (testPO) {
      console.log(`📋 Using test PO: ${testPO.po_number} (ID: ${testPO.id})`);
      
      // Check what users would be notified
      const approvedSuperAdmins = superAdmins.filter(admin => admin.user_status === 'approved');
      console.log(`📊 Super admins that should receive notifications: ${approvedSuperAdmins.length}`);
      
      if (approvedSuperAdmins.length === 0) {
        console.log('❌ No approved super admin users!');
        console.log('   Make sure at least one super admin has user_status = "approved"');
      } else {
        approvedSuperAdmins.forEach(admin => {
          console.log(`   - ${admin.email} (Status: ${admin.user_status})`);
        });
      }
    } else {
      console.log('❌ No purchase orders found to test with');
    }
    
    console.log('\n🎯 Summary:');
    console.log('   1. Check that at least one super admin exists and is approved');
    console.log('   2. Verify notification type is active');
    console.log('   3. Ensure role settings are enabled for super_admin');
    console.log('   4. Test by creating a new PO or changing PO status');
    console.log('   5. Check browser console for NotificationDispatcher logs');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPONotifications().catch(console.error);