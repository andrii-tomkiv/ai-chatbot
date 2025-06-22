# AI Chatbot with Mistral

A fullstack Next.js AI chatbot that uses Mistral models to provide intelligent responses based on indexed website content. The chatbot is embeddable across multiple sites using iframes.

## Features

- 🤖 **Mistral AI Integration**: Uses `mistral-small-latest` for chat and `mistral-embed` for embeddings
- 📚 **Content-Based Responses**: Answers only based on indexed website content
- 🔍 **Semantic Search**: Finds relevant content using vector similarity
- 📱 **Embeddable**: Can be embedded in any website using iframes
- ⚡ **Real-time Streaming**: Fast, responsive chat interface
- 🎯 **Source Citations**: Always cites the source URLs for information

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **AI**: Mistral AI (chat + embeddings)
- **Vector Database**: HNSWLib for semantic search
- **Streaming**: Vercel AI SDK

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd conab-ai-chatbot-next-js
npm install
```

### 2. Environment Setup

Create a `.env.local` file:

```bash
# Mistral AI API Key
MISTRAL_API_KEY=your_mistral_api_key_here

# Optional: Customize the target website
TARGET_WEBSITE=https://concealabilities.com

# Optional: Vector store path
VECTOR_STORE_PATH=./data/vector-store
```

Get your Mistral API key from [Mistral Console](https://console.mistral.ai/).

### 3. Index Content

Run the content indexing script:

```bash
npm run embed-content
```

This will:
- Scrape content from the target website
- Generate embeddings using Mistral
- Store content in the vector database

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the chatbot in action!

## Usage

### Local Development

1. Start the development server: `npm run dev`
2. Open `http://localhost:3000`
3. Start chatting with the AI assistant

### Embedding in Other Websites

The chatbot can be embedded in any website using an iframe:

```html
<iframe 
  src="http://localhost:3000" 
  width="400" 
  height="600" 
  frameborder="0"
  style="border: 1px solid #ccc; border-radius: 8px;">
</iframe>
```

For production, replace `localhost:3000` with your deployed URL.

### Customizing Content

To index content from a different website:

1. Update `TARGET_WEBSITE` in your `.env.local`
2. Run `npm run embed-content` again
3. The chatbot will now answer based on the new content

## API Endpoints

### POST /api/chat

Handles chat conversations with the AI assistant.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What services do you offer?"
    }
  ]
}
```

**Response:**
```json
{
  "content": "Based on our content, we offer comprehensive technology solutions and consulting services...",
  "sources": [
    "https://concealabilities.com/about",
    "https://concealabilities.com/services"
  ]
}
```

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts    # Chat API endpoint
│   └── page.tsx             # Main page with ChatBox
├── components/
│   └── ChatBox.tsx          # Chat interface component
├── lib/
│   ├── embedding.ts         # Mistral embedding utilities
│   └── vector-db.ts         # Vector database wrapper
└── scripts/
    └── embedSiteContent.ts  # Content indexing script
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run embed-content` - Index website content

## Configuration

### CORS and Iframe Support

The app is configured to allow iframe embedding and CORS from any domain:

- `X-Frame-Options: ALLOWALL`
- `Access-Control-Allow-Origin: *`

### Vector Database

The vector database stores:
- Content chunks with their text
- Source URLs for citation
- Embeddings for semantic search

## Troubleshooting

### Common Issues

1. **"Mistral API key not found"**
   - Ensure `MISTRAL_API_KEY` is set in `.env.local`

2. **"No content found"**
   - Run `npm run embed-content` to index website content

3. **Iframe not loading**
   - Check that the server is running and accessible
   - Verify CORS headers are properly set

### Debug Mode

Enable debug logging by setting `DEBUG=true` in your environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the Mistral AI documentation
3. Open an issue in the repository

---

**Note**: This chatbot is designed to answer questions based only on the indexed content. It will respond with "I'm not sure based on the current information" if it cannot find relevant content to answer a question.
