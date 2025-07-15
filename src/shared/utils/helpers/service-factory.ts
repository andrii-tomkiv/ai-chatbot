import { config } from '../config/config';
import { 
  LLMProviderManager, 
  createLLMProvider
} from '../../infrastructure/ai-providers/llm-provider';
import { MistralProviderImpl } from '../../infrastructure/ai-providers/mistral-provider';
import { GroqProviderImpl } from '../../infrastructure/ai-providers/groq-provider';
import { LangChainProviderImpl } from '../../infrastructure/ai-providers/langchain-provider';
import { 
  EmbeddingProviderManager, 
  createEmbeddingProvider 
} from '../../infrastructure/ai-providers/embedding-provider';
import { VectorDBSupabase } from '../../infrastructure/vector-store/vector-db-supabase';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private llmManager!: LLMProviderManager;
  private embeddingManager!: EmbeddingProviderManager;
  private vectorDB!: VectorDBSupabase;
  private langChainProvider!: LangChainProviderImpl;

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
    this.initializeLangChainProvider();
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
      console.log(`🤖 Registering Mistral provider with model: ${mistralConfig.chatModel}`);
      console.log(`🤖 Mistral config:`, mistralConfig);
      const mistralProvider = new MistralProviderImpl({
        model: mistralConfig.chatModel,
        maxTokens: config.getChatConfig().maxTokens,
        temperature: config.getChatConfig().temperature,
      });
      this.llmManager.registerProvider('mistral', mistralProvider);
      console.log(`✅ Mistral provider registered successfully`);
    } else {
      console.log(`⚠️ Mistral API key not found, skipping Mistral provider registration`);
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
    console.log('🗄️ Initializing Supabase VectorDB...');
    this.vectorDB = new VectorDBSupabase();
    console.log('✅ Supabase VectorDB initialized');
  }

  private initializeLangChainProvider(): void {
    console.log('🔗 Initializing LangChain Provider...');
    this.langChainProvider = new LangChainProviderImpl({
      model: config.getModels().mistral.chat,
      maxTokens: config.getChatConfig().maxTokens,
      temperature: config.getChatConfig().temperature,
      useChains: true,
      useAgents: false,
      chainType: 'conversation',
    });
    console.log('✅ LangChain Provider initialized');
  }

  getLLMManager(): LLMProviderManager {
    return this.llmManager;
  }

  getEmbeddingManager(): EmbeddingProviderManager {
    return this.embeddingManager;
  }

  getVectorDB(): VectorDBSupabase {
    return this.vectorDB;
  }

  getLangChainProvider(): LangChainProviderImpl {
    return this.langChainProvider;
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
      const count = await this.vectorDB.getDocumentCount();
      console.log(`📊 VectorDB health check: ${count} documents found`);
      results.vectorDb = true;
    } catch (error) {
      errors.push(`VectorDB health check failed: ${error}`);
    }

    return results;
  }
}

export const serviceFactory = ServiceFactory.getInstance(); 