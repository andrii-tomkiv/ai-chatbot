import { supabase, EmbeddingDocument, EMBEDDINGS_TABLE } from './supabase';
import { config } from './config';

export class VectorDBSupabase {
  private maxResults: number;

  constructor() {
    this.maxResults = config.getVectorDbConfig().maxResults;
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

  async search(queryEmbedding: number[], topic?: string): Promise<EmbeddingDocument[]> {
    try {
      let query = supabase
        .from(EMBEDDINGS_TABLE)
        .select('*');

      // If topic is specified, filter by topic first
      if (topic) {
        query = query.eq('metadata->topic', topic);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching documents in Supabase:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No documents found in Supabase');
        return [];
      }

      // Calculate cosine similarity and sort
      const documentsWithSimilarity = data.map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));

      // Sort by similarity (highest first) and take top results
      const sortedDocuments = documentsWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, this.maxResults);

      console.log(`Found ${sortedDocuments.length} relevant documents from Supabase`);
      return sortedDocuments.map(({ similarity, ...doc }) => doc);
    } catch (error) {
      console.error('Failed to search documents in Supabase:', error);
      throw error;
    }
  }

  async searchWithFallback(queryEmbedding: number[], topic?: string): Promise<EmbeddingDocument[]> {
    try {
      // First try to find documents with the specific topic
      let results = await this.search(queryEmbedding, topic);

      // If we don't have enough results and topic was specified, fall back to general search
      if (results.length < this.maxResults / 2 && topic) {
        console.log(`Not enough topic-specific results (${results.length}), falling back to general search`);
        const generalResults = await this.search(queryEmbedding);
        
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