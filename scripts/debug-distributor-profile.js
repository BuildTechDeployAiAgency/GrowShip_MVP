#!/usr/bin/env node

/**
 * Debug script to check distributor admin profile and brand relationships
 * Run with: node scripts/debug-distributor-profile.js
 */

const { createClient } = require('@supabase/supabase-js');

async function debugDistributorProfile() {
  console.log('🕵️ Debugging Distributor Admin Profile\n');
  
  // Get environment variables
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
    // First, check what roles exist
    console.log('🔍 Checking existing user roles...');
    const { data: allRoles } = await supabase
      .from('user_profiles')
      .select('role_name')
      .not('role_name', 'is', null);
    
    if (allRoles) {
      const uniqueRoles = [...new Set(allRoles.map(r => r.role_name))];
      console.log('✅ Roles in system:', uniqueRoles);
    }
    
    // Find any distributor-related users
    console.log('\n🔍 Finding distributor users...');
    const { data: distributorUsers } = await supabase
      .from('user_profiles')
      .select('user_id, role_name, first_name, last_name, brand_id, distributor_id')
      .ilike('role_name', '%distributor%')
      .limit(10);
    
    if (!distributorUsers || distributorUsers.length === 0) {
      console.log('❌ No distributor users found');
      
      // Check if the specific user from console logs exists with any role
      console.log('\n🔍 Checking specific user from console logs...');
      const { data: specificUser } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', '183fae76-a2e4-415c-bac3-ef932bbadc03')
        .single();
      
      if (specificUser) {
        console.log('✅ Found user with role:', specificUser.role_name);
        console.log('   Brand ID:', specificUser.brand_id || 'NULL');
        console.log('   Distributor ID:', specificUser.distributor_id || 'NULL');
      } else {
        console.log('❌ Specific user not found either');
      }
      return;
    }
    
    console.log(`✅ Found ${distributorUsers.length} distributor user(s)`);
    distributorUsers.forEach((user, i) => {
      console.log(`   ${i+1}. ${user.first_name} ${user.last_name} (${user.role_name}) - ${user.user_id}`);
    });
    
    // Use the first distributor user found
    const distributorUserId = distributorUsers[0].user_id;
    
    console.log('🔍 Checking distributor admin profile...');
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', distributorUserId)
      .single();
    
    if (!profile) {
      console.log('❌ Profile not found');
      return;
    }
    
    console.log('✅ Profile found:');
    console.log('   Role:', profile.role_name);
    console.log('   Brand ID:', profile.brand_id || 'NULL');
    console.log('   Distributor ID:', profile.distributor_id || 'NULL');
    console.log('   Parent Brand ID:', profile.parent_brand_id || 'NULL');
    
    // Get user memberships
    console.log('\n🔍 Checking user memberships...');
    const { data: memberships } = await supabase
      .from('user_memberships')
      .select(`
        *,
        brands!inner(id, name, organization_type, is_active, created_at)
      `)
      .eq('user_id', distributorUserId)
      .eq('is_active', true);
    
    if (memberships && memberships.length > 0) {
      console.log(`✅ Found ${memberships.length} active membership(s):`);
      memberships.forEach(membership => {
        console.log(`   - Brand: ${membership.brands.name} (${membership.brands.id})`);
        console.log(`     Type: ${membership.brands.organization_type}`);
        console.log(`     Active: ${membership.brands.is_active}`);
      });
    } else {
      console.log('❌ No active memberships found');
    }
    
    // Get distributor details
    if (profile.distributor_id) {
      console.log('\n🔍 Checking distributor details...');
      const { data: distributor } = await supabase
        .from('distributors')
        .select('*')
        .eq('id', profile.distributor_id)
        .single();
      
      if (distributor) {
        console.log('✅ Distributor found:');
        console.log('   Name:', distributor.name || distributor.company_name || 'N/A');
        console.log('   ID:', distributor.id);
        console.log('   Parent Brand:', distributor.parent_brand_id || 'NULL');
      }
    }
    
    // Determine what brand_id should be used for notifications
    console.log('\n🧠 Brand ID Logic Analysis:');
    
    let notificationBrandId = null;
    
    if (profile.brand_id) {
      notificationBrandId = profile.brand_id;
      console.log(`   Using direct brand_id from profile: ${notificationBrandId}`);
    } else if (profile.parent_brand_id) {
      notificationBrandId = profile.parent_brand_id;
      console.log(`   Using parent_brand_id from profile: ${notificationBrandId}`);
    } else if (memberships && memberships.length > 0) {
      // Find a brand-type membership
      const brandMembership = memberships.find(m => m.brands.organization_type === 'brand');
      if (brandMembership) {
        notificationBrandId = brandMembership.brands.id;
        console.log(`   Using brand from membership: ${notificationBrandId} (${brandMembership.brands.name})`);
      }
    }
    
    if (!notificationBrandId) {
      console.log('   ❌ NO BRAND ID FOUND - This explains missing notifications!');
      console.log('   🔧 SOLUTION: The distributor needs to be linked to a brand');
    } else {
      console.log(`   ✅ Notification brand ID determined: ${notificationBrandId}`);
      
      // Check if brand has admin users to notify
      console.log('\n🔍 Checking brand admin users for notifications...');
      const { data: brandAdmins } = await supabase
        .from('user_profiles')
        .select('user_id, role_name, first_name, last_name')
        .eq('brand_id', notificationBrandId)
        .in('role_name', ['brand_admin', 'brand_manager', 'super_admin'])
        .eq('user_status', 'approved');
      
      if (brandAdmins && brandAdmins.length > 0) {
        console.log(`✅ Found ${brandAdmins.length} brand admin(s) to notify:`);
        brandAdmins.forEach(admin => {
          console.log(`   - ${admin.first_name} ${admin.last_name} (${admin.role_name})`);
        });
      } else {
        console.log('❌ No brand admins found to receive notifications!');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugDistributorProfile().catch(console.error);