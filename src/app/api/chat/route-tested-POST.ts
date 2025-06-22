// TESTED AND WORKING - Non-streaming implementation for useChat hook
// useChat waits for complete response, then displays all at once

import { Message } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import { vectorDB } from '@/lib/vector-db';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage?.content) {
      return new Response('No message content provided', { status: 400 });
    }

    // Search for relevant content
    const relevantDocs = await vectorDB.search(latestMessage.content, 3);
    
    // Construct context from relevant documents
    const context = relevantDocs
      .map(doc => `Content: ${doc.pageContent}\nSource: ${doc.metadata.url}`)
      .join('\n\n');

    // Create system message
    const systemMessage = `You are a helpful assistant that answers questions based only on the provided context. 
    If the context doesn't contain enough information to answer the question, respond with: "I'm not sure based on the current information."
    Always cite the source URLs when providing information.
    
    Context:
    ${context}`;

    // Prepare messages for Mistral
    const mistralMessages = [
      { role: 'system' as const, content: systemMessage },
      ...messages.slice(-5).map((msg: Message) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
    ];

    // Get complete response from Mistral (no streaming)
    const { text } = await generateText({
      model: mistral('mistral-small-latest'),
      messages: mistralMessages,
    });

    // Return the complete response
    return new Response(text);

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 