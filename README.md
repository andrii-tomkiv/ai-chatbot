# CONAB AI Chatbot

A Next.js AI chatbot with Mistral and Groq integration, featuring semantic search and customizable settings.

## Features

### Core Features
- **AI Chat Interface** - Powered by Mistral and Groq LLMs
- **Semantic Search** - Vector database for context-aware responses
- **Streaming Responses** - Real-time AI responses with fallback support
- **Rate Limiting** - Built-in protection against abuse
- **Message History** - Persistent chat sessions

### Temperature/Model Settings
- **Model Selection** - Choose between Mistral and Groq models
- **Temperature Control** - Adjust AI creativity (0.0 - 1.0)
- **Max Tokens** - Control response length (100 - 2000 tokens)
- **Preset Configurations** - Quick settings for different use cases
- **Persistent Settings** - Settings saved to localStorage

#### Temperature Presets
- **Focused (0.1)** - Very consistent, factual responses
- **Balanced (0.3)** - Good balance of creativity and accuracy  
- **Creative (0.7)** - More imaginative and varied responses
- **Explorative (1.0)** - Maximum creativity and variety

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- API keys for Mistral and/or Groq

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd conab-ai-chatbot-next-js
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Configure your API keys in `.env.local`:
```env
MISTRAL_API_KEY=your_mistral_api_key
GROQ_API_KEY=your_groq_api_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Chat Interface
- Type your message and press Enter to send
- Use Shift+Enter for new lines
- Click the settings icon to customize AI behavior

### Settings Panel
- **Model Selection**: Choose between Mistral (fast and reliable) or Groq (high-speed inference)
- **Temperature Slider**: Drag to adjust creativity level
- **Max Tokens**: Set maximum response length
- **Quick Presets**: Click preset buttons for common configurations

### Message Management
- **Regenerate**: Click the three dots on any AI response to regenerate
- **Clear Chat**: Use the "Clear" button to start a new conversation
- **History**: Chat history is automatically saved and restored

## Architecture

### LLM Providers
- **Primary**: Mistral AI (mistral-small-latest)
- **Fallback**: Groq (llama-3.3-70b-versatile)
- **Automatic Fallback**: Switches to fallback if primary fails or times out

### Vector Database
- **Storage**: HNSW-based vector store
- **Embeddings**: Mistral embeddings for semantic search
- **Context**: Relevant documents retrieved for each query

### Configuration
- **Modular Design**: Separate providers for LLM, embeddings, and vector DB
- **Environment Variables**: All settings configurable via .env
- **Service Factory**: Centralized service management

## Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run scrape-content    # Scrape website content
npm run generate-embeddings  # Generate embeddings from scraped content
```

### Project Structure
```
src/
├── app/                 # Next.js app directory
│   ├── actions.ts      # Server actions for chat
│   └── layout.tsx      # Root layout
├── components/         # React components
│   ├── ChatBox.tsx     # Main chat interface
│   └── features/       # Chat feature components
├── lib/               # Core libraries
│   ├── config.ts      # Configuration management
│   ├── llm-provider.ts # LLM service providers
│   ├── embedding-provider.ts # Embedding services
│   ├── vector-db.ts   # Vector database
│   └── service-factory.ts # Service orchestration
└── scripts/           # Utility scripts
    ├── scrapeContent.ts # Content scraping
    └── generateEmbeddings.ts # Embedding generation
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MISTRAL_API_KEY` | Mistral AI API key | Required |
| `GROQ_API_KEY` | Groq API key | Required |
| `LLM_PRIMARY_PROVIDER` | Primary LLM provider | `mistral` |
| `LLM_FALLBACK_PROVIDER` | Fallback LLM provider | `groq` |
| `LLM_TIMEOUT_MS` | LLM request timeout | `5000` |
| `CHAT_TEMPERATURE` | Default temperature | `0.7` |
| `CHAT_MAX_TOKENS` | Default max tokens | `1000` |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
