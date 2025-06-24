'use server';

import { streamText } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { createStreamableValue } from 'ai/rsc';
import { vectorDB } from '@/lib/vector-db';
import { buildChatPrompt } from '@/lib/prompts';

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

      const mistralMessages = [
        { role: 'system' as const, content: systemMessage },
        ...history.slice(-5).map((msg: Message) => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        })),
      ];

      const modelName = options.model || 'mistral-small-latest';
      const { textStream } = streamText({
        model: mistral(modelName),
        messages: mistralMessages,
      });

      for await (const text of textStream) {
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