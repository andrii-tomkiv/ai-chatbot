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
    
    // Simulate API delay
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
    
    // Log the messages for debugging (using the parameter)
    console.log('Mock streaming response for messages:', messages.length);
    
    // Simulate streaming by yielding characters
    for (const char of response) {
      await new Promise(resolve => setTimeout(resolve, 10));
      yield char;
    }
  }
}

// Factory function to create LLM providers
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

// Global LLM provider instance
let globalLLMProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!globalLLMProvider) {
    const providerType = process.env.LLM_PROVIDER as 'mistral' | 'mock' || 'mistral';
    const config: Partial<LLMConfig> = {
      model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
      maxTokens: parseInt(process.env.MISTRAL_MAX_TOKENS || '1000'),
      temperature: parseFloat(process.env.MISTRAL_TEMPERATURE || '0.7'),
    };
    
    globalLLMProvider = createLLMProvider(providerType, config);
  }
  
  return globalLLMProvider;
}

export function setLLMProvider(provider: LLMProvider): void {
  globalLLMProvider = provider;
} 