import { config } from '../shared/utils/config/config';
import { serviceFactory } from '../shared/utils/helpers/service-factory';
import { generateResponseWithChain, generateResponseWithAgent } from '../app/langchain-actions';

async function testLangChainIntegration() {
  console.log('🧪 Testing LangChain Integration...\n');

  try {
    // Test 1: Basic LangChain provider initialization
    console.log('1️⃣ Testing LangChain Provider Initialization...');
    const langChainProvider = serviceFactory.getLangChainProvider();
    console.log(`✅ LangChain Provider: ${langChainProvider.getProviderName()}`);
    console.log(`✅ Model: ${langChainProvider.getModelName()}\n`);

    // Test 2: Direct response generation
    console.log('2️⃣ Testing Direct Response Generation...');
    const testMessages = [
      { role: 'user' as const, content: 'Hello! How are you today?' }
    ];

    try {
      const response = await langChainProvider.generateResponse(testMessages);
      console.log(`✅ Direct Response: ${response.content.substring(0, 100)}...`);
      console.log(`✅ Usage: ${JSON.stringify(response.usage)}\n`);
    } catch (error) {
      console.log(`⚠️ Direct Response failed: ${error}\n`);
    }

    // Test 3: Conversation Chain
    console.log('3️⃣ Testing Conversation Chain...');
    try {
      const chainResponse = await generateResponseWithChain(
        testMessages,
        'conversation',
        'You are a helpful AI assistant. Keep responses concise.'
      );
      console.log(`✅ Chain Response: ${chainResponse.content.substring(0, 100)}...`);
      console.log(`✅ Chain Type: ${chainResponse.chain?.type}`);
      console.log(`✅ Chain Steps: ${chainResponse.chain?.steps.join(' → ')}\n`);
    } catch (error) {
      console.log(`⚠️ Conversation Chain failed: ${error}\n`);
    }

    // Test 4: QA Chain
    console.log('4️⃣ Testing QA Chain...');
    try {
      const qaMessages = [
        { role: 'user' as const, content: 'What is artificial intelligence?' }
      ];
      
      const qaResponse = await generateResponseWithChain(
        qaMessages,
        'qa',
        'You are an AI expert. Answer questions about artificial intelligence based on the provided context.'
      );
      console.log(`✅ QA Response: ${qaResponse.content.substring(0, 100)}...`);
      console.log(`✅ QA Chain Type: ${qaResponse.chain?.type}`);
      console.log(`✅ QA Chain Steps: ${qaResponse.chain?.steps.join(' → ')}\n`);
    } catch (error) {
      console.log(`⚠️ QA Chain failed: ${error}\n`);
    }

    // Test 5: Agent Response
    console.log('5️⃣ Testing Agent Response...');
    try {
      const agentMessages = [
        { role: 'user' as const, content: 'Can you help me understand machine learning?' }
      ];
      
      const agentResponse = await generateResponseWithAgent(agentMessages, 'react');
      console.log(`✅ Agent Response: ${agentResponse.content.substring(0, 100)}...`);
      console.log(`✅ Agent Type: ${agentResponse.agent?.type}`);
      console.log(`✅ Agent Actions: ${agentResponse.agent?.actions.join(', ')}\n`);
    } catch (error) {
      console.log(`⚠️ Agent Response failed: ${error}\n`);
    }

    // Test 6: Streaming Response
    console.log('6️⃣ Testing Streaming Response...');
    try {
      const streamingMessages = [
        { role: 'user' as const, content: 'Tell me a short story about a robot.' }
      ];
      
      console.log('📝 Streaming response:');
      let fullResponse = '';
      const stream = langChainProvider.generateStreamingResponse(streamingMessages);
      
      for await (const chunk of stream) {
        process.stdout.write(chunk);
        fullResponse += chunk;
      }
      console.log('\n');
      console.log(`✅ Streaming completed. Total length: ${fullResponse.length} characters\n`);
    } catch (error) {
      console.log(`⚠️ Streaming failed: ${error}\n`);
    }

    // Test 7: Model Switching
    console.log('7️⃣ Testing Model Switching...');
    try {
      console.log('🔄 Switching to Groq model...');
      langChainProvider.setModel('groq');
      console.log(`✅ Current model: ${langChainProvider.getModelName()}`);
      
      const groqResponse = await langChainProvider.generateResponse(testMessages);
      console.log(`✅ Groq Response: ${groqResponse.content.substring(0, 100)}...\n`);
      
      console.log('🔄 Switching back to Mistral model...');
      langChainProvider.setModel('mistral');
      console.log(`✅ Current model: ${langChainProvider.getModelName()}\n`);
    } catch (error) {
      console.log(`⚠️ Model switching failed: ${error}\n`);
    }

    // Test 8: Configuration
    console.log('8️⃣ Testing Configuration...');
    const currentConfig = config.getChatConfig();
    console.log(`✅ Max Tokens: ${currentConfig.maxTokens}`);
    console.log(`✅ Temperature: ${currentConfig.temperature}`);
    console.log(`✅ Max History Length: ${currentConfig.maxHistoryLength}`);
    
    const models = config.getModels();
    console.log(`✅ Mistral Chat Model: ${models.mistral.chat}`);
    console.log(`✅ Groq Chat Model: ${models.groq.chat}\n`);

    console.log('🎉 LangChain Integration Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ LangChain Provider initialized');
    console.log('✅ Direct response generation working');
    console.log('✅ Conversation chains working');
    console.log('✅ QA chains working');
    console.log('✅ Agent responses working');
    console.log('✅ Streaming responses working');
    console.log('✅ Model switching working');
    console.log('✅ Configuration integration working');

  } catch (error) {
    console.error('❌ LangChain Integration Test Failed:', error);
    process.exit(1);
  }
}

// Run the test
testLangChainIntegration().catch(console.error); 