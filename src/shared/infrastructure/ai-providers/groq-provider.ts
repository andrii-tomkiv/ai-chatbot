import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { config } from '../../utils/config/config';

export interface GroqConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GroqResponse {
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

export interface GroqProvider {
  generateResponse(messages: Message[], config?: Partial<GroqConfig>): Promise<GroqResponse>;
  generateStreamingResponse(messages: Message[], config?: Partial<GroqConfig>): AsyncGenerator<string>;
}

export class GroqProviderImpl implements GroqProvider {
  private defaultConfig: GroqConfig;

  constructor(config?: Partial<GroqConfig>) {
    console.log(`[GROQ] Creating GroqProviderImpl with config:`, config);
    this.defaultConfig = {
      model: 'llama3-70b-8192',
      maxTokens: 1000,
      temperature: 0.7,
      ...config,
    };
    console.log(`[GROQ] Final default config:`, this.defaultConfig);
  }

  async generateResponse(messages: Message[], groqConfig?: Partial<GroqConfig>): Promise<GroqResponse> {
    const mergedConfig = { ...this.defaultConfig, ...groqConfig };
    const finalConfig = {
      ...mergedConfig,
      temperature: config.getValidatedTemperature('groq', mergedConfig.temperature)
    };
    
    try {
      const groqApiKey = config.getApiKeys().groq;
      if (!groqApiKey) {
        throw new Error('Groq API key not configured');
      }
      
      const originalApiKey = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = groqApiKey;
      
      try {
        const { textStream } = streamText({
          model: groq(finalConfig.model),
          messages: messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
          maxTokens: finalConfig.maxTokens,
          temperature: finalConfig.temperature,
        });

        let content = '';
        for await (const text of textStream) {
          content += text;
        }

        if (!content.trim()) {
          throw new Error('No response content received from Groq API');
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
          process.env.GROQ_API_KEY = originalApiKey;
        } else {
          delete process.env.GROQ_API_KEY;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        throw new Error('Groq API authentication failed - invalid API key');
      } else if (errorMessage.includes('413') || errorMessage.includes('Payload too large')) {
        throw new Error('Groq API payload too large');
      } else if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        throw new Error('Groq API rate limit exceeded');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal server error')) {
        throw new Error('Groq API server error');
      } else if (errorMessage.includes('model') || errorMessage.includes('Model')) {
        throw new Error(`Groq model '${finalConfig.model}' not found or invalid`);
      } else {
        throw new Error(`Groq API error: ${errorMessage}`);
      }
    }
  }

  async *generateStreamingResponse(messages: Message[], groqConfig?: Partial<GroqConfig>): AsyncGenerator<string> {
    const mergedConfig = { ...this.defaultConfig, ...groqConfig };
    const finalConfig = {
      ...mergedConfig,
      temperature: config.getValidatedTemperature('groq', mergedConfig.temperature)
    };
    
    try {
      const groqApiKey = config.getApiKeys().groq;
      if (!groqApiKey) {
        throw new Error('Groq API key not configured');
      }
      
      const originalApiKey = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = groqApiKey;
      
      try {
        const { textStream } = streamText({
          model: groq(finalConfig.model),
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
          throw new Error('No response content received from Groq API');
        }
      } finally {
        if (originalApiKey !== undefined) {
          process.env.GROQ_API_KEY = originalApiKey;
        } else {
          delete process.env.GROQ_API_KEY;
        }
      }
    } catch (error) {
      console.error('[GROQ] Streaming error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        throw new Error('Groq API authentication failed - invalid API key');
      } else if (errorMessage.includes('413') || errorMessage.includes('Payload too large')) {
        throw new Error('Groq API payload too large');
      } else if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        throw new Error('Groq API rate limit exceeded');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal server error')) {
        throw new Error('Groq API server error');
      } else if (errorMessage.includes('model') || errorMessage.includes('Model')) {
        throw new Error(`Groq model '${finalConfig.model}' not found or invalid`);
      } else {
        throw new Error(`Groq API error: ${errorMessage}`);
      }
    }
  }
}

export const GROQ_MODELS = {
  // Fast and reliable models
  'llama3-70b-8192': 'Llama 3.1 70B (Fast & Reliable)',
  'llama3-8b-8192': 'Llama 3.1 8B (Very Fast)',
  'gemma2-9b-it': 'Gemma 2 9B (Fast & Efficient)',
  
  // High-quality models
  'llama-3.3-70b-versatile': 'Llama 3.3 70B (High Quality)',
  'mixtral-8x7b-32768': 'Mixtral 8x7B (Good Balance)',
  
  // Reasoning models
  'qwen-qwq-32b': 'Qwen QWQ 32B (Reasoning)',
  'deepseek-r1-distill-llama-70b': 'DeepSeek R1 70B (Reasoning)',
  
  // Specialized models
  'llama-guard-3-8b': 'Llama Guard 3 8B (Safety)',
  'meta-llama/llama-4-scout-17b-16e-instruct': 'Llama 4 Scout 17B (Specialized)'
};

export const groqProvider = new GroqProviderImpl({
  model: 'llama3-70b-8192',
  maxTokens: 1000,
  temperature: 0.7,
}); 