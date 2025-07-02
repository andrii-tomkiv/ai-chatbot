#!/usr/bin/env tsx

import { VectorDB } from '../src/lib/vector-db';

async function testHybridVectorDB() {
  console.log('🧪 Testing Hybrid VectorDB...');
  
  const vectorDB = new VectorDB();
  
  // Test stats
  console.log('\n📊 Getting VectorDB stats...');
  try {
    const stats = await vectorDB.getStats();
    console.log('✅ Stats:', stats);
  } catch (error) {
    console.error('❌ Error getting stats:', error);
  }
  
  // Test search
  console.log('\n🔍 Testing search functionality...');
  try {
    const results = await vectorDB.search('What are the requirements to become a surrogate?', 3);
    console.log(`✅ Search results: ${results.length} documents found`);
    results.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.metadata?.title || 'No title'}`);
    });
  } catch (error) {
    console.error('❌ Error searching:', error);
  }
  
  // Test sample export
  console.log('\n📋 Testing sample export...');
  try {
    const sample = await vectorDB.exportSample();
    console.log(`✅ Sample export: ${sample.total} total documents, ${sample.sample.length} in sample`);
    console.log(`   Storage type: ${sample.storageType}`);
  } catch (error) {
    console.error('❌ Error exporting sample:', error);
  }
  
  console.log('\n🎉 Hybrid VectorDB test completed!');
}

// Run the test
testHybridVectorDB().catch(console.error); 