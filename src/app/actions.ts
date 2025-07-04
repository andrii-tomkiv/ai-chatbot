'use server';

import { createStreamableValue } from 'ai/rsc';
import { serviceFactory } from '@/shared/utils/helpers/service-factory';
import { buildChatPrompt } from '@/shared/utils/helpers/prompts';
import { Message as LLMMessage } from '@/shared/infrastructure/ai-providers/llm-provider';
import { config } from '@/shared/utils/config/config';
import { headers } from 'next/headers';
import { chatRateLimiter } from '@/domains/moderation/services/rate-limiter';
import { 
  getRequestInfo, 
  isBotUserAgent 
} from '@/shared/utils/helpers/request-utils';
import { 
  isGibberishMessage, 
  isMessageTooLong,
  isDuplicateMessage 
} from '@/shared/utils/helpers/validation-utils';
import { 
  RESPONSE_MESSAGES,
  createRateLimitMessage,
  createSpamBlockMessage 
} from '@/shared/utils/helpers/message-responses';
import { log } from 'console';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  sources?: Array<{
    url: string;
    title?: string;
  }>;
  regenerated?: boolean;
}

export interface ChatOptions {
  promptType?: string;
  maxResults?: number;
  model?: string;
  action?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function continueConversation(
  history: Message[], 
  options: ChatOptions = {}
) {
  const stream = createStreamableValue('');
  let sources: Array<{ url: string; title?: string }> = [];

  (async () => {
    try {
      const identifier = await getRequestInfo();
      const rateLimitResult = chatRateLimiter.isAllowed(identifier);
      
      if (!rateLimitResult.allowed) {
        const errorMessage = createRateLimitMessage(rateLimitResult.resetTime);
        stream.update(errorMessage);
        stream.done();
        return;
      }

      const headersList = await headers();
      const userAgent = headersList.get('user-agent') || '';
      if (isBotUserAgent(userAgent)) {
        stream.update(RESPONSE_MESSAGES.BOT_ACCESS_DENIED);
        stream.done();
        return;
      }

      const latestMessage = history[history.length - 1];
      
      if (!latestMessage?.content) {
        stream.update(RESPONSE_MESSAGES.NO_CONTENT);
        stream.done();
        return;
      }

      const messageContent = latestMessage.content.trim();
      
      const recentMessages = history.slice(-5, -1);
      const gibberishMessages = recentMessages.filter(msg => {
        if (msg.role !== 'user') return false;
        return isGibberishMessage(msg.content);
      });
      
      const currentIsGibberish = isGibberishMessage(messageContent);
      if (currentIsGibberish) {
        if (gibberishMessages.length >= 1) {
          const spamResult = chatRateLimiter.trackSpam(identifier);
          if (spamResult.shouldBlock) {
            const blockMessage = createSpamBlockMessage(spamResult.blockDuration || 600000);
            stream.update(blockMessage);
            stream.done();
            return;
          }
          
          stream.update(RESPONSE_MESSAGES.GIBBERISH_REPEATED);
          stream.done();
          return;
        }
        
        const spamResult = chatRateLimiter.trackSpam(identifier);
        if (spamResult.shouldBlock) {
          const blockMessage = createSpamBlockMessage(spamResult.blockDuration || 600000);
          stream.update(blockMessage);
          stream.done();
          return;
        }
        
        stream.update(RESPONSE_MESSAGES.GIBBERISH_FIRST);
        stream.done();
        return;
      }

      if (isMessageTooLong(latestMessage.content)) {
        stream.update(RESPONSE_MESSAGES.MESSAGE_TOO_LONG);
        stream.done();
        return;
      }

      const previousUserMessages = recentMessages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content);
      
      if (isDuplicateMessage(latestMessage.content, previousUserMessages)) {
        stream.update(RESPONSE_MESSAGES.DUPLICATE_MESSAGE);
        stream.done();
        return;
      }

      const chatConfig = config.getChatConfig();
      const vectorDbConfig = config.getVectorDbConfig();
      
      const maxResults = options.maxResults ?? vectorDbConfig.maxResults;
      const vectorDB = serviceFactory.getVectorDB();
      
      const relevantDocs = await vectorDB.search(latestMessage.content, maxResults, identifier);
      
      sources = relevantDocs
        .map(doc => ({
          url: String(doc.metadata.url || ''),
          title: doc.metadata.title ? String(doc.metadata.title) : String(doc.metadata.url || '')
        }))
        .filter((source, index, self) => 
          index === self.findIndex(s => s.url === source.url)
        )
        .filter(source => source.url && source.url !== '');
      
      
      const context = JSON.stringify(
        relevantDocs.map(doc => ({
          content: doc.content,
          source: doc.metadata.url
        })),
        null,
        2
      );

      const systemMessage = buildChatPrompt(context, options.promptType);

      const messages: LLMMessage[] = [
        { role: 'system', content: systemMessage },
        ...history.slice(-chatConfig.maxHistoryLength).map((msg: Message) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      const llmManager = serviceFactory.getLLMManager();
      
      const selectedProvider = options.model?.includes('mistral') ? 'mistral' : 'groq';
      const fallbackProvider = selectedProvider === 'mistral' ? 'groq' : 'mistral';
      
      llmManager.setCurrentProvider(selectedProvider);
      llmManager.setFallbackProvider(fallbackProvider);
      
      const currentModel = selectedProvider === 'mistral' 
        ? config.getModels().mistral.chat 
        : config.getModels().groq.chat;
      
      const llmConfigOverride = {
        model: currentModel,
        maxTokens: options.maxTokens || chatConfig.maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : chatConfig.temperature,
      };
      
      try {
        const startTime = Date.now();
        
        const streamingResponse = llmManager.generateStreamingResponseWithFallback(messages, llmConfigOverride);
        
        let hasContent = false;
        let firstChunkTime = 0;
        
        try {
          for await (const text of streamingResponse) {
            if (!hasContent) {
              firstChunkTime = Date.now() - startTime;
              hasContent = true;
            }
            
            stream.update(text);
          }
          
          if (!hasContent) {
            throw new Error('No content received from primary provider');
          }
          
          const duration = Date.now() - startTime;
          
        } catch (streamError) {
          throw streamError;
        }
        
      } catch (error) {
        
        try {
          const fallbackProvider = llmManager.getFallbackProvider();
          if (fallbackProvider) {
            // Use the appropriate model for the fallback provider
            const fallbackModel = llmManager.getProviderStatus().fallback === 'mistral' 
              ? config.getModels().mistral.chat 
              : config.getModels().groq.chat;
            
            const fallbackResponse = await fallbackProvider.generateResponse(messages, {
              model: fallbackModel,
              maxTokens: options.maxTokens || chatConfig.maxTokens,
              temperature: options.temperature !== undefined ? options.temperature : chatConfig.temperature,
            });
            
            if (fallbackResponse) {
              stream.update(fallbackResponse.content);
            } else {
              stream.update(RESPONSE_MESSAGES.ERROR_GENERIC);
            }
          } else {
            stream.update(RESPONSE_MESSAGES.ERROR_GENERIC);
          }
        } catch (fallbackError) {
          console.error('[ACTIONS] Fallback also failed:', fallbackError);
          stream.update(RESPONSE_MESSAGES.ERROR_GENERIC);
        }
      }

      stream.done();
    } catch (error) {
      stream.update(RESPONSE_MESSAGES.ERROR_GENERIC);
      stream.done();
    }
  })();

  return {
    messages: history,
    newMessage: stream.value,
    sources: sources,
  };
} 