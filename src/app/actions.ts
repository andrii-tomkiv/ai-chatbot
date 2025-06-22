'use server';

import { streamText } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { createStreamableValue } from 'ai/rsc';
import { vectorDB } from '@/lib/vector-db';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function continueConversation(history: Message[]) {
  const stream = createStreamableValue('');

  (async () => {
    try {
      const latestMessage = history[history.length - 1];
      
      if (!latestMessage?.content) {
        stream.update('No message content provided');
        stream.done();
        return;
      }

      const relevantDocs = await vectorDB.search(latestMessage.content, 3);
      
      const context = relevantDocs
        .map(doc => `Content: ${doc.pageContent}\nSource: ${doc.metadata.url}`)
        .join('\n\n');

      const systemMessage = `You are a helpful assistant that answers questions based only on the provided context. 
      If the context doesn't contain enough information to answer the question, respond with: "I'm not sure based on the current information."
      Always cite the source URLs when providing information.
      
      Context:
      ${context}`;

      const mistralMessages = [
        { role: 'system' as const, content: systemMessage },
        ...history.slice(-5).map((msg: Message) => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        })),
      ];

      const { textStream } = streamText({
        model: mistral('mistral-small-latest'),
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