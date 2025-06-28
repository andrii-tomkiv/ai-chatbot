import { config } from './config';
import { 
  LLMProviderManager, 
  createLLMProvider, 
  MistralProvider, 
  GroqProviderImpl 
} from './llm-provider';
import { 
  EmbeddingProviderManager, 
  createEmbeddingProvider 
} from './embedding-provider';
import { VectorDB } from './vector-db';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private llmManager!: LLMProviderManager;
  private embeddingManager!: EmbeddingProviderManager;
  private vectorDB!: VectorDB;

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  private initializeServices(): void {
    console.log('🏭 Initializing ServiceFactory...');
    
    // Validate configuration
    const validation = config.validateConfig();
    if (!validation.isValid) {
      console.error('❌ Configuration validation failed:', validation.errors);
      throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
    }

    // Initialize LLM Provider Manager
    this.initializeLLMManager();
    
    // Initialize Embedding Provider Manager
    this.initializeEmbeddingManager();
    
    // Initialize Vector Database
    this.initializeVectorDB();
    
    console.log('✅ ServiceFactory initialized successfully');
  }

  private initializeLLMManager(): void {
    const llmConfig = config.getLLMConfig();
    console.log(`🤖 Initializing LLM Manager: ${llmConfig.primary} -> ${llmConfig.fallback}`);
    
    this.llmManager = new LLMProviderManager(
      llmConfig.primary,
      llmConfig.fallback,
      llmConfig.timeoutMs
    );

    // Register Mistral provider
    if (config.getApiKeys().mistral) {
      const mistralConfig = config.getMistralConfig();
      const mistralProvider = new MistralProvider({
        model: mistralConfig.chatModel,
        maxTokens: config.getChatConfig().maxTokens,
        temperature: config.getChatConfig().temperature,
      });
      this.llmManager.registerProvider('mistral', mistralProvider);
      console.log('✅ Registered Mistral LLM provider');
    }

    // Register Groq provider
    if (config.getApiKeys().groq) {
      const groqConfig = config.getGroqConfig();
      const groqProvider = new GroqProviderImpl({
        model: groqConfig.chatModel,
        maxTokens: config.getChatConfig().maxTokens,
        temperature: config.getChatConfig().temperature,
      });
      this.llmManager.registerProvider('groq', groqProvider);
      console.log('✅ Registered Groq LLM provider');
    }

    // Register mock provider for testing
    const mockProvider = createLLMProvider('mock');
    this.llmManager.registerProvider('mock', mockProvider);
    console.log('✅ Registered Mock LLM provider');
  }

  private initializeEmbeddingManager(): void {
    const embeddingConfig = config.getEmbeddingConfig();
    console.log(`🧠 Initializing Embedding Manager: ${embeddingConfig.primary} -> ${embeddingConfig.fallback}`);
    
    this.embeddingManager = new EmbeddingProviderManager(
      embeddingConfig.primary,
      embeddingConfig.fallback
    );

    // Register Mistral embedding provider
    if (config.getApiKeys().mistral) {
      const mistralConfig = config.getMistralConfig();
      const mistralEmbedding = createEmbeddingProvider('mistral', {
        model: mistralConfig.embeddingModel,
        apiKey: config.getApiKeys().mistral!,
        timeoutMs: embeddingConfig.timeoutMs,
        maxRetries: embeddingConfig.maxRetries,
      });
      this.embeddingManager.registerProvider('mistral', mistralEmbedding);
      console.log('✅ Registered Mistral embedding provider');
    }

    // Register Groq embedding provider (placeholder)
    if (config.getApiKeys().groq) {
      const groqConfig = config.getGroqConfig();
      const groqEmbedding = createEmbeddingProvider('groq', {
        model: groqConfig.embeddingModel,
        apiKey: config.getApiKeys().groq!,
        timeoutMs: embeddingConfig.timeoutMs,
        maxRetries: embeddingConfig.maxRetries,
      });
      this.embeddingManager.registerProvider('groq', groqEmbedding);
      console.log('✅ Registered Groq embedding provider (placeholder)');
    }
  }

  private initializeVectorDB(): void {
    const vectorDbConfig = config.getVectorDbConfig();
    console.log(`🗄️  Initializing VectorDB: ${vectorDbConfig.storePath}`);
    
    this.vectorDB = new VectorDB(vectorDbConfig.storePath);
    console.log('✅ VectorDB initialized');
  }

  // Public getters
  getLLMManager(): LLMProviderManager {
    return this.llmManager;
  }

  getEmbeddingManager(): EmbeddingProviderManager {
    return this.embeddingManager;
  }

  getVectorDB(): VectorDB {
    return this.vectorDB;
  }

  // Convenience methods
  async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddingManager.generateEmbedding(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return this.embeddingManager.generateEmbeddings(texts);
  }

  // Health check method
  async healthCheck(): Promise<{
    llm: boolean;
    embedding: boolean;
    vectorDb: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const results = {
      llm: false,
      embedding: false,
      vectorDb: false,
      errors,
    };

    try {
      // Test LLM
      const llmProvider = this.llmManager.getCurrentProvider();
      if (llmProvider) {
        await llmProvider.generateResponse([
          { role: 'user', content: 'test' }
        ], { maxTokens: 10 });
        results.llm = true;
      }
    } catch (error) {
      errors.push(`LLM health check failed: ${error}`);
    }

    try {
      // Test embedding
      await this.embeddingManager.generateEmbedding('test');
      results.embedding = true;
    } catch (error) {
      errors.push(`Embedding health check failed: ${error}`);
    }

    try {
      // Test vector DB
      await this.vectorDB.search('test', 1);
      results.vectorDb = true;
    } catch (error) {
      errors.push(`VectorDB health check failed: ${error}`);
    }

    return results;
  }
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance(); 