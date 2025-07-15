import { serviceFactory } from '../../utils/helpers/service-factory';
import { config } from '../../utils/config/config';
import { SemanticVectorDB } from './semantic-vector-db';
import { VectorDB } from './vector-db';

export interface Document {
  pageContent: string;
  metadata: Record<string, string | number | boolean>;
}

export class HybridVectorDB {
  private maxResults: number;
  private semanticDB?: SemanticVectorDB;
  private currentDB?: VectorDB;
  private useSemanticSearch: boolean;

  constructor() {
    this.maxResults = config.getVectorDbConfig().maxResults;
    this.useSemanticSearch = process.env.USE_SEMANTIC_SEARCH === 'true';
  }

  private getSemanticDB() {
    if (!this.semanticDB) {
      this.semanticDB = new SemanticVectorDB();
    }
    return this.semanticDB;
  }

  private getCurrentDB() {
    if (!this.currentDB) {
      this.currentDB = new VectorDB();
    }
    return this.currentDB;
  }

  async search(query: string, k: number = 3, clientIdentifier?: string): Promise<Document[]> {
    console.log(`🔍 Hybrid search: semantic=${this.useSemanticSearch}, query="${query}"`);
    
    if (this.useSemanticSearch) {
      try {
        const semanticResults = await this.getSemanticDB().search(query, k);
        if (semanticResults.length > 0) {
          console.log(`✅ Semantic search returned ${semanticResults.length} results`);
          return semanticResults;
        }
      } catch (error) {
        console.error('Semantic search failed, falling back to current system:', error);
      }
    }
    
    console.log(`🔄 Using current vector search system`);
    return this.getCurrentDB().search(query, k, clientIdentifier);
  }

  async addContent(chunks: any[], embeddings: number[][]) {
    await Promise.all([
      this.getSemanticDB().addContent(chunks, embeddings),
      this.getCurrentDB().addContent(chunks, embeddings)
    ]);
  }

  async getDocumentCount(): Promise<number> {
    const stats = await this.getCurrentDB().getStats();
    return stats.documentCount || 0;
  }

  async clear() {
    await Promise.all([
      this.getSemanticDB().clear(),
      this.getCurrentDB().clear()
    ]);
  }

  async getStats() {
    const currentStats = await this.getCurrentDB().getStats();
    const semanticCount = await this.getSemanticDB().getDocumentCount();
    
    return {
      ...currentStats,
      semanticDocumentCount: semanticCount,
      useSemanticSearch: this.useSemanticSearch
    };
  }

  setSemanticSearch(enabled: boolean) {
    this.useSemanticSearch = enabled;
    console.log(`🔧 Semantic search ${enabled ? 'enabled' : 'disabled'}`);
  }

  isSemanticSearchEnabled(): boolean {
    return this.useSemanticSearch;
  }
}

 