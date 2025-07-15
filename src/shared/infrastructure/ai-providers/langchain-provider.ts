import { ChatMistralAI } from '@langchain/mistralai';
import { ChatGroq } from '@langchain/groq';
import { 
  ChatPromptTemplate, 
  HumanMessagePromptTemplate, 
  SystemMessagePromptTemplate 
} from '@langchain/core/prompts';
import { 
  RunnableSequence
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { 
  BaseChatModel, 
  BaseChatModelCallOptions 
} from '@langchain/core/language_models/chat_models';
import { 
  BaseMessage, 
  HumanMessage, 
  SystemMessage, 
  AIMessage 
} from '@langchain/core/messages';
import { config } from '../../utils/config/config';
import { LLMProvider, LLMConfig, Message } from './llm-provider';

export interface LangChainConfig extends LLMConfig {
  useChains?: boolean;
  useAgents?: boolean;
  chainType?: 'conversation' | 'qa' | 'custom';
  agentType?: 'react' | 'tool-calling' | 'custom';
}

export interface LangChainResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  chain?: {
    type: string;
    steps: string[];
  };
  agent?: {
    type: string;
    actions: string[];
  };
}

export interface LangChainProvider extends LLMProvider {
  generateResponseWithChain(
    messages: Message[], 
    config?: Partial<LangChainConfig>
  ): Promise<LangChainResponse>;
  
  generateResponseWithAgent(
    messages: Message[], 
    config?: Partial<LangChainConfig>
  ): Promise<LangChainResponse>;
  
  createConversationChain(
    systemPrompt: string
  ): RunnableSequence;
  
  createQARetrievalChain(
    systemPrompt: string,
    contextRetriever: (query: string) => Promise<string>
  ): RunnableSequence;
}

export class LangChainProviderImpl implements LangChainProvider {
  private defaultConfig: LangChainConfig;
  private mistralModel?: ChatMistralAI;
  private groqModel?: ChatGroq;
  private currentModel!: BaseChatModel;

  constructor(config?: Partial<LangChainConfig>) {
    console.log(`[LANGCHAIN] Creating LangChainProviderImpl with config:`, config);
    this.defaultConfig = {
      model: 'mistral-small-latest',
      maxTokens: 1000,
      temperature: 0.7,
      useChains: true,
      useAgents: false,
      chainType: 'conversation',
      ...config,
    };
    
    this.initializeModels();
  }

  private initializeModels(): void {
    const mistralApiKey = config.getApiKeys().mistral;
    const groqApiKey = config.getApiKeys().groq;

    if (mistralApiKey) {
      try {
        this.mistralModel = new ChatMistralAI({
          apiKey: mistralApiKey,
          model: config.getModels().mistral.chat,
          maxTokens: this.defaultConfig.maxTokens,
          temperature: this.defaultConfig.temperature,
        });
        console.log(`✅ LangChain Mistral model initialized`);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize Mistral model: ${error}`);
      }
    }

    if (groqApiKey) {
      try {
        this.groqModel = new ChatGroq({
          apiKey: groqApiKey,
          model: config.getModels().groq.chat,
          maxTokens: this.defaultConfig.maxTokens,
          temperature: this.defaultConfig.temperature,
        });
        console.log(`✅ LangChain Groq model initialized`);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize Groq model: ${error}`);
      }
    }

    // Set default model based on availability
    if (this.mistralModel) {
      this.currentModel = this.mistralModel;
    } else if (this.groqModel) {
      this.currentModel = this.groqModel;
    } else {
      throw new Error('No LangChain models available. Please check your API keys.');
    }
  }

  private convertMessages(messages: Message[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        case 'system':
          return new SystemMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  private convertToLangChainMessages(messages: Message[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        case 'system':
          return new SystemMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  async generateResponse(
    messages: Message[], 
    langChainConfig?: Partial<LangChainConfig>
  ): Promise<LangChainResponse> {
    const mergedConfig = { ...this.defaultConfig, ...langChainConfig };
    
    if (mergedConfig.useChains) {
      return this.generateResponseWithChain(messages, mergedConfig);
    }
    
    if (mergedConfig.useAgents) {
      return this.generateResponseWithAgent(messages, mergedConfig);
    }

    // Fallback to direct model call
    return this.generateDirectResponse(messages, mergedConfig);
  }

  private async generateDirectResponse(
    messages: Message[], 
    config: LangChainConfig
  ): Promise<LangChainResponse> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    try {
      const response = await this.currentModel.invoke(langChainMessages);
      
      return {
        content: response.content as string,
        usage: {
          promptTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0),
          completionTokens: response.content.length,
          totalTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0) + response.content.length,
        },
      };
    } catch (error) {
      console.error('[LANGCHAIN] Direct response generation failed:', error);
      throw error;
    }
  }

  async generateResponseWithChain(
    messages: Message[], 
    config: Partial<LangChainConfig> = {}
  ): Promise<LangChainResponse> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    try {
      let chain: RunnableSequence;
      
      if (mergedConfig.chainType === 'qa') {
        // For QA, we'll use a simple chain without retrieval for now
        chain = this.createConversationChain(
          "You are a helpful AI assistant. Answer questions based on the provided context."
        );
      } else {
        // Default conversation chain
        chain = this.createConversationChain(
          "You are a helpful AI assistant. Provide accurate and helpful responses."
        );
      }

      const lastMessage = messages[messages.length - 1];
      const response = await chain.invoke({
        input: lastMessage.content,
        chat_history: messages.slice(0, -1).map(msg => `${msg.role}: ${msg.content}`).join('\n')
      });

      return {
        content: response as string,
        usage: {
          promptTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0),
          completionTokens: (response as string).length,
          totalTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0) + (response as string).length,
        },
        chain: {
          type: mergedConfig.chainType || 'conversation',
          steps: ['prompt_template', 'llm', 'output_parser']
        }
      };
    } catch (error) {
      console.error('[LANGCHAIN] Chain response generation failed:', error);
      throw error;
    }
  }

  async generateResponseWithAgent(
    messages: Message[], 
    config: Partial<LangChainConfig> = {}
  ): Promise<LangChainResponse> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    try {
      // For now, implement a simple agent that can use basic tools
      const lastMessage = messages[messages.length - 1];
      
      // Simple agent implementation - can be extended with more sophisticated tools
      const agentPrompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
          "You are a helpful AI assistant with access to various tools. " +
          "Think step by step about how to help the user and use appropriate tools when needed."
        ),
        HumanMessagePromptTemplate.fromTemplate("{input}")
      ]);

      const agentChain = RunnableSequence.from([
        agentPrompt,
        this.currentModel,
        new StringOutputParser()
      ]);

      const response = await agentChain.invoke({
        input: lastMessage.content
      });

      return {
        content: response,
        usage: {
          promptTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0),
          completionTokens: response.length,
          totalTokens: messages.reduce((sum, msg) => sum + msg.content.length, 0) + response.length,
        },
        agent: {
          type: mergedConfig.agentType || 'react',
          actions: ['think', 'respond']
        }
      };
    } catch (error) {
      console.error('[LANGCHAIN] Agent response generation failed:', error);
      throw error;
    }
  }

  createConversationChain(systemPrompt: string): RunnableSequence {
    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(systemPrompt),
      HumanMessagePromptTemplate.fromTemplate(
        "Chat History:\n{chat_history}\n\nCurrent Question: {input}"
      )
    ]);

    return RunnableSequence.from([
      prompt,
      this.currentModel,
      new StringOutputParser()
    ]);
  }

  createQARetrievalChain(
    systemPrompt: string,
    contextRetriever: (query: string) => Promise<string>
  ): RunnableSequence {
    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `${systemPrompt}\n\nUse the following context to answer the question:\n{context}`
      ),
      HumanMessagePromptTemplate.fromTemplate("{question}")
    ]);

    return RunnableSequence.from([
      {
        question: (input: { question: string }) => input.question,
        context: async (input: { question: string }) => {
          return await contextRetriever(input.question);
        }
      },
      prompt,
      this.currentModel,
      new StringOutputParser()
    ]);
  }

  async *generateStreamingResponse(
    messages: Message[], 
    config?: Partial<LangChainConfig>
  ): AsyncGenerator<string> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    try {
      const stream = await this.currentModel.stream(langChainMessages);
      
      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content as string;
        }
      }
    } catch (error) {
      console.error('[LANGCHAIN] Streaming response generation failed:', error);
      throw error;
    }
  }

  setModel(provider: 'mistral' | 'groq'): void {
    if (provider === 'mistral' && this.mistralModel) {
      this.currentModel = this.mistralModel;
    } else if (provider === 'groq' && this.groqModel) {
      this.currentModel = this.groqModel;
    } else {
      console.warn(`[LANGCHAIN] Provider ${provider} not available, keeping current model`);
    }
  }

  getModelName(): string {
    return this.currentModel?.constructor?.name || 'Unknown';
  }

  getProviderName(): string {
    return 'LangChain';
  }
}

export const langChainProvider = new LangChainProviderImpl({
  model: 'mistral-small-latest',
  maxTokens: 1000,
  temperature: 0.7,
  useChains: true,
  useAgents: false,
  chainType: 'conversation',
}); 