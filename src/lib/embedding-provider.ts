export interface EmbeddingProvider {
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getModelName(): string;
  getProviderName(): string;
}

export interface EmbeddingConfig {
  model: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  protected config: EmbeddingConfig;
  protected timeoutMs: number;
  protected maxRetries: number;

  constructor(config: EmbeddingConfig) {
    this.config = config;
    this.timeoutMs = config.timeoutMs || 10000;
    this.maxRetries = config.maxRetries || 3;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return this.withTimeoutAndRetry(() => this._generateEmbeddings(texts));
  }

  protected abstract _generateEmbeddings(texts: string[]): Promise<number[][]>;
  abstract getModelName(): string;
  abstract getProviderName(): string;

  private async withTimeoutAndRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`${this.getProviderName()} embedding timed out after ${this.timeoutMs}ms`));
          }, this.timeoutMs);
        });

        const result = await Promise.race([operation(), timeoutPromise]);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`${this.getProviderName()} embedding attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error(`${this.getProviderName()} embedding failed after ${this.maxRetries} attempts`);
  }
}

export class MistralEmbeddingProvider extends BaseEmbeddingProvider {
  async _generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.mistral.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral embedding API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  }

  getModelName(): string {
    return this.config.model;
  }

  getProviderName(): string {
    return 'Mistral';
  }
}

export class GroqEmbeddingProvider extends BaseEmbeddingProvider {
  async _generateEmbeddings(_texts: string[]): Promise<number[][]> {
    throw new Error('Groq embedding provider not yet implemented');
  }

  getModelName(): string {
    return this.config.model;
  }

  getProviderName(): string {
    return 'Groq';
  }
}

export function createEmbeddingProvider(
  providerType: 'mistral' | 'groq',
  config: EmbeddingConfig
): EmbeddingProvider {
  switch (providerType) {
    case 'mistral':
      return new MistralEmbeddingProvider(config);
    case 'groq':
      return new GroqEmbeddingProvider(config);
    default:
      throw new Error(`Unknown embedding provider: ${providerType}`);
  }
}

export class EmbeddingProviderManager {
  private providers: Map<string, EmbeddingProvider> = new Map();
  private currentProvider: string;
  private fallbackProvider: string;

  constructor(primaryProvider: string, fallbackProvider: string = 'openai') {
    this.currentProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider;
  }

  registerProvider(name: string, provider: EmbeddingProvider): void {
    this.providers.set(name, provider);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const provider = this.providers.get(this.currentProvider);
      if (!provider) {
        throw new Error(`Provider ${this.currentProvider} not found`);
      }
      
      const embeddings = await provider.generateEmbeddings([text]);
      return embeddings[0];
    } catch (error) {
      console.warn(`Primary embedding provider (${this.currentProvider}) failed, trying fallback:`, error);
      
      const fallback = this.providers.get(this.fallbackProvider);
      if (fallback) {
        const embeddings = await fallback.generateEmbeddings([text]);
        return embeddings[0];
      }
      
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const provider = this.providers.get(this.currentProvider);
      if (!provider) {
        throw new Error(`Provider ${this.currentProvider} not found`);
      }
      
      return await provider.generateEmbeddings(texts);
    } catch (error) {
      console.warn(`Primary embedding provider (${this.currentProvider}) failed, trying fallback:`, error);
      
      const fallback = this.providers.get(this.fallbackProvider);
      if (fallback) {
        return await fallback.generateEmbeddings(texts);
      }
      
      throw error;
    }
  }

  getCurrentProvider(): EmbeddingProvider | undefined {
    return this.providers.get(this.currentProvider);
  }

  getFallbackProvider(): EmbeddingProvider | undefined {
    return this.providers.get(this.fallbackProvider);
  }
} 