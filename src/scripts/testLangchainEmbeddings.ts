import 'dotenv/config';
import { MistralAIEmbeddings } from '@langchain/mistralai';

async function testEmbeddings() {
  console.log('🧪 Testing LangChain Mistral embeddings...');
  console.log('🔑 API Key check:', process.env.MISTRAL_API_KEY ? 'Present' : 'Missing');
  
  try {
    const embeddings = new MistralAIEmbeddings({
      model: 'mistral-embed',
      apiKey: process.env.MISTRAL_API_KEY,
    });

    console.log('✅ MistralAIEmbeddings initialized');
    
    // Test with a simple text
    const testText = "Hello, this is a test for embeddings";
    console.log('📝 Testing with text:', testText);
    
    const result = await embeddings.embedQuery(testText);
    
    console.log('✅ Embedding generated successfully!');
    console.log('📊 Embedding length:', result.length);
    console.log('🔢 First 5 values:', result.slice(0, 5));
    
    return true;
    
  } catch (error) {
    console.error('❌ Error with LangChain embeddings:', error);
    return false;
  }
}

// Run the test
testEmbeddings().then(success => {
  if (success) {
    console.log('\n🎉 LangChain embeddings work! We can proceed with the full embedding process.');
  } else {
    console.log('\n💔 LangChain embeddings also failed. We need to fix the API key permissions.');
  }
}); 