'use server';

import { createStreamableValue } from 'ai/rsc';
import { serviceFactory } from '@/lib/service-factory';
import { buildChatPrompt } from '@/lib/prompts';
import { Message as LLMMessage } from '@/lib/llm-provider';
import { config } from '@/lib/config';
import { headers } from 'next/headers';
import { chatRateLimiter } from '@/lib/rate-limiter';

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

// Helper function to get request info for rate limiting
async function getRequestInfo() {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  const userAgent = headersList.get('user-agent') || 'unknown';
  
  let ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  ip = ip.trim();
  
  return `${ip}:${userAgent.substring(0, 50)}`;
}

// Helper function to detect gibberish messages
function isGibberishMessage(content: string): boolean {
  const trimmed = content.trim();
  
  // Very short messages
  if (trimmed.length < 3) return true;
  
  // Check for random character patterns
  const randomPatterns = [
    /^[a-zA-Z0-9]{2,15}$/, // Random alphanumeric
    /^[0-9]+[a-zA-Z]+[0-9]+$/, // Number-letter-number pattern
    /^[a-zA-Z]+[0-9]+[a-zA-Z]+$/, // Letter-number-letter pattern
    /^[a-zA-Z]{1,3}[0-9]{1,3}[a-zA-Z]{1,3}$/, // Short mixed patterns
  ];
  
  if (randomPatterns.some(pattern => pattern.test(trimmed))) {
    // Allow some legitimate short words
    const legitimateShortWords = ['hi', 'hello', 'hey', 'ok', 'yes', 'no', 'why', 'how', 'what', 'when', 'where', 'who'];
    if (legitimateShortWords.includes(trimmed.toLowerCase())) {
      return false;
    }
    return true;
  }
  
  return false;
}

export async function continueConversation(
  history: Message[], 
  options: ChatOptions = {}
) {
  const stream = createStreamableValue('');
  let sources: Array<{ url: string; title?: string }> = [];

  (async () => {
    try {
      // Rate limiting check
      const identifier = await getRequestInfo();
      const rateLimitResult = chatRateLimiter.isAllowed(identifier);
      
      if (!rateLimitResult.allowed) {
        const errorMessage = `Rate limit exceeded. Please wait ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds before trying again.`;
        stream.update(errorMessage);
        stream.done();
        return;
      }

      // Spam detection
      const headersList = await headers();
      const userAgent = headersList.get('user-agent') || '';
      const botPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i];
      if (botPatterns.some(pattern => pattern.test(userAgent))) {
        stream.update('Access denied.');
        stream.done();
        return;
      }

      const latestMessage = history[history.length - 1];
      
      if (!latestMessage?.content) {
        stream.update('No message content provided');
        stream.done();
        return;
      }

      // Enhanced spam detection for gibberish messages
      const messageContent = latestMessage.content.trim();
      
      // Check for gibberish messages
      if (isGibberishMessage(messageContent)) {
        // Track spam and check if should block
        const spamResult = chatRateLimiter.trackSpam(identifier);
        if (spamResult.shouldBlock) {
          const blockMinutes = Math.ceil((spamResult.blockDuration || 600000) / 60000);
          stream.update(`Too many invalid messages. You are blocked for ${blockMinutes} minutes.`);
          stream.done();
          return;
        }
        
        stream.update('Hello! 👋 I\'m your fertility and surrogacy assistant, here to help answer your questions about surrogacy, egg donation, intended parenting, and fertility treatments. \n\nI\'d be happy to help if you could please ask me a specific question about these topics. For example, you might ask about surrogacy costs, the IVF process, legal requirements, or finding the right clinic. \n\nWhat would you like to know? 😊');
        stream.done();
        return;
      }

      // Check for repeated gibberish patterns
      const recentMessages = history.slice(-5);
      const gibberishMessages = recentMessages.filter(msg => {
        if (msg.role !== 'user') return false;
        return isGibberishMessage(msg.content);
      });
      
      if (gibberishMessages.length >= 2) {
        // Track spam and check if should block
        const spamResult = chatRateLimiter.trackSpam(identifier);
        if (spamResult.shouldBlock) {
          const blockMinutes = Math.ceil((spamResult.blockDuration || 600000) / 60000);
          stream.update(`Too many invalid messages. You are blocked for ${blockMinutes} minutes.`);
          stream.done();
          return;
        }
        
        stream.update('I notice you\'ve sent several unclear messages. 🤔 \n\nAs your fertility and surrogacy assistant, I\'m here to help with questions about surrogacy, egg donation, IVF, and intended parenting. Please take a moment to ask me a clear question about these topics, and I\'ll be happy to provide you with helpful information! \n\nFor example: "What are the costs involved in surrogacy?" or "How does the egg donation process work?" \n\nThank you for your understanding! 😊');
        stream.done();
        return;
      }

      // Content validation
      if (latestMessage.content.length > 1000) {
        stream.update('I\'d love to help, but your message is quite long! 📝 \n\nTo provide you with the best assistance regarding surrogacy, egg donation, and fertility topics, please keep your questions under 1000 characters. This helps me give you focused, accurate answers. \n\nFeel free to break longer questions into smaller parts - I\'m here to help! 😊');
        stream.done();
        return;
      }

      // Check for repetitive content
      const similarMessages = recentMessages.filter(msg => 
        msg.role === 'user' && 
        msg.content.toLowerCase() === latestMessage.content.toLowerCase()
      );
      
      if (similarMessages.length > 1) {
        stream.update('I see you\'ve asked the same question again! 🔄 \n\nI\'m happy to help with any fertility, surrogacy, or egg donation questions you might have. If my previous answer wasn\'t what you were looking for, please try rephrasing your question or ask about a different aspect of the topic. \n\nI\'m here to provide you with the most helpful information possible! 😊');
        stream.done();
        return;
      }

      const chatConfig = config.getChatConfig();
      const vectorDbConfig = config.getVectorDbConfig();
      const llmConfig = config.getLLMConfig();
      
      const maxResults = options.maxResults || vectorDbConfig.maxResults;
      const vectorDB = serviceFactory.getVectorDB();
      
      // Search with the query text (VectorDBSupabase handles embedding generation internally)
      const relevantDocs = await vectorDB.search(latestMessage.content, maxResults, identifier);
      
      // Extract unique sources from the search results
      sources = relevantDocs
        .map(doc => ({
          url: String(doc.metadata.url || ''),
          title: doc.metadata.title ? String(doc.metadata.title) : String(doc.metadata.url || '')
        }))
        .filter((source, index, self) => 
          index === self.findIndex(s => s.url === source.url)
        ) // Remove duplicates
        .filter(source => source.url && source.url !== ''); // Remove empty URLs
      
      console.log('[ACTIONS] Extracted sources:', sources);
      console.log('[ACTIONS] Number of relevant docs:', relevantDocs.length);
      
      const context = relevantDocs
        .map(doc => `Content: ${doc.content}\nSource: ${doc.metadata.url}`)
        .join('\n\n');

      console.log('[ACTIONS] Context length:', context.length);
      console.log('[ACTIONS] First 500 chars of context:', context.substring(0, 500));

      const systemMessage = buildChatPrompt(context, options.promptType);

      const messages: LLMMessage[] = [
        { role: 'system', content: systemMessage },
        ...history.slice(-chatConfig.maxHistoryLength).map((msg: Message) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      const llmManager = serviceFactory.getLLMManager();
      
      // Set the current provider based on the model selection
      const selectedProvider = options.model?.includes('mistral') ? 'mistral' : 'groq';
      const fallbackProvider = selectedProvider === 'mistral' ? 'groq' : 'mistral';
      
      console.log(`[ACTIONS] Setting current provider to: ${selectedProvider} based on model: ${options.model}`);
      console.log(`[ACTIONS] Setting fallback provider to: ${fallbackProvider}`);
      
      llmManager.setCurrentProvider(selectedProvider);
      llmManager.setFallbackProvider(fallbackProvider);
      
      // Use the appropriate model for the current provider
      const currentModel = selectedProvider === 'mistral' 
        ? config.getModels().mistral.chat 
        : config.getModels().groq.chat;
      
      const llmConfigOverride = {
        model: currentModel,
        maxTokens: options.maxTokens || chatConfig.maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : chatConfig.temperature,
      };
      
      try {
        console.log('[ACTIONS] Starting streaming response with timeout...');
        console.log('[ACTIONS] LLM Config:', llmConfigOverride);
        console.log('[ACTIONS] Current provider:', llmManager.getProviderStatus().current);
        const startTime = Date.now();
        
        // Create the streaming response
        const streamingResponse = llmManager.generateStreamingResponseWithFallback(messages, llmConfigOverride);
        
        // Track if we've received any content
        let hasContent = false;
        let firstChunkTime = 0;
        
        try {
          for await (const text of streamingResponse) {
            if (!hasContent) {
              firstChunkTime = Date.now() - startTime;
              console.log(`[ACTIONS] FIRST CHUNK: Received after ${firstChunkTime}ms`);
              hasContent = true;
            }
            
            stream.update(text);
          }
          
          if (!hasContent) {
            throw new Error('No content received from primary provider');
          }
          
          const duration = Date.now() - startTime;
          console.log(`[ACTIONS] SUCCESS: Completed in ${duration}ms`);
          
        } catch (streamError) {
          console.log('[ACTIONS] Stream error, switching to fallback:', streamError);
          throw streamError;
        }
        
      } catch (error) {
        console.error('[ACTIONS] Error in streaming response:', error);
        
        // Try fallback provider directly
        try {
          console.log(`[ACTIONS] Attempting direct fallback to ${llmConfig.fallback}...`);
          
          console.log('check options temperature',options.temperature);

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
              console.log('[ACTIONS] Fallback successful, streaming response');
              stream.update(fallbackResponse.content);
            } else {
              stream.update('Sorry, I encountered an error. Please try again.');
            }
          } else {
            stream.update('Sorry, I encountered an error. Please try again.');
          }
        } catch (fallbackError) {
          console.error('[ACTIONS] Fallback also failed:', fallbackError);
          stream.update('Sorry, I encountered an error. Please try again.');
        }
      }

      stream.done();
    } catch (error) {
      console.error('[ACTIONS] Chat error:', error);
      stream.update('Sorry, I encountered an error. Please try again.');
      stream.done();
    }
  })();

  return {
    messages: history,
    newMessage: stream.value,
    sources: sources,
  };
} 