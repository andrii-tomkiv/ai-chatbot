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
    const validation = config.validateConfig();
    if (!validation.isValid) {
      console.error('❌ Configuration validation failed:', validation.errors);
      throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
    }
    this.initializeLLMManager();
    this.initializeEmbeddingManager();
    this.initializeVectorDB();
  }

  private initializeLLMManager(): void {
    const llmConfig = config.getLLMConfig();
    console.log(`🤖 Initializing LLM Manager: ${llmConfig.primary} -> ${llmConfig.fallback}`);
    
    this.llmManager = new LLMProviderManager(
      llmConfig.primary,
      llmConfig.fallback,
      llmConfig.timeoutMs
    );

    if (config.getApiKeys().mistral) {
      const mistralConfig = config.getMistralConfig();
      const mistralProvider = new MistralProvider({
        model: mistralConfig.chatModel,
        maxTokens: config.getChatConfig().maxTokens,
        temperature: config.getChatConfig().temperature,
      });
      this.llmManager.registerProvider('mistral', mistralProvider);
    }

    if (config.getApiKeys().groq) {
      const groqConfig = config.getGroqConfig();
      console.log(`🤖 Registering Groq provider with model: ${groqConfig.chatModel}`);
      console.log(`🤖 Groq config:`, groqConfig);
      const groqProvider = new GroqProviderImpl({
        model: groqConfig.chatModel,
        maxTokens: config.getChatConfig().maxTokens,
        temperature: config.getChatConfig().temperature,
      });
      this.llmManager.registerProvider('groq', groqProvider);
      console.log(`✅ Groq provider registered successfully`);
    } else {
      console.log(`⚠️ Groq API key not found, skipping Groq provider registration`);
    }

    const mockProvider = createLLMProvider('mock');
    this.llmManager.registerProvider('mock', mockProvider);
  }

  private initializeEmbeddingManager(): void {
    const embeddingConfig = config.getEmbeddingConfig();
    
    this.embeddingManager = new EmbeddingProviderManager(
      'mistral',
      'text'
    );

    if (config.getApiKeys().mistral) {
      const mistralConfig = config.getMistralConfig();
      const mistralEmbedding = createEmbeddingProvider('mistral', {
        model: mistralConfig.embeddingModel,
        apiKey: config.getApiKeys().mistral!,
        timeoutMs: embeddingConfig.timeoutMs,
        maxRetries: embeddingConfig.maxRetries,
      });
      this.embeddingManager.registerProvider('mistral', mistralEmbedding);
    }
  }

  private initializeVectorDB(): void {
    const vectorDbConfig = config.getVectorDbConfig();
    this.vectorDB = new VectorDB(vectorDbConfig.storePath);
  }

  getLLMManager(): LLMProviderManager {
    return this.llmManager;
  }

  getEmbeddingManager(): EmbeddingProviderManager {
    return this.embeddingManager;
  }

  getVectorDB(): VectorDB {
    return this.vectorDB;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddingManager.generateEmbedding(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return this.embeddingManager.generateEmbeddings(texts);
  }

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
      await this.embeddingManager.generateEmbedding('test');
      results.embedding = true;
    } catch (error) {
      errors.push(`Embedding health check failed: ${error}`);
    }

    try {
      await this.vectorDB.search('test', 1);
      results.vectorDb = true;
    } catch (error) {
      errors.push(`VectorDB health check failed: ${error}`);
    }

    return results;
  }
}

export const serviceFactory = ServiceFactory.getInstance(); 