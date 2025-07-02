import * as fs from 'fs';
import * as path from 'path';
import { serviceFactory } from './service-factory';
import { embeddingRateLimiter } from './rate-limiter';

// Import Vercel KV for production storage
let kv: any = null;
try {
  if (process.env.KV_URL) {
    kv = require('@vercel/kv').kv;
  }
} catch (error) {
  console.log('⚠️  Vercel KV not available, using file storage only');
}

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
  private useKV: boolean;

  constructor(storePath: string = './data/vector-store') {
    console.log(`🔧 Initializing VectorDB with store path: ${storePath}`);
    this.storePath = storePath;
    this.dataPath = path.join(storePath, 'documents.json');
    this.useKV = !!(kv && process.env.KV_URL);
    
    console.log(`📁 Data file path: ${this.dataPath}`);
    console.log(`🌐 Using KV storage: ${this.useKV}`);
  
    // Only try to create the directory in development (local) environments
    if (process.env.NODE_ENV === 'development' && !this.useKV) {
      if (!fs.existsSync(storePath)) {
        try {
          fs.mkdirSync(storePath, { recursive: true });
          console.log(`📁 Created directory: ${storePath}`);
        } catch (error) {
          console.warn(`⚠️  Could not create directory ${storePath}:`, error);
        }
      } else {
        console.log(`📁 Directory already exists: ${storePath}`);
      }
    } else {
      console.log(`🌐 Production environment - using KV storage`);
    }
  }

  private async loadDocuments(): Promise<StoredDocument[]> {
    console.log(`📂 Attempting to load documents...`);
    
    if (this.useKV) {
      return this.loadDocumentsFromKV();
    } else {
      return this.loadDocumentsFromFile();
    }
  }

  private async loadDocumentsFromKV(): Promise<StoredDocument[]> {
    try {
      console.log(`🔑 Loading documents from Vercel KV...`);
      const data = await kv.get('vector-documents');
      if (data) {
        const documents = data.documents || [];
        console.log(`📊 Loaded ${documents.length} documents from KV`);
        console.log(`📋 Sample document titles:`, documents.slice(0, 3).map((d: StoredDocument) => d.metadata?.title || 'No title'));
        return documents;
      } else {
        console.log(`⚠️  No documents found in KV`);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading documents from KV:', error);
      return [];
    }
  }

  private loadDocumentsFromFile(): StoredDocument[] {
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

  private async saveDocuments(documents: StoredDocument[]) {
    console.log(`💾 Saving ${documents.length} documents...`);
    
    if (this.useKV) {
      await this.saveDocumentsToKV(documents);
    } else {
      this.saveDocumentsToFile(documents);
    }
  }

  private async saveDocumentsToKV(documents: StoredDocument[]) {
    try {
      const data = {
        documents: documents,
        lastUpdated: new Date().toISOString(),
        totalDocuments: documents.length,
        version: '1.0'
      };
      
      await kv.set('vector-documents', data);
      console.log(`✅ Successfully saved documents to KV`);
      console.log(`📊 Document stats: ${documents.length} total, ${documents.filter(d => d.embedding.length > 0).length} with embeddings`);
    } catch (error) {
      console.error('❌ Error saving documents to KV:', error);
      throw error;
    }
  }

  private saveDocumentsToFile(documents: StoredDocument[]) {
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
    const existingDocuments = await this.loadDocuments();
    console.log(`📚 Found ${existingDocuments.length} existing documents`);
    
    const allDocuments = [...existingDocuments, ...documents];
    console.log(`📊 Total documents after merge: ${allDocuments.length}`);
    
    // Save to storage
    console.log(`💾 Saving all documents...`);
    await this.saveDocuments(allDocuments);
    console.log(`🎉 Successfully added ${documents.length} new documents to vector store`);
  }

  async search(query: string, k: number = 3, clientIdentifier?: string): Promise<Document[]> {
    console.log(`🔍 Starting topic-based semantic search...`);
    console.log(`❓ Query: "${query}"`);
    console.log(`📊 Requesting top ${k} results`);
    
    // Rate limiting for embedding generation
    if (clientIdentifier) {
      const rateLimitResult = embeddingRateLimiter.isAllowed(clientIdentifier);
      if (!rateLimitResult.allowed) {
        console.log(`🚫 Rate limit exceeded for ${clientIdentifier}, falling back to text search`);
        const documents = await this.loadDocuments();
        return this.fallbackTextSearch(documents, query, k);
      }
    }
    
    const documents = await this.loadDocuments();
    console.log(`📚 Loaded ${documents.length} documents from storage`);
    
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

    // Try topic-based semantic search first with timeout
    try {
      console.log(`🧠 Attempting topic-based semantic search with embeddings...`);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Semantic search timed out, falling back to text search'));
        }, 15000); // 15 second timeout for entire search
      });

      const searchPromise = this.topicBasedSearch(documentsWithEmbeddings, query, k);
      return await Promise.race([searchPromise, timeoutPromise]);
    } catch (error) {
      console.warn(`❌ Topic-based search failed, falling back to text search:`, error);
      return this.fallbackTextSearch(documents, query, k);
    }
  }

  private async topicBasedSearch(documentsWithEmbeddings: StoredDocument[], query: string, k: number): Promise<Document[]> {
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

    // Determine the topic of the query
    const queryTopic = this.detectQueryTopic(query);
    console.log(`🎯 Detected query topic: ${queryTopic}`);

    // Get topic-specific results
    const results = this.getTopicSpecificResults(scoredDocuments, queryTopic, k);

    console.log(`🏆 Final topic-based results:`);
    results.forEach((item, index) => {
      const type = this.isBlogPost(item.document) ? '📝 Blog' : '🌐 Page';
      console.log(`  ${index + 1}. ${type}: "${item.document.metadata?.title || 'No title'}" (similarity: ${item.similarity.toFixed(3)})`);
    });

    return results.map(item => ({
      pageContent: item.document.pageContent,
      metadata: item.document.metadata
    }));
  }

  private detectQueryTopic(query: string): 'surrogacy' | 'egg-donor' | 'intended-parents' | 'general' {
    const lowerQuery = query.toLowerCase();
    
    // Surrogacy-related keywords
    const surrogacyKeywords = ['surrogate', 'surrogacy', 'gestational', 'carrier', 'pregnancy', 'birth'];
    const surrogacyMatch = surrogacyKeywords.some(keyword => lowerQuery.includes(keyword));
    
    // Egg donor-related keywords
    const eggDonorKeywords = ['egg donor', 'egg donation', 'donor eggs', 'egg retrieval', 'ovulation'];
    const eggDonorMatch = eggDonorKeywords.some(keyword => lowerQuery.includes(keyword));
    
    // Intended parents-related keywords
    const intendedParentsKeywords = ['intended parent', 'intended parents', 'parent', 'family', 'adoption', 'legal'];
    const intendedParentsMatch = intendedParentsKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (surrogacyMatch) return 'surrogacy';
    if (eggDonorMatch) return 'egg-donor';
    if (intendedParentsMatch) return 'intended-parents';
    return 'general';
  }

  private getDocumentTopic(document: StoredDocument): string {
    const url = document.metadata?.url || '';
    const title = document.metadata?.title || '';
    const content = document.pageContent || '';
    
    const lowerUrl = url.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    // Check for surrogacy-related content
    if (lowerUrl.includes('surrogacy') || lowerTitle.includes('surrogacy') || lowerContent.includes('surrogacy')) {
      return 'surrogacy';
    }
    
    // Check for egg donor-related content
    if (lowerUrl.includes('egg-donor') || lowerTitle.includes('egg donor') || lowerContent.includes('egg donor')) {
      return 'egg-donor';
    }
    
    // Check for intended parents-related content
    if (lowerUrl.includes('intended-parents') || lowerTitle.includes('intended parent') || lowerContent.includes('intended parent')) {
      return 'intended-parents';
    }
    
    return 'general';
  }

  private getTopicSpecificResults(scoredDocuments: any[], queryTopic: string, k: number): any[] {
    console.log(`🎯 Filtering results for topic: ${queryTopic}`);
    
    // Separate documents by type and topic
    const mainPages = scoredDocuments.filter(item => !this.isBlogPost(item.document));
    const blogPosts = scoredDocuments.filter(item => this.isBlogPost(item.document));
    
    const topicMainPages = mainPages.filter(item => this.getDocumentTopic(item.document) === queryTopic);
    const topicBlogPosts = blogPosts.filter(item => this.getDocumentTopic(item.document) === queryTopic);
    
    console.log(`📊 Topic-specific documents: ${topicMainPages.length} main pages, ${topicBlogPosts.length} blog posts`);
    
    // If we have enough topic-specific results, use them
    if (topicMainPages.length + topicBlogPosts.length >= k) {
      console.log(`✅ Using topic-specific results`);
      return this.selectPriorityResults(topicMainPages, topicBlogPosts, k);
    }
    
    // Otherwise, use general results but prioritize topic-specific ones
    console.log(`⚠️  Not enough topic-specific results, using mixed approach`);
    const generalMainPages = mainPages.filter(item => this.getDocumentTopic(item.document) !== queryTopic);
    const generalBlogPosts = blogPosts.filter(item => this.getDocumentTopic(item.document) !== queryTopic);
    
    // Combine topic-specific and general results, prioritizing topic-specific
    const allMainPages = [...topicMainPages, ...generalMainPages];
    const allBlogPosts = [...topicBlogPosts, ...generalBlogPosts];
    
    return this.selectPriorityResults(allMainPages, allBlogPosts, k);
  }

  private isBlogPost(document: StoredDocument): boolean {
    const url = document.metadata?.url || '';
    const title = document.metadata?.title || '';
    
    // Check if it's a blog post based on URL patterns
    const blogPatterns = [
      '/blog/',
      '/news/',
      '/articles/',
      '/post/',
      '/story/',
      'blog.',
      'news.'
    ];
    
    return blogPatterns.some(pattern => url.toLowerCase().includes(pattern)) ||
           title.toLowerCase().includes('blog') ||
           title.toLowerCase().includes('news');
  }

  private selectPriorityResults(mainPages: any[], blogPosts: any[], k: number): any[] {
    console.log(`🎯 Selecting priority results from ${mainPages.length} main pages and ${blogPosts.length} blog posts`);
    
    const results: any[] = [];
    
    // Prioritize main pages (higher authority, more comprehensive)
    const mainPageCount = Math.min(Math.ceil(k * 0.7), mainPages.length); // 70% main pages
    const blogPostCount = Math.min(k - mainPageCount, blogPosts.length); // Remaining for blog posts
    
    console.log(`📊 Target: ${mainPageCount} main pages, ${blogPostCount} blog posts`);
    
    // Add main pages first
    results.push(...mainPages.slice(0, mainPageCount));
    
    // Add blog posts if we have space
    if (blogPostCount > 0) {
      results.push(...blogPosts.slice(0, blogPostCount));
    }
    
    // If we still have space, add more main pages
    if (results.length < k && mainPages.length > mainPageCount) {
      const remaining = k - results.length;
      results.push(...mainPages.slice(mainPageCount, mainPageCount + remaining));
    }
    
    // If we still have space, add more blog posts
    if (results.length < k && blogPosts.length > blogPostCount) {
      const remaining = k - results.length;
      results.push(...blogPosts.slice(blogPostCount, blogPostCount + remaining));
    }
    
    console.log(`✅ Selected ${results.length} results (${results.filter(r => !this.isBlogPost(r.document)).length} main pages, ${results.filter(r => this.isBlogPost(r.document)).length} blog posts)`);
    
    return results;
  }

  private fallbackTextSearch(documents: StoredDocument[], query: string, k: number): Document[] {
    console.log(`🔍 Falling back to text-based search for: "${query}"`);
    
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    console.log(`🔤 Query words: ${queryWords.join(', ')}`);
    
    const scoredDocuments = documents.map(doc => {
      const content = doc.pageContent.toLowerCase();
      const title = (doc.metadata?.title || '').toLowerCase();
      const url = (doc.metadata?.url || '').toLowerCase();
      
      let score = 0;
      
      // Score based on word matches
      queryWords.forEach(word => {
        // Title matches are worth more
        if (title.includes(word)) score += 10;
        // URL matches are worth more
        if (url.includes(word)) score += 8;
        // Content matches
        const contentMatches = (content.match(new RegExp(word, 'g')) || []).length;
        score += contentMatches * 2;
      });
      
      return { document: doc, score };
    });
    
    // Sort by score and return top k
    const results = scoredDocuments
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    
    console.log(`📊 Text search results: ${results.length} documents found`);
    results.forEach((item, index) => {
      console.log(`  ${index + 1}. "${item.document.metadata?.title || 'No title'}" (score: ${item.score})`);
    });
    
    return results.map(item => ({
      pageContent: item.document.pageContent,
      metadata: item.document.metadata
    }));
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    const embeddingProvider = serviceFactory.getEmbeddingProvider();
    return await embeddingProvider.embedText(query);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      console.warn(`⚠️  Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
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
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async getStats() {
    const documents = await this.loadDocuments();
    const documentsWithEmbeddings = documents.filter(doc => doc.embedding.length > 0);
    
    return {
      totalDocuments: documents.length,
      documentsWithEmbeddings: documentsWithEmbeddings.length,
      storageType: this.useKV ? 'KV' : 'File',
      lastUpdated: documents.length > 0 ? documents[0].metadata?.lastUpdated : null
    };
  }

  async clear() {
    console.log(`🗑️  Clearing all documents...`);
    if (this.useKV) {
      await kv.del('vector-documents');
      console.log(`✅ Cleared KV storage`);
    } else {
      if (fs.existsSync(this.dataPath)) {
        fs.unlinkSync(this.dataPath);
        console.log(`✅ Deleted file: ${this.dataPath}`);
      }
    }
  }

  async exportSample() {
    const documents = await this.loadDocuments();
    const sample = documents.slice(0, 5);
    
    return {
      sample,
      total: documents.length,
      storageType: this.useKV ? 'KV' : 'File'
    };
  }
} 