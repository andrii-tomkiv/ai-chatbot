import ChatBox from '@/components/ChatBox';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-conab-light-background via-white to-conab-light-background">
      <div className="h-screen flex items-center justify-center p-4">
        <ChatBox />
      </div>
    </main>
  );
}
