import { serviceFactory } from '../../shared/utils/helpers/service-factory';
import { SemanticVectorDB } from '../../shared/infrastructure/vector-store/semantic-vector-db';
import { VectorDB } from '../../shared/infrastructure/vector-store/vector-db';
import * as fs from 'fs';
import * as path from 'path';

async function migrateToSemanticSearch() {
  console.log('🚀 Starting migration to semantic search...');
  
  try {
    const currentDB = new VectorDB();
    const semanticDB = new SemanticVectorDB();
    
    const currentStats = await currentDB.getStats();
    console.log(`📊 Current system has ${currentStats.documentCount} documents`);
    
    if (currentStats.documentCount === 0) {
      console.log('⚠️ No documents to migrate');
      return;
    }
    
    const currentDocuments = (currentDB as any).loadDocuments();
    console.log(`📚 Loaded ${currentDocuments.length} documents from current system`);
    
    const semanticDocuments = currentDocuments.map((doc: any) => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata,
      embedding: doc.embedding
    }));
    
    const chunks = semanticDocuments.map((doc: any) => ({
      id: doc.metadata.id as string,
      content: doc.pageContent,
      url: doc.metadata.url as string,
      metadata: {
        title: doc.metadata.title as string,
        type: doc.metadata.type as string
      }
    }));
    
    const embeddings = semanticDocuments.map((doc: any) => doc.embedding);
    
    await semanticDB.addContent(chunks, embeddings);
    
    const semanticCount = await semanticDB.getDocumentCount();
    console.log(`✅ Migration completed: ${semanticCount} documents in semantic system`);
    
    console.log('🔧 Enabling semantic search...');
    process.env.USE_SEMANTIC_SEARCH = 'true';
    
    console.log('🎉 Migration to semantic search completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateToSemanticSearch()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateToSemanticSearch }; 