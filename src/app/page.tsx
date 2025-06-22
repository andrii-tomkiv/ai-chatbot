import ChatBox from '@/components/ChatBox';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Chatbot
          </h1>
          <p className="text-gray-600">
            Ask questions about our content and get intelligent responses
          </p>
        </div>
        
        <div className="h-[600px]">
          <ChatBox />
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by Mistral AI • Content-based responses only</p>
        </div>
      </div>
    </main>
  );
}
