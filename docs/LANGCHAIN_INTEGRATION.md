# 🔗 LangChain Integration Guide

This document explains how to use the LangChain integration in your ConceiveAbilities AI Chatbot project.

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The LangChain integration enhances your existing AI chatbot with advanced features like:

- **Chains**: Composable workflows for different types of tasks
- **Agents**: Intelligent systems that can reason and act
- **Enhanced Prompt Management**: Structured prompts with templates
- **Better Error Handling**: Graceful fallbacks and recovery
- **Streaming Support**: Real-time response generation

## 📦 Installation

The LangChain packages are already installed in your project:

```bash
npm install langchain @langchain/core @langchain/groq @langchain/community
```

## ✨ Features

### 🔗 Chains

**Conversation Chain**
- Natural chat interactions
- Maintains conversation history
- Context-aware responses

**Q&A Chain**
- Question answering with context retrieval
- Integrates with your vector database
- Structured responses

**Custom Chain**
- Extensible for specialized workflows
- Custom prompt templates
- Flexible input/output handling

### 🤖 Agents

**ReAct Agent**
- Reasoning and acting capabilities
- Step-by-step problem solving
- Tool usage when needed

**Tool Calling Agent**
- Function calling capabilities
- API integration
- Structured tool execution

**Custom Agent**
- Extensible agent framework
- Custom reasoning patterns
- Specialized capabilities

### ⚙️ Model Support

- **Mistral**: Small, Medium, Large models
- **Groq**: Llama 3.1 models (70B, 8B)
- **Automatic Fallback**: Seamless provider switching
- **Model Switching**: Runtime model selection

## 🚀 Usage

### Basic Usage

```typescript
import { generateResponseWithChain, generateResponseWithAgent } from '@/app/langchain-actions';

// Using a conversation chain
const response = await generateResponseWithChain(
  [{ role: 'user', content: 'Hello!' }],
  'conversation',
  'You are a helpful AI assistant.'
);

// Using an agent
const agentResponse = await generateResponseWithAgent(
  [{ role: 'user', content: 'Help me solve this problem...' }],
  'react'
);
```

### Advanced Usage with Options

```typescript
import { continueConversationWithLangChain } from '@/app/langchain-actions';

const result = await continueConversationWithLangChain(
  messageHistory,
  {
    useChains: true,
    useAgents: false,
    chainType: 'qa',
    model: 'mistral-medium-latest',
    temperature: 0.7,
    maxTokens: 1000,
    maxResults: 5, // For Q&A chains
  }
);
```

### Using the LangChain Provider Directly

```typescript
import { serviceFactory } from '@/shared/utils/helpers/service-factory';

const langChainProvider = serviceFactory.getLangChainProvider();

// Direct response generation
const response = await langChainProvider.generateResponse(messages);

// Chain-based response
const chainResponse = await langChainProvider.generateResponseWithChain(
  messages,
  { chainType: 'conversation' }
);

// Agent-based response
const agentResponse = await langChainProvider.generateResponseWithAgent(
  messages,
  { agentType: 'react' }
);
```

## 📚 API Reference

### `continueConversationWithLangChain`

Main function for chat interactions with LangChain features.

```typescript
function continueConversationWithLangChain(
  history: Message[],
  options: LangChainChatOptions = {}
): Promise<{
  messages: Message[];
  newMessage: StreamableValue<string>;
  sources: Array<{ url: string; title?: string }>;
}>
```

**Options:**
- `useChains`: Enable chain-based processing
- `useAgents`: Enable agent-based processing
- `chainType`: Type of chain ('conversation' | 'qa' | 'custom')
- `agentType`: Type of agent ('react' | 'tool-calling' | 'custom')
- `model`: Model to use
- `temperature`: Response creativity (0-2)
- `maxTokens`: Maximum response length
- `maxResults`: Number of context documents for Q&A

### `generateResponseWithChain`

Generate responses using specific chain types.

```typescript
function generateResponseWithChain(
  messages: Message[],
  chainType: 'conversation' | 'qa' | 'custom' = 'conversation',
  systemPrompt?: string
): Promise<{
  content: string;
  chain?: { type: string; steps: string[] };
}>
```

### `generateResponseWithAgent`

Generate responses using specific agent types.

```typescript
function generateResponseWithAgent(
  messages: Message[],
  agentType: 'react' | 'tool-calling' | 'custom' = 'react'
): Promise<{
  content: string;
  agent?: { type: string; actions: string[] };
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}>
```

## 💡 Examples

### Example 1: Simple Chat

```typescript
const messages = [
  { role: 'user', content: 'What is artificial intelligence?' }
];

const response = await generateResponseWithChain(
  messages,
  'conversation',
  'You are an AI expert. Provide clear, accurate explanations.'
);

console.log(response.content);
```

### Example 2: Q&A with Context

```typescript
const messages = [
  { role: 'user', content: 'What are the requirements for surrogacy?' }
];

const response = await generateResponseWithChain(
  messages,
  'qa',
  'You are a surrogacy expert. Answer based on the provided context.'
);

console.log(response.content);
console.log('Chain steps:', response.chain?.steps);
```

### Example 3: Agent for Complex Tasks

```typescript
const messages = [
  { role: 'user', content: 'Help me plan a surrogacy journey step by step.' }
];

const response = await generateResponseWithAgent(
  messages,
  'react'
);

console.log(response.content);
console.log('Agent actions:', response.agent?.actions);
```

### Example 4: Model Switching

```typescript
const langChainProvider = serviceFactory.getLangChainProvider();

// Switch to Groq
langChainProvider.setModel('groq');
const groqResponse = await langChainProvider.generateResponse(messages);

// Switch back to Mistral
langChainProvider.setModel('mistral');
const mistralResponse = await langChainProvider.generateResponse(messages);
```

## 🧪 Testing

Run the LangChain integration tests:

```bash
npm run test-langchain
```

This will test:
- Provider initialization
- Direct response generation
- Conversation chains
- Q&A chains
- Agent responses
- Streaming responses
- Model switching
- Configuration integration

### Manual Testing

Visit the demo page to test the integration interactively:

```
http://localhost:3000/langchain-demo
```

## 🔧 Troubleshooting

### Common Issues

**1. Import Errors**
```
Cannot find module '@langchain/community/chat_models'
```
**Solution**: Ensure all LangChain packages are installed:
```bash
npm install langchain @langchain/core @langchain/groq @langchain/community
```

**2. API Key Issues**
```
Mistral API key not configured
```
**Solution**: Check your environment variables:
```env
MISTRAL_API_KEY=your_mistral_api_key
GROQ_API_KEY=your_groq_api_key
```

**3. Model Not Found**
```
Model not available
```
**Solution**: Verify model names and provider availability:
```typescript
// Available models
const models = {
  mistral: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
  groq: ['llama3-70b-8192', 'llama3-8b-8192']
};
```

**4. Fallback Issues**
```
Fallback provider also failed
```
**Solution**: Check both providers are configured and working:
```typescript
const langChainProvider = serviceFactory.getLangChainProvider();
console.log('Available models:', langChainProvider.getModelName());
```

### Debug Mode

Enable debug logging by setting the environment variable:

```env
DEBUG=langchain:*
```

### Health Check

Check the health of all components:

```typescript
const health = await serviceFactory.healthCheck();
console.log('Health status:', health);
```

## 🔄 Migration from Existing System

The LangChain integration is designed to work alongside your existing system:

1. **Backward Compatibility**: All existing features continue to work
2. **Gradual Migration**: You can use LangChain features selectively
3. **Fallback Support**: Automatic fallback to existing providers
4. **Same Interface**: Compatible with existing message formats

### Migration Steps

1. **Test the Integration**: Run `npm run test-langchain`
2. **Try the Demo**: Visit `/langchain-demo`
3. **Update Components**: Replace `continueConversation` with `continueConversationWithLangChain` where needed
4. **Monitor Performance**: Check logs for any issues
5. **Full Migration**: Update all chat components to use LangChain

## 📈 Performance Considerations

- **Chains**: Slightly slower than direct calls due to additional processing
- **Agents**: May take longer for complex reasoning tasks
- **Streaming**: Real-time response generation for better UX
- **Caching**: Consider implementing response caching for repeated queries
- **Rate Limiting**: LangChain respects existing rate limiting

## 🔮 Future Enhancements

Planned features for future releases:

- **Custom Tools**: User-defined tools for agents
- **Memory Systems**: Long-term conversation memory
- **Advanced Agents**: More sophisticated reasoning patterns
- **Tool Integration**: API and database tool integration
- **Performance Optimization**: Caching and optimization strategies

## 📞 Support

For issues or questions about the LangChain integration:

1. Check the troubleshooting section above
2. Review the test output for specific errors
3. Check the console logs for detailed error messages
4. Verify your environment configuration
5. Test with the demo page to isolate issues

---

**Note**: This integration maintains full compatibility with your existing system while adding powerful new capabilities. You can use it incrementally or fully migrate based on your needs. 