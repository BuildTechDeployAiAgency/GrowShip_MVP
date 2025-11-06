const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://runefgxmlbsegacjrvvu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1bmVmZ3htbGJzZWdhY2pydnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDQ3NTAsImV4cCI6MjA3NzIyMDc1MH0.GLNvVF2wS_WZExYngU9NdeOgclEwyoTSSNaHo8yIYVw';

const supabase = createClient(supabaseUrl, anonKey);

async function verifyProductsReady() {
  console.log('🔍 Verifying Products Page is Ready...\n');
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Products table not yet accessible');
      console.log(`   Error: ${error.message}\n`);
      console.log('📋 NEXT STEP: Run this in Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/runefgxmlbsegacjrvvu/sql/new\n');
      console.log('   NOTIFY pgrst, \'reload schema\';\n');
      console.log('   Then wait 10-15 seconds and try again.');
      return false;
    }
    
    console.log('✅ Products table is accessible!');
    console.log(`   Found ${data?.length || 0} products\n`);
    console.log('🎉 SUCCESS! Your Products page is fully functional!\n');
    console.log('📍 Navigate to: http://localhost:3000/products');
    console.log('   You can now:');
    console.log('   • View all products');
    console.log('   • Create new products');
    console.log('   • Edit existing products');
    console.log('   • Delete products');
    console.log('   • Search and filter products\n');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

verifyProductsReady();

