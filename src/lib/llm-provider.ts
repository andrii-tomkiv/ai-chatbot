import { streamText } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { GroqProviderImpl } from './groq-provider';

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

export class MistralProvider implements LLMProvider {
  private defaultConfig: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.defaultConfig = {
      model: 'mistral-small-latest',
      maxTokens: 1000,
      temperature: 0.7,
      ...config,
    };
  }

  async generateResponse(messages: Message[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      const { textStream } = streamText({
        model: mistral(finalConfig.model),
        messages: messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
        maxTokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      });

      let content = '';
      for await (const text of textStream) {
        content += text;
      }

      if (!content.trim()) {
        throw new Error('No response content received from Mistral API');
      }

      return {
        content,
        usage: {
          promptTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0),
          completionTokens: content.length,
          totalTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0) + content.length,
        },
      };
    } catch (error) {
      console.error('Mistral API error:', error);
      
      // Check for specific error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        throw new Error('Mistral API authentication failed - invalid API key');
      } else if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        throw new Error('Mistral API rate limit exceeded');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal server error')) {
        throw new Error('Mistral API server error');
      } else {
        throw new Error(`Mistral API error: ${errorMessage}`);
      }
    }
  }

  async *generateStreamingResponse(messages: Message[], config?: Partial<LLMConfig>): AsyncGenerator<string> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      const { textStream } = streamText({
        model: mistral(finalConfig.model),
        messages: messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
        maxTokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      });

      let hasContent = false;
      for await (const text of textStream) {
        hasContent = true;
        yield text;
      }

      if (!hasContent) {
        throw new Error('No response content received from Mistral API');
      }
    } catch (error) {
      console.error('Mistral streaming error:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        throw new Error('Mistral API authentication failed - invalid API key');
      } else if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        throw new Error('Mistral API rate limit exceeded');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal server error')) {
        throw new Error('Mistral API server error');
      } else {
        throw new Error(`Mistral API error: ${errorMessage}`);
      }
    }
  }
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

  async *generateStreamingResponseWithFallback(messages: Message[], config?: Partial<LLMConfig>): AsyncGenerator<string> {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting streaming response with provider: ${this.currentProvider}`);
    
    try {
      const stream = this.getCurrentProvider().generateStreamingResponse(messages, config);
      let hasContent = false;
      let firstChunkTime = 0;
      
      for await (const text of stream) {
        if (!hasContent) {
          firstChunkTime = Date.now() - startTime;
          console.log(`[${new Date().toISOString()}] FIRST CHUNK: Received first response from ${this.currentProvider} after ${firstChunkTime}ms`);
          hasContent = true;
        }
        
        yield text;
      }
      
      if (!hasContent) {
        console.log(`[${new Date().toISOString()}] NO CONTENT: No content received from ${this.currentProvider}`);
        throw new Error('No content received from primary provider');
      }
      
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] SUCCESS: Completed streaming response with ${this.currentProvider} in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.warn(`[${new Date().toISOString()}] FAILED: Primary provider (${this.currentProvider}) failed after ${duration}ms, falling back to ${this.fallbackProvider}:`, error);
      
      try {
        console.log(`[${new Date().toISOString()}] SWITCHING: Attempting streaming fallback to ${this.fallbackProvider}`);
        const fallbackStream = this.providers.get(this.fallbackProvider)?.generateStreamingResponse(messages, config);
        if (fallbackStream) {
          for await (const text of fallbackStream) {
            yield text;
          }
          const totalDuration = Date.now() - startTime;
          console.log(`[${new Date().toISOString()}] SUCCESS: Completed streaming response with fallback provider ${this.fallbackProvider} in ${totalDuration}ms total`);
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

  getFallbackProvider(): LLMProvider | undefined {
    return this.providers.get(this.fallbackProvider);
  }
}

export function createLLMProvider(type: 'mistral' | 'groq' | 'mock', config?: Partial<LLMConfig>): LLMProvider {
  switch (type) {
    case 'mistral':
      return new MistralProvider(config);
    case 'groq':
      return new GroqProviderImpl(config);
    case 'mock':
      return new MockLLMProvider();
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

export { GroqProviderImpl };