#!/usr/bin/env node

// Load environment variables first
import 'dotenv/config';

// Function to display the banner
function displayBanner() {
  console.log(`
     /$$$$$$   /$$$$$$  /$$   /$$  /$$$$$$  /$$$$$$$  
    /$$__  $$ /$$__  $$| $$$ | $$ /$$__  $$| $$__  $$ 
   | $$  \\__/| $$  \\ $$| $$$$| $$| $$  \\ $$| $$  \\ $$ 
   | $$      | $$  | $$| $$ $$ $$| $$$$$$$$| $$$$$$$ 
   | $$      | $$  | $$| $$  $$$$| $$__  $$| $$__  $$
   | $$    $$| $$  | $$| $$\\  $$$| $$  | $$| $$  \\ $$
   |  $$$$$$/|  $$$$$$/| $$ \\  $$| $$  | $$| $$$$$$$/
    \\______/  \\______/ |__/  \\__/|__/  |__/|_______/ 
                                                      
   🚀 Conab AI Chatbot - Supabase Migration Tool
   =============================================
  `);
}

// Import Node.js modules
import fs from 'fs';
import path from 'path';
import type { EmbeddingDocument } from '@/shared/infrastructure/database/supabase';
// Import after env is loaded
const { VectorDBSupabase } = require('@/shared/infrastructure/vector-store/vector-db-supabase');

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function migrateToSupabase() {
  try {
    console.log('🚀 Starting migration to Supabase...');

    // Read existing documents from local file
    const documentsPath = path.join(process.cwd(), 'data', 'vector-store', 'documents.json');
    
    if (!fs.existsSync(documentsPath)) {
      console.error('❌ Documents file not found at:', documentsPath);
      return;
    }

    const documentsData = fs.readFileSync(documentsPath, 'utf-8');
    console.log('Type of documentsData:', typeof documentsData);
    console.log('First 200 chars of documentsData:', documentsData.slice(0, 200));
    const parsedData = JSON.parse(documentsData);
    console.log('Type of parsedData:', typeof parsedData);
    console.log('Keys in parsedData:', Object.keys(parsedData));
    const rawDocuments = parsedData.documents || parsedData;
    console.log('Type of rawDocuments:', typeof rawDocuments);
    console.log('Is rawDocuments an array?', Array.isArray(rawDocuments));
    console.log('rawDocuments.length:', rawDocuments.length);
    
    // Transform documents to match Supabase schema
    const documents: EmbeddingDocument[] = rawDocuments.map((doc: any) => ({
      content: doc.pageContent || doc.content || '', // Map pageContent to content
      embedding: doc.embedding || [],
      metadata: {
        url: doc.metadata?.url || doc.url || '',
        title: doc.metadata?.title || doc.title || '',
        type: doc.metadata?.type || doc.type || '',
        topic: doc.metadata?.topic || doc.topic || '',
        priority: doc.metadata?.priority || doc.priority || 0
      },
      created_at: doc.created_at || new Date().toISOString()
    }));
    
    console.log(`📄 Found ${documents.length} documents to migrate`);
    console.log('Sample document structure:', JSON.stringify(documents[0], null, 2));

    // Initialize Supabase VectorDB
    const vectorDB = new VectorDBSupabase();

    // Clear existing data in Supabase (optional - remove if you want to keep existing)
    console.log('🧹 Clearing existing data in Supabase...');
    await vectorDB.clearAll();

    // Add documents to Supabase
    console.log('📤 Uploading documents to Supabase...');
    await vectorDB.addDocuments(documents);

    // Verify migration
    const count = await vectorDB.getDocumentCount();
    console.log(`✅ Migration complete! ${count} documents now in Supabase`);

    // Optional: Backup the original file
    const backupPath = path.join(process.cwd(), 'data', 'vector-store', 'documents-backup.json');
    fs.copyFileSync(documentsPath, backupPath);
    console.log(`💾 Original file backed up to: ${backupPath}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateToSupabase();
}

export { migrateToSupabase }; 