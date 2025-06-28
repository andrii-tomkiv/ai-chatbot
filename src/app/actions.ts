'use server';

import { createStreamableValue } from 'ai/rsc';
import { serviceFactory } from '@/lib/service-factory';
import { buildChatPrompt } from '@/lib/prompts';
import { Message as LLMMessage } from '@/lib/llm-provider';
import { config } from '@/lib/config';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  sources?: Array<{
    url: string;
    title?: string;
  }>;
}

export interface ChatOptions {
  promptType?: string;
  maxResults?: number;
  model?: string;
  action?: string;
}

export async function continueConversation(
  history: Message[], 
  options: ChatOptions = {}
) {
  const stream = createStreamableValue('');
  let sources: Array<{ url: string; title?: string }> = [];

  (async () => {
    try {
      const latestMessage = history[history.length - 1];
      
      if (!latestMessage?.content) {
        stream.update('No message content provided');
        stream.done();
        return;
      }

      const chatConfig = config.getChatConfig();
      const vectorDbConfig = config.getVectorDbConfig();
      const llmConfig = config.getLLMConfig();
      
      const maxResults = options.maxResults || vectorDbConfig.maxResults;
      const vectorDB = serviceFactory.getVectorDB();
      const relevantDocs = await vectorDB.search(latestMessage.content, maxResults);
      
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
        .map(doc => `Content: ${doc.pageContent}\nSource: ${doc.metadata.url}`)
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
      const llmConfigOverride = options.model ? { model: options.model } : undefined;
      
      try {
        console.log('[ACTIONS] Starting streaming response with timeout...');
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
          
          const fallbackProvider = llmManager.getFallbackProvider();
          if (fallbackProvider) {
            const fallbackResponse = await fallbackProvider.generateResponse(messages, {
              model: options.model || config.getModels().groq.chat,
              maxTokens: chatConfig.maxTokens,
              temperature: chatConfig.temperature,
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