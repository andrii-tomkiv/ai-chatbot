import { streamText } from 'ai';
import { mistral } from '@ai-sdk/mistral';

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

  constructor(primaryProvider: string, fallbackProvider: string = 'mock') {
    this.currentProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider;
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
    console.log(`Attempting to generate response with provider: ${this.currentProvider}`);
    
    try {
      const result = await this.getCurrentProvider().generateResponse(messages, config);
      console.log(`Successfully generated response with provider: ${this.currentProvider}`);
      return result;
    } catch (error) {
      console.warn(`Primary provider (${this.currentProvider}) failed, falling back to ${this.fallbackProvider}:`, error);
      
      this.setCurrentProvider(this.fallbackProvider);
      
      console.log(`Now using fallback provider: ${this.fallbackProvider}`);
      const fallbackResult = await this.getCurrentProvider().generateResponse(messages, config);
      console.log(`Successfully generated response with fallback provider: ${this.fallbackProvider}`);
      return fallbackResult;
    }
  }

  async *generateStreamingResponseWithFallback(messages: Message[], config?: Partial<LLMConfig>): AsyncGenerator<string> {
    console.log(`Attempting to generate streaming response with provider: ${this.currentProvider}`);
    
    try {
      yield* this.getCurrentProvider().generateStreamingResponse(messages, config);
      console.log(`Successfully completed streaming response with provider: ${this.currentProvider}`);
    } catch (error) {
      console.warn(`Primary provider (${this.currentProvider}) failed, falling back to ${this.fallbackProvider}:`, error);
      
      this.setCurrentProvider(this.fallbackProvider);
      
      console.log(`Now using fallback provider: ${this.fallbackProvider}`);
      yield* this.getCurrentProvider().generateStreamingResponse(messages, config);
      console.log(`Successfully completed streaming response with fallback provider: ${this.fallbackProvider}`);
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

export function createLLMProvider(type: 'mistral' | 'mock', config?: Partial<LLMConfig>): LLMProvider {
  switch (type) {
    case 'mistral':
      return new MistralProvider(config);
    case 'mock':
      return new MockLLMProvider();
    default:
      throw new Error(`Unknown LLM provider type: ${type}`);
  }
}

let globalProviderManager: LLMProviderManager | null = null;

export function getLLMProviderManager(): LLMProviderManager {
  if (!globalProviderManager) {
    const primaryProvider = process.env.LLM_PROVIDER as 'mistral' | 'mock' || 'mistral';
    const fallbackProvider = process.env.LLM_FALLBACK_PROVIDER as 'mistral' | 'mock' || 'mock';
    
    globalProviderManager = new LLMProviderManager(primaryProvider, fallbackProvider);
    
    const mistralConfig: Partial<LLMConfig> = {
      model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
      maxTokens: parseInt(process.env.MISTRAL_MAX_TOKENS || '1000'),
      temperature: parseFloat(process.env.MISTRAL_TEMPERATURE || '0.7'),
    };
    
    globalProviderManager.registerProvider('mistral', new MistralProvider(mistralConfig));
    globalProviderManager.registerProvider('mock', new MockLLMProvider());
  }
  
  return globalProviderManager;
}

export function getLLMProvider(): LLMProvider {
  return getLLMProviderManager().getCurrentProvider();
}

export function setLLMProvider(provider: LLMProvider): void {
  console.warn('setLLMProvider is deprecated. Use getLLMProviderManager().registerProvider() instead.');
  getLLMProviderManager().registerProvider('custom', provider);
}

export function switchToProvider(providerName: string): void {
  getLLMProviderManager().setCurrentProvider(providerName);
}

export function getProviderStatus(): { current: string; fallback: string; available: string[] } {
  return getLLMProviderManager().getProviderStatus();
}

export function registerCustomProvider(name: string, provider: LLMProvider): void {
  getLLMProviderManager().registerProvider(name, provider);
} 