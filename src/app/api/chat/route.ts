import { NextRequest, NextResponse } from "next/server";
import { Mistral } from "@mistralai/mistralai";
import { serviceFactory } from '@/shared/utils/helpers/service-factory';
import { config } from '@/shared/utils/config/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, options = {} } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const model = options.model || "mistral-small-latest";
    let answer = "";

    // Get the last user message for vector search
    const lastUserMessage = messages[messages.length - 1];
    const userQuestion = lastUserMessage?.content || '';

    // RAG Pipeline: Vector Search and Context Building
    const vectorDbConfig = config.getVectorDbConfig();
    const maxResults = options.maxResults ?? vectorDbConfig.maxResults;
    const vectorDB = serviceFactory.getVectorDB();
    
    // Perform semantic search
    const relevantDocs = await vectorDB.search(userQuestion, maxResults, 'api-user');
    
    // Extract sources for response
    const sources = relevantDocs
      .map(doc => ({
        url: String(doc.metadata.url || ''),
        title: doc.metadata.title ? String(doc.metadata.title) : String(doc.metadata.url || '')
      }))
      .filter((source, index, self) => 
        index === self.findIndex(s => s.url === source.url)
      )
      .filter(source => source.url && source.url !== '');
    
    // Format context as JSON
    const context = JSON.stringify(
      relevantDocs.map(doc => ({
        content: doc.content,
        source: doc.metadata.url
      })),
      null,
      2
    );

    // Append RAG context to existing system prompt
    const messagesCopy = [...messages];
    const systemMessageIndex = messagesCopy.findIndex(msg => msg.role === 'system');
    
    console.log('=== RAG DEBUG ===');
    console.log('Original messages:', messages.length);
    console.log('Vector search found:', relevantDocs.length, 'documents');
    console.log('Context length:', context.length, 'characters');
    
    if (systemMessageIndex >= 0) {
      // Append context to existing system message
      const existingPrompt = messagesCopy[systemMessageIndex].content;
      console.log('Original system prompt:', existingPrompt.substring(0, 100) + '...');
      
      messagesCopy[systemMessageIndex] = { 
        role: 'system', 
        content: `${existingPrompt}

CONTEXT FROM KNOWLEDGE BASE:
The following information is provided as context from our knowledge base in JSON format:
${context}

Please use this context to answer the user's question accurately and cite the sources when relevant.`
      };
      
      console.log('Updated system prompt length:', messagesCopy[systemMessageIndex].content.length);
    } else {
      messagesCopy.unshift({ 
        role: 'system', 
        content: `CONTEXT FROM KNOWLEDGE BASE:
The following information is provided as context from our knowledge base in JSON format:
${context}

Please use this context to answer the user's question accurately and cite the sources when relevant.`
      });
    }
    
    console.log('Final messages to LLM:', messagesCopy.length);
    console.log('=== END RAG DEBUG ===');

    if (model.includes("groq") || model.includes("llama")) {
      // Create timeout promise for Groq API call (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Groq API timeout after 30 seconds')), 30000);
      });

      const groqAPICall = fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: messagesCopy,
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
          }),
        }
      );

      const groqResponse = await Promise.race([groqAPICall, timeoutPromise]) as Response;

      if (!groqResponse.ok) {
        throw new Error(`Groq API error: ${groqResponse.status}`);
      }

      const groqData = await groqResponse.json();
      answer = groqData.choices[0].message.content;
    } else {
      // Create timeout promise for Mistral API call (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Mistral API timeout after 30 seconds')), 30000);
      });

      const mistralClient = new Mistral({
        apiKey: process.env.MISTRAL_API_KEY,
      });
      
      const mistralAPICall = mistralClient.chat.complete({
        model: model,
        messages: messagesCopy,
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      });

      const mistralResponse = await Promise.race([mistralAPICall, timeoutPromise]) as any;

      const content = mistralResponse.choices[0]?.message?.content;
      if (Array.isArray(content)) {
        answer = content
          .map((chunk) => {
            if (chunk.type === "text") {
              return chunk.text || "";
            }
            return "";
          })
          .join("");
      } else {
        answer = content || "";
      }
    }

    return NextResponse.json({
      answer: answer,
      sources: sources,
      context: context,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
