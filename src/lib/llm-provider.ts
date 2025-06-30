import { streamText } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { config } from './config';
import { GroqProviderImpl } from './groq-provider';
import { MistralProviderImpl } from './mistral-provider';

export interface LLMConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMProvider {
  generateResponse(messages: Message[], config?: Partial<LLMConfig>): Promise<LLMResponse>;
  generateStreamingResponse(messages: Message[], config?: Partial<LLMConfig>): AsyncGenerator<string>;
}

export class MockLLMProvider implements LLMProvider {
  private responses: string[] = [
    "I'm a mock response for testing purposes.",
    "This is another mock response to simulate different scenarios.",
    "Mock response with some detailed information about ConceiveAbilities services.",
  ];
  private currentIndex = 0;

  async generateResponse(messages: Message[]): Promise<LLMResponse> {
    const response = this.responses[this.currentIndex % this.responses.length];
    this.currentIndex++;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const promptTokens = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    
    return {
      content: response,
      usage: {
        promptTokens,
        completionTokens: response.length,
        totalTokens: promptTokens + response.length,
      },
    };
  }

  async *generateStreamingResponse(): AsyncGenerator<string> {
    const response = this.responses[this.currentIndex % this.responses.length];
    this.currentIndex++;
    
    for (const char of response) {
      await new Promise(resolve => setTimeout(resolve, 10));
      yield char;
    }
  }
}

export class LLMProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private currentProvider: string;
  private fallbackProvider: string;
  private timeoutMs: number = 5000;

  constructor(primaryProvider: string, fallbackProvider: string = 'groq', timeoutMs: number = 5000) {
    this.currentProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider;
    this.timeoutMs = timeoutMs;
  }

  registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
  }

  setCurrentProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not found`);
    }
    this.currentProvider = name;
    console.log(`Switched to provider: ${name}`);
  }

  setFallbackProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not found`);
    }
    this.fallbackProvider = name;
    console.log(`Set fallback provider to: ${name}`);
  }

  getCurrentProvider(): LLMProvider {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`Current provider '${this.currentProvider}' not found`);
    }
    return provider;
  }

  async generateResponseWithFallback(messages: Message[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting response generation with provider: ${this.currentProvider}`);
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.log(`[${new Date().toISOString()}] TIMEOUT: Provider ${this.currentProvider} exceeded ${this.timeoutMs}ms`);
          reject(new Error(`Provider ${this.currentProvider} timed out after ${this.timeoutMs}ms`));
        }, this.timeoutMs);
      });

      const result = await Promise.race([
        this.getCurrentProvider().generateResponse(messages, config),
        timeoutPromise
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] SUCCESS: Generated response with ${this.currentProvider} in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.warn(`[${new Date().toISOString()}] FAILED: Primary provider (${this.currentProvider}) failed after ${duration}ms, falling back to ${this.fallbackProvider}:`, error);
      
      try {
        console.log(`[${new Date().toISOString()}] SWITCHING: Attempting fallback to ${this.fallbackProvider}`);
        const fallbackResult = await this.providers.get(this.fallbackProvider)?.generateResponse(messages, config);
        if (fallbackResult) {
          const totalDuration = Date.now() - startTime;
          console.log(`[${new Date().toISOString()}] SUCCESS: Generated response with fallback provider ${this.fallbackProvider} in ${totalDuration}ms total`);
          return fallbackResult;
        }
      } catch (fallbackError) {
        const totalDuration = Date.now() - startTime;
        console.error(`[${new Date().toISOString()}] FAILED: Fallback provider (${this.fallbackProvider}) also failed after ${totalDuration}ms total:`, fallbackError);
      }
      
      throw error;
    }
  }

  getFallbackProvider(): LLMProvider | undefined {
    return this.providers.get(this.fallbackProvider);
  }

  private getProviderForModel(model?: string): string {
    if (!model) {
      return this.currentProvider;
    }
    
    // Determine provider based on model name
    if (model.includes('mistral') || model.includes('small') || model.includes('large') || model.includes('medium')) {
      return 'mistral';
    } else if (model.includes('groq') || model.includes('llama') || model.includes('mixtral') || model.includes('gemma')) {
      return 'groq';
    }
    
    // Default to current provider if model doesn't match known patterns
    return this.currentProvider;
  }

  async *generateStreamingResponseWithFallback(messages: Message[], configOverride?: Partial<LLMConfig>): AsyncGenerator<string> {
    // Use the current provider (user's choice) instead of determining from model name
    const providerToUse = this.currentProvider;
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting streaming response with provider: ${providerToUse} (user selected: ${providerToUse}, model: ${configOverride?.model})`);
    
    try {
      const provider = this.providers.get(providerToUse);
      if (!provider) {
        throw new Error(`Provider '${providerToUse}' not found for model '${configOverride?.model}'`);
      }
      
      const stream = provider.generateStreamingResponse(messages, configOverride);
      let hasContent = false;
      let firstChunkTime = 0;
      
      for await (const text of stream) {
        if (!hasContent) {
          firstChunkTime = Date.now() - startTime;
          console.log(`[${new Date().toISOString()}] FIRST CHUNK: Received first response from ${providerToUse} after ${firstChunkTime}ms`);
          hasContent = true;
        }
        
        yield text;
      }
      
      if (!hasContent) {
        console.log(`[${new Date().toISOString()}] NO CONTENT: No content received from ${providerToUse}`);
        throw new Error('No content received from primary provider');
      }
      
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] SUCCESS: Completed streaming response with ${providerToUse} in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.warn(`[${new Date().toISOString()}] FAILED: Primary provider (${providerToUse}) failed after ${duration}ms, trying fallback provider:`, error);
      
      // Use the configured fallback provider
      console.log(`[${new Date().toISOString()}] SWITCHING: Attempting fallback provider: ${this.fallbackProvider}`);
      
      try {
        // Create fallback config with appropriate model for the fallback provider
        const fallbackConfig = { ...configOverride };
        if (this.fallbackProvider === 'mistral') {
          fallbackConfig.model = config.getModels().mistral.chat;
        } else if (this.fallbackProvider === 'groq') {
          fallbackConfig.model = config.getModels().groq.chat;
        }
        
        const fallbackStream = this.providers.get(this.fallbackProvider)?.generateStreamingResponse(messages, fallbackConfig);
        if (fallbackStream) {
          for await (const text of fallbackStream) {
            yield text;
          }
          const totalDuration = Date.now() - startTime;
          console.log(`[${new Date().toISOString()}] SUCCESS: Completed streaming response with fallback provider ${this.fallbackProvider} in ${totalDuration}ms total`);
        } else {
          throw new Error(`Fallback provider ${this.fallbackProvider} not available`);
        }
      } catch (fallbackError) {
        const totalDuration = Date.now() - startTime;
        console.error(`[${new Date().toISOString()}] FAILED: Fallback provider (${this.fallbackProvider}) also failed after ${totalDuration}ms total:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  getProviderStatus(): { current: string; fallback: string; available: string[] } {
    return {
      current: this.currentProvider,
      fallback: this.fallbackProvider,
      available: Array.from(this.providers.keys()),
    };
  }
}

export function createLLMProvider(type: 'mistral' | 'groq' | 'mock', config?: Partial<LLMConfig>): LLMProvider {
  switch (type) {
    case 'mistral':
      return new MistralProviderImpl(config);
    case 'groq':
      return new GroqProviderImpl(config);
    case 'mock':
      return new MockLLMProvider();
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

export { GroqProviderImpl };