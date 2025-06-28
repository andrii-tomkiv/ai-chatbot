import ChatBox from '@/components/ChatBox';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-conab-light-background to-white">
      <header className="bg-conab-header text-white py-6 shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">ConceiveAbilities AI Assistant</h1>
              <p className="text-white/80 mt-1">Your trusted guide for surrogacy and egg donation information</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/70">Powered by Mistral AI</div>
              <div className="text-xs text-white/50">Real-time semantic search</div>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="h-[600px]">
                <ChatBox />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
