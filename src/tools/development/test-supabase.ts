import { config } from 'dotenv';
config();

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { VectorDBSupabase } = require('../lib/vector-db-supabase');
const { supabase } = require('../lib/supabase');

async function testSupabase() {
  try {
    console.log('🧪 Testing Supabase connection...');

    // Test basic connection
    const { data, error } = await supabase
      .from('embeddings')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return;
    }

    console.log('✅ Supabase connection successful!');

    // Test VectorDB
    const vectorDB = new VectorDBSupabase();
    const count = await vectorDB.getDocumentCount();
    console.log(`📊 Found ${count} documents in database`);

    // Test search functionality with a proper text query
    console.log('🔍 Testing topic-based search with surrogacy query...');
    const surrogacyResults = await vectorDB.search('How do I become a surrogate mother?', 3);
    console.log(`🎯 Surrogacy query returned ${surrogacyResults.length} results`);

    // Test egg donor query
    console.log('🔍 Testing topic-based search with egg donor query...');
    const eggDonorResults = await vectorDB.search('What is the egg donation process?', 3);
    console.log(`🥚 Egg donor query returned ${eggDonorResults.length} results`);

    // Test general query
    console.log('🔍 Testing topic-based search with general query...');
    const generalResults = await vectorDB.search('What services do you offer?', 3);
    console.log(`🌐 General query returned ${generalResults.length} results`);

    console.log('🎉 All Supabase tests passed!');
  } catch (error) {
    console.error('❌ Supabase test failed:', error);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testSupabase();
}

export { testSupabase }; 