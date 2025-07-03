export interface AppConfig {
  llm: {
    primary: string;
    fallback: string;
    timeoutMs: number;
  };
  
  embedding: {
    primary: string;
    fallback: string;
    timeoutMs: number;
    maxRetries: number;
  };
  
  vectorDb: {
    storePath: string;
    maxResults: number;
    searchTimeoutMs: number;
  };
  
  apiKeys: {
    mistral?: string;
    groq?: string;
  };
  
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
  
  chat: {
    maxTokens: number;
    temperature: number;
    maxHistoryLength: number;
  };
  
  providers: {
    mistral: {
      maxTemperature: number;
      defaultTemperature: number;
    };
    groq: {
      maxTemperature: number;
      defaultTemperature: number;
    };
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
        primary: 'mistral',
        fallback: 'text',
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
          embedding: process.env.GROQ_EMBEDDING_MODEL || 'text-embedding-3-small',
        },
      },
      
      chat: {
        maxTokens: parseInt(process.env.CHAT_MAX_TOKENS || '1000'),
        temperature: parseFloat(process.env.CHAT_TEMPERATURE || '0.7'),
        maxHistoryLength: parseInt(process.env.CHAT_MAX_HISTORY_LENGTH || '10'),
      },
      
      providers: {
        mistral: {
          maxTemperature: 1.5,
          defaultTemperature: 0.7,
        },
        groq: {
          maxTemperature: 2.0,
          defaultTemperature: 0.7,
        },
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

  getProviderConfig(provider: 'mistral' | 'groq') {
    return this.config.providers[provider];
  }

  validateTemperature(provider: 'mistral' | 'groq', temperature: number): { isValid: boolean; error?: string } {
    const providerConfig = this.config.providers[provider];
    const maxTemp = providerConfig.maxTemperature;
    
    if (temperature < 0 || temperature > maxTemp) {
      return {
        isValid: false,
        error: `Temperature for ${provider} must be between 0.0 and ${maxTemp}. Got: ${temperature}`
      };
    }
    
    return { isValid: true };
  }

  getValidatedTemperature(provider: 'mistral' | 'groq', temperature?: number): number {
    if (temperature === undefined) {
      return this.config.providers[provider].defaultTemperature;
    }
    
    const validation = this.validateTemperature(provider, temperature);
    if (!validation.isValid) {
      console.warn(`[CONFIG] ${validation.error}, using default temperature`);
      return this.config.providers[provider].defaultTemperature;
    }
    
    return temperature;
  }

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

    // No validation for text fallback (text search is always available)

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export const config = ConfigManager.getInstance(); 