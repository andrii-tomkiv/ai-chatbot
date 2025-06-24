import ChatBox from '@/components/ChatBox';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">  
        <div className="h-[600px]">
          <ChatBox />
        </div>
      </div>
    </main>
  );
}
