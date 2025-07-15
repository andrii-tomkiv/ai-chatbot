import { serviceFactory } from '../../utils/helpers/service-factory';
import { config } from '../../utils/config/config';

export interface Document {
  pageContent: string;
  metadata: Record<string, string | number | boolean>;
}

export interface SemanticDocument extends Document {
  embedding: number[];
  semanticTopic?: string;
  semanticTags?: string[];
  contentSummary?: string;
}

export class SemanticVectorDB {
  private maxResults: number;
  private llmProvider: any;
  private storePath: string;
  private dataPath: string;

  constructor(storePath: string = './data/vector-store') {
    this.maxResults = config.getVectorDbConfig().maxResults;
    this.storePath = storePath;
    this.dataPath = `${storePath}/documents.json`;
  }

  private getLLMProvider() {
    if (!this.llmProvider) {
      this.llmProvider = serviceFactory.getLLMManager().getCurrentProvider();
    }
    return this.llmProvider;
  }

  async search(query: string, k: number = 3): Promise<Document[]> {
    console.log(`🧠 Starting TRUE semantic search for: "${query}"`);
    
    try {
      const queryAnalysis = await this.analyzeQuerySemantically(query);
      console.log(`🎯 Semantic analysis:`, queryAnalysis);
      
      const documents = this.loadDocuments();
      const documentsWithEmbeddings = documents.filter(doc => doc.embedding.length > 0);
      
      const semanticallyRelevantDocs = await this.filterBySemanticRelevance(
        queryAnalysis, 
        documentsWithEmbeddings
      );
      
      const queryEmbedding = await this.generateQueryEmbedding(query);
      const scoredDocs = this.calculateSimilarities(queryEmbedding, semanticallyRelevantDocs);
      
      const finalResults = await this.semanticRerank(query, queryAnalysis, scoredDocs, k);
      
      console.log(`✅ Semantic search completed with ${finalResults.length} results`);
      return finalResults;
      
    } catch (error) {
      console.error('Semantic search failed:', error);
      return this.fallbackToCurrentSystem(query, k);
    }
  }

  private async analyzeQuerySemantically(query: string) {
    const prompt = `Analyze this query semantically and provide structured information:

Query: "${query}"

Provide a JSON response with:
{
  "primaryTopic": "surrogacy|egg-donation|intended-parents|general",
  "intent": "information-seeking|application|comparison|support",
  "semanticKeywords": ["array", "of", "semantic", "concepts"],
  "relatedConcepts": ["array", "of", "related", "terms"],
  "userType": "intended-parent|surrogate|egg-donor|general",
  "complexity": "basic|intermediate|advanced"
}

Consider meaning, not just exact words.`;

    try {
      const response = await this.getLLMProvider().generateResponse([
        { role: 'user', content: prompt }
      ]);
      return JSON.parse(response);
    } catch (error) {
      console.error('Semantic analysis failed:', error);
      return {
        primaryTopic: 'general',
        intent: 'information-seeking',
        semanticKeywords: [],
        relatedConcepts: [],
        userType: 'general',
        complexity: 'basic'
      };
    }
  }

  private async filterBySemanticRelevance(queryAnalysis: any, documents: SemanticDocument[]) {
    const relevantDocs: SemanticDocument[] = [];
    
    for (const doc of documents) {
      const docSemantics = await this.getDocumentSemantics(doc);
      
      const relevanceScore = this.calculateSemanticRelevance(queryAnalysis, docSemantics);
      
      if (relevanceScore > 0.3) {
        relevantDocs.push(doc);
      }
    }
    
    console.log(`📊 Semantic filtering: ${relevantDocs.length}/${documents.length} documents relevant`);
    return relevantDocs;
  }

  private async getDocumentSemantics(document: SemanticDocument) {
    if (document.semanticTopic && document.semanticTags) {
      return {
        topic: document.semanticTopic,
        tags: document.semanticTags,
        summary: document.contentSummary
      };
    }
    
    const prompt = `Analyze this document semantically:

Title: "${document.metadata.title}"
Content: "${document.pageContent.substring(0, 500)}..."

Provide JSON:
{
  "topic": "surrogacy|egg-donation|intended-parents|general",
  "tags": ["array", "of", "semantic", "tags"],
  "summary": "brief semantic summary",
  "userType": "intended-parent|surrogate|egg-donor|general"
}`;

    try {
      const response = await this.getLLMProvider().generateResponse([
        { role: 'user', content: prompt }
      ]);
      const semantics = JSON.parse(response);
      
      document.semanticTopic = semantics.topic;
      document.semanticTags = semantics.tags;
      document.contentSummary = semantics.summary;
      
      return semantics;
    } catch (error) {
      console.error('Document semantic analysis failed:', error);
      return {
        topic: 'general',
        tags: [],
        summary: '',
        userType: 'general'
      };
    }
  }

  private calculateSemanticRelevance(queryAnalysis: any, docSemantics: any): number {
    let score = 0;
    
    if (queryAnalysis.primaryTopic === docSemantics.topic) {
      score += 0.4;
    }
    
    if (queryAnalysis.userType === docSemantics.userType) {
      score += 0.3;
    }
    
    const keywordOverlap = this.calculateKeywordOverlap(
      queryAnalysis.semanticKeywords, 
      docSemantics.tags
    );
    score += keywordOverlap * 0.2;
    
    const conceptOverlap = this.calculateKeywordOverlap(
      queryAnalysis.relatedConcepts, 
      docSemantics.tags
    );
    score += conceptOverlap * 0.1;
    
    return Math.min(1, score);
  }

  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    const set1 = new Set(keywords1.map(k => k.toLowerCase()));
    const set2 = new Set(keywords2.map(k => k.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private async semanticRerank(query: string, queryAnalysis: any, scoredDocs: any[], k: number) {
    const rerankedDocs = [];
    
    for (const doc of scoredDocs.slice(0, k * 2)) {
      const semanticScore = await this.calculateSemanticScore(query, queryAnalysis, doc);
      const finalScore = (doc.similarity * 0.6) + (semanticScore * 0.4);
      
      rerankedDocs.push({
        ...doc,
        finalScore
      });
    }
    
    return rerankedDocs
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, k)
      .map(doc => ({
        pageContent: doc.document.pageContent,
        metadata: doc.document.metadata
      }));
  }

  private async calculateSemanticScore(query: string, queryAnalysis: any, doc: any): Promise<number> {
    const prompt = `Rate the semantic relevance of this document to the query (0-1):

Query: "${query}"
Query Intent: ${queryAnalysis.intent}
Query Topic: ${queryAnalysis.primaryTopic}

Document Title: "${doc.document.metadata.title}"
Document Content: "${doc.document.pageContent.substring(0, 300)}..."

Rate from 0 (completely irrelevant) to 1 (perfectly relevant).
Consider meaning, context, and user intent, not just keyword matching.

Response: Just the number (e.g., 0.85)`;

    try {
      const response = await this.getLLMProvider().generateResponse([
        { role: 'user', content: prompt }
      ]);
      const score = parseFloat(response.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      console.error('Semantic scoring failed:', error);
      return 0.5;
    }
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    return await serviceFactory.generateEmbedding(query);
  }

  private calculateSimilarities(queryEmbedding: number[], documents: SemanticDocument[]) {
    return documents.map(doc => ({
      document: doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    })).sort((a, b) => b.similarity - a.similarity);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
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

  private fallbackToCurrentSystem(query: string, k: number): Document[] {
    console.log(`🔄 Falling back to current vector search system`);
    const { vectorDB } = require('./vector-db');
    return vectorDB.search(query, k);
  }

  private loadDocuments(): SemanticDocument[] {
    const fs = require('fs');
    
    if (!fs.existsSync(this.dataPath)) {
      console.log(`📁 No documents found at ${this.dataPath}`);
      return [];
    }
    
    try {
      const data = fs.readFileSync(this.dataPath, 'utf-8');
      const documents = JSON.parse(data);
      console.log(`📚 Loaded ${documents.length} documents from ${this.dataPath}`);
      return documents;
    } catch (error) {
      console.error('Error loading documents:', error);
      return [];
    }
  }

  async addContent(chunks: any[], embeddings: number[][]) {
    const fs = require('fs');
    
    const documents: SemanticDocument[] = chunks.map((chunk, index) => ({
      pageContent: chunk.content,
      metadata: {
        id: chunk.id,
        url: chunk.url,
        ...chunk.metadata,
      },
      embedding: embeddings[index] || []
    }));

    const existingDocuments = this.loadDocuments();
    const allDocuments = [...existingDocuments, ...documents];
    
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }
    
    fs.writeFileSync(this.dataPath, JSON.stringify(allDocuments, null, 2));
    console.log(`✅ Added ${documents.length} documents to semantic vector store`);
  }

  async getDocumentCount(): Promise<number> {
    const documents = this.loadDocuments();
    return documents.length;
  }

  async clear() {
    const fs = require('fs');
    if (fs.existsSync(this.storePath)) {
      fs.rmSync(this.storePath, { recursive: true, force: true });
      console.log(`✅ Cleared semantic vector store: ${this.storePath}`);
    }
  }
} 