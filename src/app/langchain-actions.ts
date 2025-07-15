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
import { PrismaClient } from '@/generated/prisma';
import { LangChainConfig } from '@/shared/infrastructure/ai-providers/langchain-provider';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://chatbot_user:chatbot_password@localhost:3306/chatbot_db'
    }
  }
});

async function saveToDatabase(userMessage: string, aiResponse: string, provider: string = 'langchain') {
  try {
    let userIP = '';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        userIP = ipData.ip;
      }
    } catch (e) {
      userIP = '';
    }

    await prisma.userRequests.create({
      data: {
        userIP: userIP,
        message: userMessage,
        response: aiResponse,
      },
    });

    console.log(`✅ Saved user request to database (${provider})`);
  } catch (dbError) {
    console.error('❌ Failed to save to database:', dbError);
  }
}

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

export interface LangChainChatOptions {
  promptType?: string;
  maxResults?: number;
  model?: string;
  action?: string;
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
  useChains?: boolean;
  useAgents?: boolean;
  chainType?: 'conversation' | 'qa' | 'custom';
  agentType?: 'react' | 'tool-calling' | 'custom';
}

export async function continueConversationWithLangChain(
  history: Message[], 
  options: LangChainChatOptions = {}
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

      // Validation checks (same as original)
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

      // Get LangChain provider
      const langChainProvider = serviceFactory.getLangChainProvider();
      
      // Set model based on options
      if (options.model) {
        const selectedProvider = options.model.includes('mistral') ? 'mistral' : 'groq';
        langChainProvider.setModel(selectedProvider);
      }

      // Prepare context from vector database if needed
      let context = '';
      if (options.chainType === 'qa' || options.maxResults) {
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

        context = JSON.stringify(
          relevantDocs.map(doc => ({
            content: doc.content,
            source: doc.metadata.url
          })),
          null,
          2
        );
      }

      // Build system prompt
      const systemMessage = buildChatPrompt(context, options.promptType, options.customPrompt);

      // Prepare messages for LangChain
      const messages: LLMMessage[] = [
        { role: 'system', content: systemMessage },
        ...history.slice(-config.getChatConfig().maxHistoryLength).map((msg: Message) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      // Configure LangChain options
      const langChainConfig: Partial<LangChainConfig> = {
        model: options.model || config.getModels().mistral.chat,
        maxTokens: options.maxTokens || config.getChatConfig().maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : config.getChatConfig().temperature,
        useChains: options.useChains !== false, // Default to true
        useAgents: options.useAgents || false,
        chainType: options.chainType || 'conversation',
        agentType: options.agentType || 'react',
      };

      try {
        const startTime = Date.now();

        // Use LangChain streaming if available, otherwise fallback to direct response
        let fullResponse = '';
        
        if (langChainConfig.useChains || langChainConfig.useAgents) {
          // Use LangChain chains/agents
          if (langChainConfig.useAgents) {
            const response = await langChainProvider.generateResponseWithAgent(messages, langChainConfig);
            fullResponse = response.content;
            stream.update(fullResponse);
          } else {
            const response = await langChainProvider.generateResponseWithChain(messages, langChainConfig);
            fullResponse = response.content;
            stream.update(fullResponse);
          }
        } else {
          // Use streaming response
          const streamingResponse = langChainProvider.generateStreamingResponse(messages, langChainConfig);
          
          let hasContent = false;
          for await (const text of streamingResponse) {
            if (!hasContent) {
              hasContent = true;
            }
            fullResponse += text;
            stream.update(text);
          }

          if (!hasContent) {
            throw new Error('No content received from LangChain provider');
          }
        }

        // Save to database
        saveToDatabase(latestMessage.content, fullResponse, 'langchain').catch(error => {
          console.error('❌ Async save failed:', error);
        });

        const totalDuration = Date.now() - startTime;
        console.log(`[LANGCHAIN] Completed response in ${totalDuration}ms`);

      } catch (error) {
        console.error('[LANGCHAIN] Error generating response:', error);
        
        // Fallback to regular LLM manager
        try {
          console.log('[LANGCHAIN] Falling back to regular LLM manager...');
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
            maxTokens: options.maxTokens || config.getChatConfig().maxTokens,
            temperature: options.temperature !== undefined ? options.temperature : config.getChatConfig().temperature,
          };

          const streamingResponse = llmManager.generateStreamingResponseWithFallback(messages, llmConfigOverride);
          
          let fullResponse = '';
          for await (const text of streamingResponse) {
            fullResponse += text;
            stream.update(text);
          }

          saveToDatabase(latestMessage.content, fullResponse, 'fallback').catch(error => {
            console.error('❌ Async fallback save failed:', error);
          });

        } catch (fallbackError) {
          console.error('[LANGCHAIN] Fallback also failed:', fallbackError);
          stream.update(RESPONSE_MESSAGES.ERROR_GENERIC);
        }
      }

      stream.done();
    } catch (error) {
      console.error('[LANGCHAIN] Outer error:', error);
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

// Additional LangChain-specific functions
export async function generateResponseWithChain(
  messages: Message[],
  chainType: 'conversation' | 'qa' | 'custom' = 'conversation',
  systemPrompt?: string
) {
  const langChainProvider = serviceFactory.getLangChainProvider();
  
  const langChainMessages: LLMMessage[] = messages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const config: Partial<LangChainConfig> = {
    useChains: true,
    useAgents: false,
    chainType,
  };

  if (chainType === 'qa') {
    // Create QA chain with context retrieval
    const vectorDB = serviceFactory.getVectorDB();
    const contextRetriever = async (query: string) => {
      const docs = await vectorDB.search(query, 5, 'qa-chain');
      return docs.map(doc => doc.content).join('\n\n');
    };

    const qaChain = langChainProvider.createQARetrievalChain(
      systemPrompt || "You are a helpful AI assistant. Answer questions based on the provided context.",
      contextRetriever
    );

    const lastMessage = messages[messages.length - 1];
    const response = await qaChain.invoke({
      question: lastMessage.content
    });

    return {
      content: response as string,
      chain: {
        type: 'qa',
        steps: ['context_retrieval', 'prompt_template', 'llm', 'output_parser']
      }
    };
  } else {
    // Use conversation chain
    const chain = langChainProvider.createConversationChain(
      systemPrompt || "You are a helpful AI assistant. Provide accurate and helpful responses."
    );

    const lastMessage = messages[messages.length - 1];
    const response = await chain.invoke({
      input: lastMessage.content,
      chat_history: messages.slice(0, -1).map(msg => `${msg.role}: ${msg.content}`).join('\n')
    });

    return {
      content: response as string,
      chain: {
        type: 'conversation',
        steps: ['prompt_template', 'llm', 'output_parser']
      }
    };
  }
}

export async function generateResponseWithAgent(
  messages: Message[],
  agentType: 'react' | 'tool-calling' | 'custom' = 'react'
) {
  const langChainProvider = serviceFactory.getLangChainProvider();
  
  const langChainMessages: LLMMessage[] = messages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const config: Partial<LangChainConfig> = {
    useChains: false,
    useAgents: true,
    agentType,
  };

  const response = await langChainProvider.generateResponseWithAgent(langChainMessages, config);
  
  return {
    content: response.content,
    agent: response.agent,
    usage: response.usage,
  };
} 