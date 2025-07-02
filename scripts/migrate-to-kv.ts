#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

// Import Vercel KV
let kv: any = null;
try {
  if (process.env.KV_URL) {
    kv = require('@vercel/kv').kv;
  }
} catch (error) {
  console.log('⚠️  Vercel KV not available');
}

async function migrateToKV() {
  console.log('🚀 Starting migration to Vercel KV...');
  
  if (!kv) {
    console.error('❌ Vercel KV not available. Make sure KV_URL environment variable is set.');
    process.exit(1);
  }

  const dataPath = path.join(process.cwd(), 'data/vector-store/documents.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Source file not found: ${dataPath}`);
    console.log('💡 Make sure you have run the embedding generation script first.');
    process.exit(1);
  }

  try {
    console.log(`📂 Reading data from: ${dataPath}`);
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const documents = data.documents || [];
    
    console.log(`📊 Found ${documents.length} documents to migrate`);
    
    if (documents.length === 0) {
      console.log('⚠️  No documents to migrate');
      return;
    }

    // Prepare data for KV storage
    const kvData = {
      documents: documents,
      lastUpdated: new Date().toISOString(),
      totalDocuments: documents.length,
      version: '1.0',
      migratedAt: new Date().toISOString()
    };

    console.log('💾 Saving to Vercel KV...');
    await kv.set('vector-documents', kvData);
    
    console.log('✅ Migration completed successfully!');
    console.log(`📊 Migrated ${documents.length} documents`);
    console.log(`📋 Sample document titles:`, documents.slice(0, 3).map((d: any) => d.metadata?.title || 'No title'));
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const verification = await kv.get('vector-documents');
    if (verification && verification.documents) {
      console.log(`✅ Verification successful: ${verification.documents.length} documents in KV`);
    } else {
      console.log('⚠️  Verification failed: No documents found in KV');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateToKV().catch(console.error); 