import { streamText } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { config } from '../../utils/config/config';

export interface MistralConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface MistralResponse {
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

export interface MistralProvider {
  generateResponse(messages: Message[], config?: Partial<MistralConfig>): Promise<MistralResponse>;
  generateStreamingResponse(messages: Message[], config?: Partial<MistralConfig>): AsyncGenerator<string>;
}

export class MistralProviderImpl implements MistralProvider {
  private defaultConfig: MistralConfig;

  constructor(config?: Partial<MistralConfig>) {
    console.log(`[MISTRAL] Creating MistralProviderImpl with config:`, config);
    this.defaultConfig = {
      model: 'mistral-large-latest',
      maxTokens: 1000,
      temperature: 0.7,
      ...config,
    };
  }

  async generateResponse(messages: Message[], mistralConfig?: Partial<MistralConfig>): Promise<MistralResponse> {
    const mergedConfig = { ...this.defaultConfig, ...mistralConfig };
    const finalConfig = {
      ...mergedConfig,
      temperature: config.getValidatedTemperature('mistral', mergedConfig.temperature)
    };
    
    try {
      const mistralApiKey = config.getApiKeys().mistral;
      if (!mistralApiKey) {
        throw new Error('Mistral API key not configured');
      }
      
      const originalApiKey = process.env.MISTRAL_API_KEY;
      process.env.MISTRAL_API_KEY = mistralApiKey;
      
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
      } finally {
        if (originalApiKey !== undefined) {
          process.env.MISTRAL_API_KEY = originalApiKey;
        } else {
          delete process.env.MISTRAL_API_KEY;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        throw new Error('Mistral API authentication failed - invalid API key');
      } else if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        throw new Error('Mistral API rate limit exceeded');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal server error')) {
        throw new Error('Mistral API server error');
      } else if (errorMessage.includes('model') || errorMessage.includes('Model')) {
        throw new Error(`Mistral model '${finalConfig.model}' not found or invalid`);
      } else {
        throw new Error(`Mistral API error: ${errorMessage}`);
      }
    }
  }

  async *generateStreamingResponse(messages: Message[], mistralConfig?: Partial<MistralConfig>): AsyncGenerator<string> {
    const mergedConfig = { ...this.defaultConfig, ...mistralConfig };
    const finalConfig = {
      ...mergedConfig,
      temperature: config.getValidatedTemperature('mistral', mergedConfig.temperature)
    };
    
    try {
      const mistralApiKey = config.getApiKeys().mistral;
      if (!mistralApiKey) {
        throw new Error('Mistral API key not configured');
      }
      
      const originalApiKey = process.env.MISTRAL_API_KEY;
      process.env.MISTRAL_API_KEY = mistralApiKey;
      
      try {
        const { textStream } = streamText({
          model: mistral(finalConfig.model),
          messages: messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
          maxTokens: finalConfig.maxTokens,
          temperature: finalConfig.temperature,
        });

        let hasContent = false;
        let chunkCount = 0;
        let totalContent = '';
        
        for await (const text of textStream) {
          chunkCount++;
          hasContent = true;
          totalContent += text;
  
          yield text;
        }

        if (!hasContent) {
          throw new Error('No response content received from Mistral API');
        }
      } finally {
        if (originalApiKey !== undefined) {
          process.env.MISTRAL_API_KEY = originalApiKey;
        } else {
          delete process.env.MISTRAL_API_KEY;
        }
      }
    } catch (error) {
      console.error('[MISTRAL] Streaming error:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        throw new Error('Mistral API authentication failed - invalid API key');
      } else if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        throw new Error('Mistral API rate limit exceeded');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal server error')) {
        throw new Error('Mistral API server error');
      } else if (errorMessage.includes('model') || errorMessage.includes('Model')) {
        throw new Error(`Mistral model '${finalConfig.model}' not found or invalid`);
      } else {
        throw new Error(`Mistral API error: ${errorMessage}`);
      }
    }
  }
}

export const MISTRAL_MODELS = {
  // Fast models
  'mistral-small-latest': 'Mistral Small (Fast)',
  'mistral-medium-latest': 'Mistral Medium (Balanced)',
  'mistral-large-latest': 'Mistral Large (High Quality)',
  
  // Specialized models
  'open-mistral-7b': 'Open Mistral 7B (Open Source)',
  'mistral-7b-instruct': 'Mistral 7B Instruct (Efficient)'
};

export const mistralProvider = new MistralProviderImpl({
  model: 'mistral-large-latest',
  maxTokens: 1000,
  temperature: 0.7,
}); 