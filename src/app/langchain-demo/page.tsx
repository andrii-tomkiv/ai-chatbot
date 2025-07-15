import { LangChainChatBox } from '@/domains/chat/components/LangChainChatBox';

export default function LangChainDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              LangChain Integration Demo
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Experience the power of LangChain with different chain types and agents. 
              Switch between conversation chains, Q&A chains, and various agent types to see how they handle different types of queries.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">🔗 Chains</h3>
              <p className="text-gray-600 mb-4">
                Use different chain types for various tasks:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Conversation:</strong> Natural chat interactions</li>
                <li>• <strong>Q&A:</strong> Question answering with context</li>
                <li>• <strong>Custom:</strong> Specialized workflows</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">🤖 Agents</h3>
              <p className="text-gray-600 mb-4">
                Intelligent agents that can reason and act:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>ReAct:</strong> Reasoning and acting</li>
                <li>• <strong>Tool Calling:</strong> Function calling</li>
                <li>• <strong>Custom:</strong> Specialized agents</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">⚙️ Models</h3>
              <p className="text-gray-600 mb-4">
                Multiple model providers supported:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Mistral:</strong> Small, Medium, Large</li>
                <li>• <strong>Groq:</strong> Llama 3.1 models</li>
                <li>• <strong>Fallback:</strong> Automatic switching</li>
              </ul>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <LangChainChatBox className="h-[600px]" />
          </div>

          {/* Usage Instructions */}
          <div className="mt-8 bg-blue-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-blue-900 mb-4">How to Use</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Testing Chains:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Select "Chains" mode</li>
                  <li>• Try "Conversation" for general chat</li>
                  <li>• Use "Q&A" for specific questions</li>
                  <li>• Experiment with different models</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Testing Agents:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Select "Agents" mode</li>
                  <li>• Try "ReAct" for reasoning tasks</li>
                  <li>• Use "Tool Calling" for function execution</li>
                  <li>• Ask complex multi-step questions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="mt-8 bg-gray-100 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Technical Implementation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">LangChain Features:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• RunnableSequence for chain composition</li>
                  <li>• ChatPromptTemplate for structured prompts</li>
                  <li>• StringOutputParser for response formatting</li>
                  <li>• Streaming support for real-time responses</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Integration Benefits:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Seamless fallback to existing providers</li>
                  <li>• Maintains all existing features (rate limiting, validation)</li>
                  <li>• Enhanced prompt management</li>
                  <li>• Better error handling and recovery</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 