import { serviceFactory } from '../../shared/utils/helpers/service-factory';
import { SemanticVectorDB } from '../../shared/infrastructure/vector-store/semantic-vector-db';
import { VectorDB } from '../../shared/infrastructure/vector-store/vector-db';

const testQueries = [
  "I want to help someone have a baby",
  "What's the process for carrying a pregnancy?",
  "How much do I get paid for donating?",
  "What are the costs of surrogacy?",
  "How do I become a surrogate mother?",
  "What is the egg donation process?",
  "I'm interested in becoming an intended parent",
  "What services do you offer?",
  "How long does the surrogacy process take?",
  "What are the requirements for egg donors?"
];

async function testSemanticSearch() {
  console.log('🧪 Testing semantic search vs current system...');
  
  try {
    const semanticDB = new SemanticVectorDB();
    const currentDB = new VectorDB();
    
    const semanticCount = await semanticDB.getDocumentCount();
    const currentStats = await currentDB.getStats();
    
    console.log(`📊 Document counts:`);
    console.log(`   - Semantic system: ${semanticCount}`);
    console.log(`   - Current system: ${currentStats.documentCount}`);
    
    if (semanticCount === 0) {
      console.log('⚠️ No documents in semantic system, running migration first...');
      const { migrateToSemanticSearch } = require('../content-processing/migrateToSemanticSearch');
      await migrateToSemanticSearch();
    }
    
    console.log('\n🔍 Testing queries...\n');
    
    for (const query of testQueries) {
      console.log(`Query: "${query}"`);
      
      try {
        const semanticResults = await semanticDB.search(query, 3);
        const currentResults = await currentDB.search(query, 3);
        
        console.log(`   Semantic results: ${semanticResults.length}`);
        semanticResults.forEach((doc, i) => {
          console.log(`     ${i + 1}. ${doc.metadata.title || 'No title'}`);
        });
        
        console.log(`   Current results: ${currentResults.length}`);
        currentResults.forEach((doc, i) => {
          console.log(`     ${i + 1}. ${doc.metadata.title || 'No title'}`);
        });
        
        const semanticTitles = semanticResults.map(doc => doc.metadata.title || '');
        const currentTitles = currentResults.map(doc => doc.metadata.title || '');
        
        const overlap = semanticTitles.filter(title => currentTitles.includes(title)).length;
        const overlapPercentage = (overlap / Math.max(semanticResults.length, currentResults.length)) * 100;
        
        console.log(`   Overlap: ${overlap}/${Math.max(semanticResults.length, currentResults.length)} (${overlapPercentage.toFixed(1)}%)`);
        
      } catch (error) {
        console.error(`   ❌ Error testing query: ${error}`);
      }
      
      console.log('');
    }
    
    console.log('✅ Semantic search testing completed!');
    
  } catch (error) {
    console.error('❌ Testing failed:', error);
    throw error;
  }
}

if (require.main === module) {
  testSemanticSearch()
    .then(() => {
      console.log('✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test script failed:', error);
      process.exit(1);
    });
}

export { testSemanticSearch }; 