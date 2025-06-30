import { streamText } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { config } from './config';

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
    console.log(`[MISTRAL] Final default config:`, this.defaultConfig);
  }

  async generateResponse(messages: Message[], mistralConfig?: Partial<MistralConfig>): Promise<MistralResponse> {
    const mergedConfig = { ...this.defaultConfig, ...mistralConfig };
    const finalConfig = {
      ...mergedConfig,
      temperature: config.getValidatedTemperature('mistral', mergedConfig.temperature)
    };
    
    console.log(`[MISTRAL] Attempting to generate response with model: ${finalConfig.model}`);
    
    try {
      console.log(`[MISTRAL] Calling streamText with model: ${finalConfig.model}`);
      
      const mistralApiKey = config.getApiKeys().mistral;
      if (!mistralApiKey) {
        throw new Error('Mistral API key not configured');
      }
      
      // Set the API key in environment for this request
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

        console.log(`[MISTRAL] Successfully generated response with ${content.length} characters`);
        
        return {
          content,
          usage: {
            promptTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0),
            completionTokens: content.length,
            totalTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0) + content.length,
          },
        };
      } finally {
        // Restore original API key
        if (originalApiKey !== undefined) {
          process.env.MISTRAL_API_KEY = originalApiKey;
        } else {
          delete process.env.MISTRAL_API_KEY;
        }
      }
    } catch (error) {
      console.error('[MISTRAL] API error:', error);
      
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
    
    console.log(`[MISTRAL] generateStreamingResponse called with config:`, mistralConfig);
    console.log(`[MISTRAL] Merged config:`, finalConfig);
    console.log(`[MISTRAL] Attempting to generate streaming response with model: ${finalConfig.model}`);
    console.log(`[MISTRAL] Messages:`, messages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + '...' })));
    
    try {
      console.log(`[MISTRAL] Calling streamText with model: ${finalConfig.model}`);
      
      const mistralApiKey = config.getApiKeys().mistral;
      if (!mistralApiKey) {
        throw new Error('Mistral API key not configured');
      }
      
      // Set the API key in environment for this request
      const originalApiKey = process.env.MISTRAL_API_KEY;
      process.env.MISTRAL_API_KEY = mistralApiKey;
      
      try {
        const { textStream } = streamText({
          model: mistral(finalConfig.model),
          messages: messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
          maxTokens: finalConfig.maxTokens,
          temperature: finalConfig.temperature,
        });

        console.log(`[MISTRAL] streamText returned, starting to read stream`);
        let hasContent = false;
        let chunkCount = 0;
        let totalContent = '';
        
        for await (const text of textStream) {
          chunkCount++;
          hasContent = true;
          totalContent += text;
  
          yield text;
        }

        console.log(`[MISTRAL] Stream ended, received ${chunkCount} chunks`);
        console.log(`[MISTRAL] Total content length: ${totalContent.length}`);
        console.log(`[MISTRAL] Total content: "${totalContent}"`);
        
        if (!hasContent) {
          console.log(`[MISTRAL] No content received - this might indicate an API issue`);
          throw new Error('No response content received from Mistral API');
        }
        
        console.log(`[MISTRAL] Successfully completed streaming response`);
      } finally {
        // Restore original API key
        if (originalApiKey !== undefined) {
          process.env.MISTRAL_API_KEY = originalApiKey;
        } else {
          delete process.env.MISTRAL_API_KEY;
        }
      }
    } catch (error) {
      console.error('[MISTRAL] Streaming error:', error);
      console.error('[MISTRAL] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
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