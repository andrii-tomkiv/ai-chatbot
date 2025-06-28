export interface AppConfig {
  // LLM Providers
  llm: {
    primary: string;
    fallback: string;
    timeoutMs: number;
  };
  
  // Embedding Providers
  embedding: {
    primary: string;
    fallback: string;
    timeoutMs: number;
    maxRetries: number;
  };
  
  // Vector Database
  vectorDb: {
    storePath: string;
    maxResults: number;
    searchTimeoutMs: number;
  };
  
  // API Keys
  apiKeys: {
    mistral?: string;
    groq?: string;
  };
  
  // Models
  models: {
    mistral: {
      chat: string;
      embedding: string;
    };
    groq: {
      chat: string;
      embedding: string;
    };
  };
  
  // Chat Settings
  chat: {
    maxTokens: number;
    temperature: number;
    maxHistoryLength: number;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    return {
      llm: {
        primary: process.env.LLM_PRIMARY_PROVIDER || 'mistral',
        fallback: process.env.LLM_FALLBACK_PROVIDER || 'groq',
        timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '5000'),
      },
      
      embedding: {
        primary: process.env.EMBEDDING_PRIMARY_PROVIDER || 'mistral',
        fallback: process.env.EMBEDDING_FALLBACK_PROVIDER || 'groq',
        timeoutMs: parseInt(process.env.EMBEDDING_TIMEOUT_MS || '10000'),
        maxRetries: parseInt(process.env.EMBEDDING_MAX_RETRIES || '3'),
      },
      
      vectorDb: {
        storePath: process.env.VECTOR_DB_STORE_PATH || './data/vector-store',
        maxResults: parseInt(process.env.VECTOR_DB_MAX_RESULTS || '5'),
        searchTimeoutMs: parseInt(process.env.VECTOR_DB_SEARCH_TIMEOUT_MS || '15000'),
      },
      
      apiKeys: {
        mistral: process.env.MISTRAL_API_KEY,
        groq: process.env.GROQ_API_KEY,
      },
      
      models: {
        mistral: {
          chat: process.env.MISTRAL_CHAT_MODEL || 'mistral-small-latest',
          embedding: process.env.MISTRAL_EMBEDDING_MODEL || 'mistral-embed',
        },
        groq: {
          chat: process.env.GROQ_CHAT_MODEL || 'llama3-70b-8192',
          embedding: process.env.GROQ_EMBEDDING_MODEL || 'llama3-70b-8192',
        },
      },
      
      chat: {
        maxTokens: parseInt(process.env.CHAT_MAX_TOKENS || '1000'),
        temperature: parseFloat(process.env.CHAT_TEMPERATURE || '0.7'),
        maxHistoryLength: parseInt(process.env.CHAT_MAX_HISTORY_LENGTH || '10'),
      },
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getLLMConfig() {
    return this.config.llm;
  }

  getEmbeddingConfig() {
    return this.config.embedding;
  }

  getVectorDbConfig() {
    return this.config.vectorDb;
  }

  getApiKeys() {
    return this.config.apiKeys;
  }

  getModels() {
    return this.config.models;
  }

  getChatConfig() {
    return this.config.chat;
  }

  // Helper methods for specific configurations
  getMistralConfig() {
    return {
      apiKey: this.config.apiKeys.mistral,
      chatModel: this.config.models.mistral.chat,
      embeddingModel: this.config.models.mistral.embedding,
    };
  }

  getGroqConfig() {
    return {
      apiKey: this.config.apiKeys.groq,
      chatModel: this.config.models.groq.chat,
      embeddingModel: this.config.models.groq.embedding,
    };
  }

  // Validation methods
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required API keys
    if (this.config.llm.primary === 'mistral' && !this.config.apiKeys.mistral) {
      errors.push('MISTRAL_API_KEY is required when using Mistral as primary LLM provider');
    }

    if (this.config.llm.fallback === 'groq' && !this.config.apiKeys.groq) {
      errors.push('GROQ_API_KEY is required when using Groq as fallback LLM provider');
    }

    if (this.config.embedding.primary === 'mistral' && !this.config.apiKeys.mistral) {
      errors.push('MISTRAL_API_KEY is required when using Mistral as primary embedding provider');
    }

    // Note: Groq embeddings are not yet implemented, so we'll use text search as fallback
    if (this.config.embedding.fallback === 'groq' && !this.config.apiKeys.groq) {
      errors.push('GROQ_API_KEY is required when using Groq as fallback embedding provider');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Update config at runtime (useful for testing)
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance(); 