import { supabase, EmbeddingDocument, EMBEDDINGS_TABLE } from './supabase';
import { config } from './config';
import { createEmbeddingProvider } from './embedding-provider';

export class VectorDBSupabase {
  private maxResults: number;
  private embeddingProvider: any;

  constructor() {
    this.maxResults = config.getVectorDbConfig().maxResults;
    
    // Initialize embedding provider
    const embeddingConfig = config.getEmbeddingConfig();
    if (config.getApiKeys().mistral) {
      const mistralConfig = config.getMistralConfig();
      this.embeddingProvider = createEmbeddingProvider('mistral', {
        model: mistralConfig.embeddingModel,
        apiKey: config.getApiKeys().mistral!,
        timeoutMs: embeddingConfig.timeoutMs,
        maxRetries: embeddingConfig.maxRetries,
      });
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingProvider) {
      throw new Error('No embedding provider available');
    }
    const embeddings = await this.embeddingProvider.generateEmbeddings([text]);
    return embeddings[0];
  }

  async addDocuments(documents: EmbeddingDocument[]): Promise<void> {
    try {
      const { error } = await supabase
        .from(EMBEDDINGS_TABLE)
        .insert(documents);

      if (error) {
        console.error('Error adding documents to Supabase:', error);
        throw error;
      }

      console.log(`Successfully added ${documents.length} documents to Supabase`);
    } catch (error) {
      console.error('Failed to add documents to Supabase:', error);
      throw error;
    }
  }

  async search(query: string, k: number = 3, clientIdentifier?: string): Promise<EmbeddingDocument[]> {
    console.log(`🔍 Starting topic-based semantic search...`);
    console.log(`❓ Query: "${query}"`);
    console.log(`📊 Requesting top ${k} results`);

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      console.log(`✅ Query embedding generated, length: ${queryEmbedding.length}`);

      // Detect the topic of the query
      const queryTopic = this.detectQueryTopic(query);
      console.log(`🎯 Detected query topic: ${queryTopic}`);

      // Perform topic-based search
      const results = await this.topicBasedSearch(queryEmbedding, queryTopic, k);
      
      console.log(`🏆 Final topic-based results: ${results.length} documents`);
      return results;

    } catch (error) {
      console.error('Failed to perform topic-based search:', error);
      // Fallback to simple search
      return await this.simpleSearch(query, k);
    }
  }

  private async topicBasedSearch(queryEmbedding: number[], queryTopic: string, k: number): Promise<EmbeddingDocument[]> {
    console.log(`🧠 Performing topic-based search for topic: ${queryTopic}`);

    // Get all documents from Supabase
    const { data: allDocuments, error } = await supabase
      .from(EMBEDDINGS_TABLE)
      .select('*');

    if (error) {
      console.error('Error fetching documents from Supabase:', error);
      throw error;
    }

    if (!allDocuments || allDocuments.length === 0) {
      console.log('No documents found in Supabase');
      return [];
    }

    console.log(`📚 Loaded ${allDocuments.length} documents from Supabase`);

    // Calculate similarities and create scored documents
    const scoredDocuments = allDocuments
      .map(doc => ({
        document: doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity);

    // Get topic-specific results
    const results = this.getTopicSpecificResults(scoredDocuments, queryTopic, k);
    
    // Return just the documents (without similarity scores)
    return results.map(item => item.document);
  }

  private async simpleSearch(query: string, k: number): Promise<EmbeddingDocument[]> {
    console.log(`🔄 Falling back to simple search for query: "${query}"`);
    
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const { data, error } = await supabase
        .from(EMBEDDINGS_TABLE)
        .select('*');

      if (error) {
        console.error('Error in simple search:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Calculate similarities and sort
      const documentsWithSimilarity = data.map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));

      const sortedDocuments = documentsWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k);

      console.log(`Found ${sortedDocuments.length} relevant documents from Supabase`);
      return sortedDocuments.map(({ similarity, ...doc }) => doc);
    } catch (error) {
      console.error('Simple search failed:', error);
      return [];
    }
  }

  private detectQueryTopic(query: string): 'surrogacy' | 'egg-donor' | 'intended-parents' | 'general' {
    const queryLower = query.toLowerCase();
    
    // Surrogacy keywords
    const surrogacyKeywords = [
      'surrogacy', 'surrogate', 'surrogate mother', 'gestational carrier',
      'become a surrogate', 'surrogate pregnancy', 'surrogate process',
      'surrogate requirements', 'surrogate compensation', 'surrogate journey'
    ];
    
    // Egg donor keywords
    const eggDonorKeywords = [
      'egg donor', 'egg donation', 'donate eggs', 'egg donor process',
      'become an egg donor', 'egg donor requirements', 'egg donor compensation',
      'egg retrieval', 'donor eggs', 'egg donation process'
    ];
    
    // Intended parents keywords
    const intendedParentsKeywords = [
      'intended parents', 'surrogacy parents', 'find a surrogate',
      'surrogate mother', 'surrogacy journey', 'surrogacy cost',
      'surrogacy process', 'surrogacy agency', 'surrogacy program',
      'parent', 'parents', 'family building', 'fertility'
    ];
    
    // Check for surrogacy keywords
    if (surrogacyKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'surrogacy';
    }
    
    // Check for egg donor keywords
    if (eggDonorKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'egg-donor';
    }
    
    // Check for intended parents keywords
    if (intendedParentsKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'intended-parents';
    }
    
    return 'general';
  }

  private getDocumentTopic(document: EmbeddingDocument): string {
    const url = document.metadata?.url as string;
    const title = document.metadata?.title as string;
    
    if (!url) return 'general';
    
    // Check URL patterns for topic classification
    if (url.includes('/surrogacy/') || url.includes('/surrogate/')) {
      return 'surrogacy';
    }
    
    if (url.includes('/egg-donor/') || url.includes('/egg-donation/')) {
      return 'egg-donor';
    }
    
    if (url.includes('/parents/') || url.includes('/intended-parents/')) {
      return 'intended-parents';
    }
    
    // Check title patterns as fallback
    if (title) {
      const titleLower = title.toLowerCase();
      if (titleLower.includes('surrogacy') || titleLower.includes('surrogates')) {
        return 'surrogacy';
      }
      if (titleLower.includes('egg donor') || titleLower.includes('egg donation')) {
        return 'egg-donor';
      }
      if (titleLower.includes('parent') || titleLower.includes('family')) {
        return 'intended-parents';
      }
    }
    
    return 'general';
  }

  private getTopicSpecificResults(scoredDocuments: any[], queryTopic: string, k: number): any[] {
    console.log(`🎯 Getting topic-specific results for: ${queryTopic}`);
    
    if (queryTopic === 'general') {
      console.log(`🌐 Using general priority-based search for general query`);
      return this.selectPriorityResults(
        scoredDocuments.filter(item => !this.isBlogPost(item.document)),
        scoredDocuments.filter(item => this.isBlogPost(item.document)),
        k
      );
    }
    
    // Filter documents by topic
    const topicDocuments = scoredDocuments.filter(item => 
      this.getDocumentTopic(item.document) === queryTopic
    );
    
    const otherDocuments = scoredDocuments.filter(item => 
      this.getDocumentTopic(item.document) !== queryTopic
    );
    
    console.log(`📊 Topic breakdown:`);
    console.log(`   - ${queryTopic} documents: ${topicDocuments.length}`);
    console.log(`   - Other documents: ${otherDocuments.length}`);
    
    // Separate topic documents by type
    const topicMainPages = topicDocuments.filter(item => !this.isBlogPost(item.document));
    const topicBlogPosts = topicDocuments.filter(item => this.isBlogPost(item.document));
    
    console.log(`   - ${queryTopic} main pages: ${topicMainPages.length}`);
    console.log(`   - ${queryTopic} blog posts: ${topicBlogPosts.length}`);
    
    // Strategy: Fill with topic-specific main pages first, then topic-specific blog posts,
    // then other main pages, then other blog posts
    const results: any[] = [];
    
    // 1. Add topic-specific main pages (priority 1)
    const topicMainPagesToAdd = topicMainPages.slice(0, Math.ceil(k * 0.6));
    results.push(...topicMainPagesToAdd);
    console.log(`✅ Added ${topicMainPagesToAdd.length} ${queryTopic} main pages`);
    
    // 2. Add topic-specific blog posts (priority 2)
    const remainingSlots = k - results.length;
    if (remainingSlots > 0 && topicBlogPosts.length > 0) {
      const topicBlogPostsToAdd = topicBlogPosts.slice(0, remainingSlots);
      results.push(...topicBlogPostsToAdd);
      console.log(`📝 Added ${topicBlogPostsToAdd.length} ${queryTopic} blog posts`);
    }
    
    // 3. If we still need more content, add other main pages (priority 3)
    const stillRemainingSlots = k - results.length;
    if (stillRemainingSlots > 0) {
      const otherMainPages = otherDocuments.filter(item => !this.isBlogPost(item.document));
      const otherMainPagesToAdd = otherMainPages.slice(0, stillRemainingSlots);
      results.push(...otherMainPagesToAdd);
      console.log(`➕ Added ${otherMainPagesToAdd.length} other main pages`);
    }
    
    // 4. If we still need more content, add other blog posts (priority 4)
    const finalRemainingSlots = k - results.length;
    if (finalRemainingSlots > 0) {
      const otherBlogPosts = otherDocuments.filter(item => this.isBlogPost(item.document));
      const otherBlogPostsToAdd = otherBlogPosts.slice(0, finalRemainingSlots);
      results.push(...otherBlogPostsToAdd);
      console.log(`📝 Added ${otherBlogPostsToAdd.length} other blog posts`);
    }
    
    console.log(`📊 Final topic-based result breakdown:`);
    console.log(`   - ${queryTopic} main pages: ${results.filter(r => this.getDocumentTopic(r.document) === queryTopic && !this.isBlogPost(r.document)).length}`);
    console.log(`   - ${queryTopic} blog posts: ${results.filter(r => this.getDocumentTopic(r.document) === queryTopic && this.isBlogPost(r.document)).length}`);
    console.log(`   - Other main pages: ${results.filter(r => this.getDocumentTopic(r.document) !== queryTopic && !this.isBlogPost(r.document)).length}`);
    console.log(`   - Other blog posts: ${results.filter(r => this.getDocumentTopic(r.document) !== queryTopic && this.isBlogPost(r.document)).length}`);
    console.log(`   - Total: ${results.length}`);
    
    return results;
  }

  private isBlogPost(document: EmbeddingDocument): boolean {
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
      const blogPostsToAdd = blogPosts.slice(0, remainingSlots);
      results.push(...blogPostsToAdd);
      console.log(`📝 Added ${blogPostsToAdd.length} blog posts to fill remaining slots`);
    }
    
    console.log(`📊 Final priority result breakdown:`);
    console.log(`   - Main pages: ${results.filter(r => !this.isBlogPost(r.document)).length}`);
    console.log(`   - Blog posts: ${results.filter(r => this.isBlogPost(r.document)).length}`);
    console.log(`   - Total: ${results.length}`);
    
    return results;
  }

  async searchWithFallback(query: string, topic?: string): Promise<EmbeddingDocument[]> {
    try {
      // First try to find documents with the specific topic
      let results = await this.search(query, this.maxResults);

      // If we don't have enough results and topic was specified, fall back to general search
      if (results.length < this.maxResults / 2 && topic) {
        console.log(`Not enough topic-specific results (${results.length}), falling back to general search`);
        const generalResults = await this.search(query, this.maxResults);
        
        // Combine and deduplicate results
        const combined = [...results, ...generalResults];
        const unique = combined.filter((doc, index, self) => 
          index === self.findIndex(d => d.id === doc.id)
        );
        
        results = unique.slice(0, this.maxResults);
      }

      return results;
    } catch (error) {
      console.error('Failed to search with fallback in Supabase:', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    try {
      const { error } = await supabase
        .from(EMBEDDINGS_TABLE)
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) {
        console.error('Error clearing documents from Supabase:', error);
        throw error;
      }

      console.log('Successfully cleared all documents from Supabase');
    } catch (error) {
      console.error('Failed to clear documents from Supabase:', error);
      throw error;
    }
  }

  async getDocumentCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(EMBEDDINGS_TABLE)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error getting document count from Supabase:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get document count from Supabase:', error);
      return 0;
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
} 