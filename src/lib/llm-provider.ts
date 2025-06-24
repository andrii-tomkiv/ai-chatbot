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
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      for await (const text of textStream) {
        yield text;
      }
    } catch (error) {
      console.error('Mistral streaming error:', error);
      throw new Error(`Failed to generate streaming response: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  async *generateStreamingResponse(messages: Message[]): AsyncGenerator<string> {
    const response = this.responses[this.currentIndex % this.responses.length];
    this.currentIndex++;
    
    console.log('Mock streaming response for messages:', messages.length);
    
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
    try {
      return await this.getCurrentProvider().generateResponse(messages, config);
    } catch (error) {
      console.warn(`Primary provider failed, falling back to ${this.fallbackProvider}:`, error);
      
      this.setCurrentProvider(this.fallbackProvider);
      
      return await this.getCurrentProvider().generateResponse(messages, config);
    }
  }

  async *generateStreamingResponseWithFallback(messages: Message[], config?: Partial<LLMConfig>): AsyncGenerator<string> {
    try {
      yield* this.getCurrentProvider().generateStreamingResponse(messages, config);
    } catch (error) {
      console.warn(`Primary provider failed, falling back to ${this.fallbackProvider}:`, error);
      
      this.setCurrentProvider(this.fallbackProvider);
      
      yield* this.getCurrentProvider().generateStreamingResponse(messages, config);
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
  // For backward compatibility, register as 'custom' provider
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