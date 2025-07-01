import * as fs from 'fs';
import * as path from 'path';
import { serviceFactory } from './service-factory';
import { embeddingRateLimiter } from './rate-limiter';

export interface Document {
  pageContent: string;
  metadata: Record<string, string | number | boolean>;
}

export interface ContentChunk {
  id: string;
  content: string;
  url: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface StoredDocument extends Document {
  embedding: number[];
}

export class VectorDB {
  private storePath: string;
  private dataPath: string;

  constructor(storePath: string = './data/vector-store') {
    console.log(`🔧 Initializing VectorDB with store path: ${storePath}`);
    this.storePath = storePath;
    this.dataPath = path.join(storePath, 'documents.json');
    console.log(`📁 Data file path: ${this.dataPath}`);
    
    if (!fs.existsSync(storePath)) {
      fs.mkdirSync(storePath, { recursive: true });
      console.log(`📁 Created directory: ${storePath}`);
    } else {
      console.log(`📁 Directory already exists: ${storePath}`);
    }
  }

  private loadDocuments(): StoredDocument[] {
    console.log(`📂 Attempting to load documents from: ${this.dataPath}`);
    try {
      if (fs.existsSync(this.dataPath)) {
        console.log(`✅ File exists, reading data...`);
        const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
        const documents = data.documents || [];
        console.log(`📊 Loaded ${documents.length} documents from disk`);
        console.log(`📋 Sample document titles:`, documents.slice(0, 3).map((d: StoredDocument) => d.metadata?.title || 'No title'));
        return documents;
      } else {
        console.log(`⚠️  File does not exist: ${this.dataPath}`);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading documents:', error);
      return [];
    }
  }

  private saveDocuments(documents: StoredDocument[]) {
    console.log(`💾 Saving ${documents.length} documents to disk...`);
    try {
      const data = {
        documents: documents,
        lastUpdated: new Date().toISOString(),
        totalDocuments: documents.length,
        version: '1.0'
      };
      
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
      console.log(`✅ Successfully saved documents to: ${this.dataPath}`);
      console.log(`📊 Document stats: ${documents.length} total, ${documents.filter(d => d.embedding.length > 0).length} with embeddings`);
    } catch (error) {
      console.error('❌ Error saving documents to disk:', error);
      throw error;
    }
  }

  async addContent(chunks: ContentChunk[], embeddings: number[][]) {
    console.log(`🚀 Starting addContent process...`);
    console.log(`📦 Input: ${chunks.length} chunks, ${embeddings.length} embeddings`);
    console.log(`📋 Sample chunk titles:`, chunks.slice(0, 3).map(c => c.metadata?.title || 'No title'));

    console.log(`📝 Adding ${chunks.length} chunks to vector store...`);

    const documents: StoredDocument[] = chunks.map((chunk, index) => {
      const embedding = embeddings[index] || [];
      console.log(`🔗 Processing chunk ${index + 1}/${chunks.length}: "${chunk.metadata?.title || 'No title'}" (embedding length: ${embedding.length})`);
      
      return {
        pageContent: chunk.content,
        metadata: {
          id: chunk.id,
          url: chunk.url,
          ...chunk.metadata,
        },
        embedding: embedding
      };
    });

    console.log(`📚 Created ${documents.length} document objects`);

    // Load existing documents and add new ones
    console.log(`🔄 Loading existing documents...`);
    const existingDocuments = this.loadDocuments();
    console.log(`📚 Found ${existingDocuments.length} existing documents`);
    
    const allDocuments = [...existingDocuments, ...documents];
    console.log(`📊 Total documents after merge: ${allDocuments.length}`);
    
    // Save to disk
    console.log(`💾 Saving all documents to disk...`);
    this.saveDocuments(allDocuments);
    console.log(`🎉 Successfully added ${documents.length} new documents to vector store`);
  }

  async search(query: string, k: number = 3, clientIdentifier?: string): Promise<Document[]> {
    console.log(`🔍 Starting priority-based semantic search...`);
    console.log(`❓ Query: "${query}"`);
    console.log(`📊 Requesting top ${k} results`);
    
    // Rate limiting for embedding generation
    if (clientIdentifier) {
      const rateLimitResult = embeddingRateLimiter.isAllowed(clientIdentifier);
      if (!rateLimitResult.allowed) {
        console.log(`🚫 Rate limit exceeded for ${clientIdentifier}, falling back to text search`);
        const documents = this.loadDocuments();
        return this.fallbackTextSearch(documents, query, k);
      }
    }
    
    const documents = this.loadDocuments();
    console.log(`📚 Loaded ${documents.length} documents from disk`);
    
    if (documents.length === 0) {
      console.log('⚠️  No documents available for search');
      return [];
    }

    const documentsWithEmbeddings = documents.filter(doc => doc.embedding.length > 0);
    console.log(`🔢 Found ${documentsWithEmbeddings.length} documents with embeddings (out of ${documents.length} total)`);

    if (documentsWithEmbeddings.length === 0) {
      console.log('⚠️  No documents with embeddings found, falling back to text search');
      return this.fallbackTextSearch(documents, query, k);
    }

    // Try priority-based semantic search first with timeout
    try {
      console.log(`🧠 Attempting priority-based semantic search with embeddings...`);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Semantic search timed out, falling back to text search'));
        }, 15000); // 15 second timeout for entire search
      });

      const searchPromise = this.priorityBasedSearch(documentsWithEmbeddings, query, k);
      return await Promise.race([searchPromise, timeoutPromise]);
    } catch (error) {
      console.warn(`❌ Priority-based search failed, falling back to text search:`, error);
      return this.fallbackTextSearch(documents, query, k);
    }
  }

  private async priorityBasedSearch(documentsWithEmbeddings: StoredDocument[], query: string, k: number): Promise<Document[]> {
    console.log(`🧠 Generating embedding for query: "${query}"`);
    const queryEmbedding = await this.getQueryEmbedding(query);
    console.log(`✅ Query embedding generated, length: ${queryEmbedding.length}`);
    
    // Calculate cosine similarity between query and all documents
    console.log(`🔢 Calculating similarities for ${documentsWithEmbeddings.length} documents...`);
    const scoredDocuments = documentsWithEmbeddings
      .map((doc) => {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        return {
          document: doc,
          similarity: similarity
        };
      })
      .sort((a, b) => b.similarity - a.similarity); // Sort by similarity (highest first)

    // Separate documents by priority
    const mainPages = scoredDocuments.filter(item => !this.isBlogPost(item.document));
    const blogPosts = scoredDocuments.filter(item => this.isBlogPost(item.document));

    console.log(`📊 Document breakdown:`);
    console.log(`   - Main pages: ${mainPages.length}`);
    console.log(`   - Blog posts: ${blogPosts.length}`);

    // Priority-based selection strategy
    const results = this.selectPriorityResults(mainPages, blogPosts, k);

    console.log(`🏆 Final priority-based results:`);
    results.forEach((item, index) => {
      const type = this.isBlogPost(item.document) ? '📝 Blog' : '🌐 Page';
      console.log(`  ${index + 1}. ${type} "${item.document.metadata?.title || 'No title'}" (${item.similarity.toFixed(4)})`);
    });

    console.log(`✅ Found ${results.length} relevant documents using priority-based search`);
    
    // Return documents without embeddings
    return results.map(item => ({
      pageContent: item.document.pageContent,
      metadata: item.document.metadata
    }));
  }

  private isBlogPost(document: StoredDocument): boolean {
    const url = document.metadata?.url as string;
    const title = document.metadata?.title as string;
    
    // Check if it's a blog post based on URL or title
    const isBlogByUrl = Boolean(url && (
      url.includes('/blog/') || 
      url.includes('/about/blog') ||
      url.includes('/news/') ||
      url.includes('/articles/')
    ));
    
    const isBlogByTitle = Boolean(title && (
      title.toLowerCase().includes('blog') ||
      title.toLowerCase().includes('article') ||
      title.toLowerCase().includes('news')
    ));
    
    return isBlogByUrl || isBlogByTitle;
  }

  private selectPriorityResults(mainPages: any[], blogPosts: any[], k: number): any[] {
    const results: any[] = [];
    
    // Strategy: Fill with main pages first, then supplement with blog posts if needed
    const mainPageThreshold = Math.min(k, Math.ceil(k * 0.7)); // 70% of results should be main pages
    const minMainPages = Math.max(1, Math.floor(k * 0.5)); // At least 50% should be main pages
    
    console.log(`🎯 Priority strategy: Target ${mainPageThreshold} main pages, minimum ${minMainPages}`);
    
    // Add main pages first (up to threshold)
    const mainPagesToAdd = mainPages.slice(0, mainPageThreshold);
    results.push(...mainPagesToAdd);
    
    console.log(`✅ Added ${mainPagesToAdd.length} main pages`);
    
    // If we don't have enough main pages, add more
    if (results.length < minMainPages && mainPages.length > results.length) {
      const additionalMainPages = mainPages.slice(results.length, minMainPages);
      results.push(...additionalMainPages);
      console.log(`➕ Added ${additionalMainPages.length} more main pages to meet minimum`);
    }
    
    // Fill remaining slots with blog posts if we have space and good blog content
    const remainingSlots = k - results.length;
    if (remainingSlots > 0 && blogPosts.length > 0) {
      // Only add blog posts with high similarity (above 0.7 threshold)
      const highQualityBlogPosts = blogPosts.filter(item => item.similarity > 0.7);
      const blogPostsToAdd = highQualityBlogPosts.slice(0, remainingSlots);
      
      if (blogPostsToAdd.length > 0) {
        results.push(...blogPostsToAdd);
        console.log(`📝 Added ${blogPostsToAdd.length} high-quality blog posts (similarity > 0.7)`);
      } else {
        console.log(`⚠️  No high-quality blog posts found (similarity > 0.7 threshold)`);
      }
    }
    
    // If we still don't have enough results, add more main pages
    if (results.length < k && mainPages.length > results.length) {
      const remainingMainPages = mainPages.slice(results.length, k);
      results.push(...remainingMainPages);
      console.log(`➕ Added ${remainingMainPages.length} more main pages to fill remaining slots`);
    }
    
    // If we still don't have enough, add any remaining blog posts
    if (results.length < k && blogPosts.length > 0) {
      const usedBlogIds = new Set(results.filter(r => this.isBlogPost(r.document)).map(r => r.document.metadata?.id));
      const unusedBlogPosts = blogPosts.filter(item => !usedBlogIds.has(item.document.metadata?.id));
      const remainingBlogPosts = unusedBlogPosts.slice(0, k - results.length);
      
      if (remainingBlogPosts.length > 0) {
        results.push(...remainingBlogPosts);
        console.log(`📝 Added ${remainingBlogPosts.length} additional blog posts to complete results`);
      }
    }
    
    console.log(`📊 Final result breakdown:`);
    console.log(`   - Main pages: ${results.filter(r => !this.isBlogPost(r.document)).length}`);
    console.log(`   - Blog posts: ${results.filter(r => this.isBlogPost(r.document)).length}`);
    console.log(`   - Total: ${results.length}`);
    
    return results;
  }

  private fallbackTextSearch(documents: StoredDocument[], query: string, k: number): Document[] {
    console.log(`🔤 Using fallback text-based search for: "${query}"`);
    const queryLower = query.toLowerCase();
    const results = documents
      .filter(doc => 
        doc.pageContent.toLowerCase().includes(queryLower) ||
        (typeof doc.metadata.url === 'string' && doc.metadata.url.toLowerCase().includes(queryLower)) ||
        (typeof doc.metadata.title === 'string' && doc.metadata.title.toLowerCase().includes(queryLower))
      )
      .slice(0, k);

    console.log(`📋 Text search results:`, results.map(r => r.metadata?.title || 'No title'));
    return results.map(doc => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata
    }));
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    console.log(`🧠 Generating embedding for query: "${query}"`);
    try {
      // Use the service factory to get embeddings
      const embedding = await serviceFactory.generateEmbedding(query);
      console.log(`✅ Embedding generated successfully, length: ${embedding.length}`);
      return embedding;
    } catch (error) {
      console.error('❌ Error generating query embedding:', error);
      throw error;
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      console.log(`⚠️  Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      console.log(`⚠️  Zero norm detected: normA=${normA}, normB=${normB}`);
      return 0;
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity;
  }

  async getStats() {
    console.log(`📊 Getting vector store statistics...`);
    const documents = this.loadDocuments();
    
    const stats = { 
      documentCount: documents.length,
      storePath: this.storePath,
      dataPath: this.dataPath,
      totalEmbeddings: documents.filter(d => d.embedding.length > 0).length
    };

    console.log(`📈 Stats:`, stats);
    return stats;
  }

  async clear() {
    console.log(`🗑️  Clearing vector store...`);
    try {
      if (fs.existsSync(this.storePath)) {
        fs.rmSync(this.storePath, { recursive: true, force: true });
        console.log(`✅ Cleared vector store: ${this.storePath}`);
      } else {
        console.log(`⚠️  Store path doesn't exist: ${this.storePath}`);
      }
    } catch (error) {
      console.error('❌ Error clearing vector store:', error);
    }
  }

  async exportSample() {
    console.log(`📋 Exporting sample documents...`);
    const documents = this.loadDocuments();
    
    if (documents.length === 0) {
      console.log('⚠️  No documents to export');
      return;
    }

    const sample = documents.slice(0, 3).map(doc => ({
      title: doc.metadata.title,
      url: doc.metadata.url,
      content: doc.pageContent.substring(0, 200) + '...',
      embeddingLength: doc.embedding.length
    }));

    console.log('📋 Sample documents:');
    sample.forEach((doc, index) => {
      console.log(`\n${index + 1}. ${doc.title}`);
      console.log(`   URL: ${doc.url}`);
      console.log(`   Content: ${doc.content}`);
      console.log(`   Embedding: ${doc.embeddingLength} dimensions`);
    });
  }
}

// Export singleton instance
console.log(`🚀 Creating VectorDB singleton instance...`);
export const vectorDB = new VectorDB(); 