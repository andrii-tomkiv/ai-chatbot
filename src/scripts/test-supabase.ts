import { config } from 'dotenv';
config();

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Import after env is loaded
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

    // Test search functionality
    const testEmbedding = new Array(1024).fill(0.1); // Mock embedding
    const results = await vectorDB.search(testEmbedding);
    console.log(`🔍 Search test returned ${results.length} results`);

    console.log('🎉 All Supabase tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testSupabase();
}

export { testSupabase }; 