#!/usr/bin/env node

/**
 * Test PO notification creation directly
 */

const { createClient } = require('@supabase/supabase-js');

async function testPONotification() {
  console.log('🧪 Testing PO Notification Creation\n');
  
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
    // Get a super admin user
    const { data: superAdmin } = await supabase
      .from('user_profiles')
      .select('user_id, email')
      .eq('role_name', 'super_admin')
      .eq('user_status', 'approved')
      .limit(1)
      .single();
    
    if (!superAdmin) {
      console.log('❌ No approved super admin found');
      return;
    }
    
    console.log(`📋 Testing notification for: ${superAdmin.email}`);
    
    // Get a real PO ID for testing
    const { data: testPO } = await supabase
      .from('purchase_orders')
      .select('id, brand_id')
      .limit(1)
      .single();
    
    if (!testPO) {
      console.log('❌ No purchase order found for testing');
      return;
    }
    
    // Try to create a test notification
    const testNotification = {
      user_id: superAdmin.user_id,
      type: 'po_approval_required',
      title: 'Test PO Approval Notification',
      message: 'This is a test notification to verify the system is working',
      brand_id: testPO.brand_id,
      related_entity_type: 'po',
      related_entity_id: testPO.id,
      priority: 'high',
      action_required: true,
      action_url: `/purchase-orders/${testPO.id}`,
      is_read: false
    };
    
    console.log('🔧 Attempting to create notification...');
    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select();
    
    if (error) {
      console.log('❌ Failed to create notification:', error.message);
      console.log('Error details:', error);
      
      console.log('\n🔧 Checking current enum values...');
      const { data: enumData, error: enumError } = await supabase
        .rpc('sql', { 
          query: `SELECT e.enumlabel 
                  FROM pg_type t 
                  JOIN pg_enum e ON t.oid = e.enumtypid 
                  WHERE t.typname = 'notification_type' 
                  ORDER BY e.enumsortorder` 
        });
      
      if (enumError) {
        console.log('❌ Could not get enum values:', enumError.message);
      } else {
        console.log('✅ Current enum values:', enumData);
      }
    } else {
      console.log('✅ Notification created successfully:', data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPONotification().catch(console.error);