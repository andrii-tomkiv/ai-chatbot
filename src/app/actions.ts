'use server';

import { createStreamableValue } from 'ai/rsc';
import { vectorDB } from '@/lib/vector-db';
import { buildChatPrompt } from '@/lib/prompts';
import { getLLMProvider, Message as LLMMessage } from '@/lib/llm-provider';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  promptType?: string;
  maxResults?: number;
  model?: string;
}

export async function continueConversation(
  history: Message[], 
  options: ChatOptions = {}
) {
  const stream = createStreamableValue('');

  (async () => {
    try {
      const latestMessage = history[history.length - 1];
      
      if (!latestMessage?.content) {
        stream.update('No message content provided');
        stream.done();
        return;
      }

      const maxResults = options.maxResults || 3;
      const relevantDocs = await vectorDB.search(latestMessage.content, maxResults);
      
      const context = relevantDocs
        .map(doc => `Content: ${doc.pageContent}\nSource: ${doc.metadata.url}`)
        .join('\n\n');

      const systemMessage = buildChatPrompt(context, options.promptType);

      const messages: LLMMessage[] = [
        { role: 'system', content: systemMessage },
        ...history.slice(-5).map((msg: Message) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      const llmProvider = getLLMProvider();
      const config = options.model ? { model: options.model } : undefined;
      
      const streamingResponse = llmProvider.generateStreamingResponse(messages, config);

      for await (const text of streamingResponse) {
        stream.update(text);
      }

      stream.done();
    } catch (error) {
      console.error('Chat error:', error);
      stream.update('Sorry, I encountered an error. Please try again.');
      stream.done();
    }
  })();

  return {
    messages: history,
    newMessage: stream.value,
  };
} 