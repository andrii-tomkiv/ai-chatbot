import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { MistralAIEmbeddings } from '@langchain/mistralai';
import { vectorDB } from '@/lib/vector-db';

interface ScrapedChunk {
  id: string;
  content: string;
  url: string;
  metadata: {
    title: string;
    type: string;
    chunkIndex?: number;
  };
}

// Generate embeddings using LangChain
export async function generateEmbeddings() {
  console.log('🚀 Starting embedding generation with LangChain...');
  
  // Find the most recent scraped content file
  const dataDir = './data/scraped-content';
  const files = fs.readdirSync(dataDir).filter(file => file.startsWith('scraped-content-'));
  
  if (files.length === 0) {
    console.error('❌ No scraped content files found in data/scraped-content/');
    return;
  }
  
  // Prioritize timestamped files over progress files
  const timestampedFiles = files.filter(file => file.includes('T') && file.includes('Z'));
  const progressFiles = files.filter(file => file.includes('progress-'));
  
  let latestFile: string;
  
  if (timestampedFiles.length > 0) {
    // Use the most recent timestamped file
    latestFile = timestampedFiles.sort().pop()!;
  } else if (progressFiles.length > 0) {
    // Fallback to progress files if no timestamped files
    latestFile = progressFiles.sort().pop()!;
  } else {
    console.error('❌ No valid scraped content files found');
    return;
  }
  
  const filePath = path.join(dataDir, latestFile);
  
  console.log(`📁 Processing file: ${latestFile}`);
  
  // Read the scraped content
  const content = fs.readFileSync(filePath, 'utf-8');
  const chunks: ScrapedChunk[] = JSON.parse(content);
  
  console.log(`📦 Found ${chunks.length} chunks to process`);
  
  // Initialize LangChain embeddings
  const embeddings = new MistralAIEmbeddings({
    model: 'mistral-embed',
    apiKey: process.env.MISTRAL_API_KEY,
  });
  
  console.log('✅ LangChain embeddings initialized');
  
  // Process chunks in batches
  const batchSize = 10;
  const allEmbeddings: number[][] = [];
  const contentChunks: any[] = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batch.length} chunks)`);
    
    // Prepare batch texts
    const texts = batch.map(chunk => `Title: ${chunk.metadata.title}\n\nContent: ${chunk.content}`);
    
    try {
      // Generate embeddings for the batch
      const batchEmbeddings = await embeddings.embedDocuments(texts);
      allEmbeddings.push(...batchEmbeddings);
      
      // Prepare content chunks for vector DB
      batch.forEach((chunk, index) => {
        contentChunks.push({
          id: chunk.id,
          content: texts[index],
          url: chunk.url,
          metadata: {
            title: chunk.metadata.title,
            type: chunk.metadata.type,
            chunkIndex: chunk.metadata.chunkIndex || 0
          }
        });
      });
      
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed`);
      
      // Small delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }
  }
  
  console.log(`\n✅ Generated ${allEmbeddings.length} embeddings`);
  
  // Store in vector database
  console.log(`\n💾 Storing embeddings in vector database...`);
  await vectorDB.addContent(contentChunks, allEmbeddings);
  
  console.log(`✅ Stored ${allEmbeddings.length} documents in vector database`);
  
  // Save a summary
  const summary = {
    processedAt: new Date().toISOString(),
    sourceFile: latestFile,
    totalChunks: chunks.length,
    totalEmbeddings: allEmbeddings.length,
    embeddingLength: allEmbeddings[0]?.length || 0,
    sampleUrls: chunks.slice(0, 5).map(chunk => chunk.url)
  };
  
  const summaryPath = path.join(dataDir, 'embedding-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`\n🎉 Embedding generation completed successfully!`);
  console.log(`📊 Summary:`);
  console.log(`   - Source file: ${latestFile}`);
  console.log(`   - Total chunks: ${chunks.length}`);
  console.log(`   - Total embeddings: ${allEmbeddings.length}`);
  console.log(`   - Embedding dimensions: ${summary.embeddingLength}`);
  console.log(`   - Summary saved to: ${summaryPath}`);
  console.log(`\n📋 Sample URLs:`);
  summary.sampleUrls.forEach((url, index) => {
    console.log(`   ${index + 1}. ${url}`);
  });
  
  console.log(`\n🚀 Your chatbot is now ready to use semantic search!`);
}

// Run the script
if (require.main === module) {
  generateEmbeddings().catch(console.error);
} 