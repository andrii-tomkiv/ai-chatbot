# Vercel Deployment Guide

## Problem
Your chatbot works locally but fails on Vercel because the `data/vector-store/documents.json` file doesn't exist in the serverless environment.

## Solution
We've implemented a hybrid VectorDB that automatically uses:
- **Local file storage** in development
- **Vercel KV (Redis)** in production

## Setup Steps

### 1. Set up Vercel KV

1. **Install Vercel KV** (already done):
   ```bash
   npm install @vercel/kv
   ```

2. **Create KV Database** in Vercel Dashboard:
   - Go to your Vercel project
   - Navigate to Storage → KV
   - Create a new KV database
   - Copy the connection details

3. **Add Environment Variables** to your Vercel project:
   ```
   KV_URL=your-kv-url
   KV_REST_API_URL=your-kv-rest-api-url
   KV_REST_API_TOKEN=your-kv-rest-api-token
   KV_REST_API_READ_ONLY_TOKEN=your-kv-read-only-token
   ```

### 2. Migrate Your Data

Run the migration script to move your local data to Vercel KV:

```bash
# Set your KV environment variables locally first
export KV_URL=your-kv-url
export KV_REST_API_URL=your-kv-rest-api-url
export KV_REST_API_TOKEN=your-kv-rest-api-token

# Run migration
npx tsx scripts/migrate-to-kv.ts
```

### 3. Deploy to Vercel

Your chatbot will now automatically:
- Use local files in development
- Use Vercel KV in production
- Fall back gracefully if KV is not available

## How It Works

The updated `VectorDB` class:

1. **Detects Environment**: Checks if `KV_URL` is available
2. **Automatic Fallback**: Uses file storage if KV is not available
3. **Seamless Migration**: Loads from files locally, saves to KV in production

## Verification

After deployment, test your chatbot with:
```bash
curl -X POST https://your-vercel-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What are the requirements to become a surrogate?"}]}'
```

## Troubleshooting

### No Documents Found
- Ensure you've run the migration script
- Check that KV environment variables are set correctly
- Verify KV database is created and accessible

### Migration Fails
- Make sure `data/vector-store/documents.json` exists locally
- Check KV credentials are correct
- Ensure you have write permissions to KV

### Performance Issues
- KV has rate limits, consider implementing caching
- Large documents may need chunking
- Monitor KV usage in Vercel dashboard

## Alternative Solutions

If you prefer not to use KV, you can:

1. **Use a different vector database** (Pinecone, Weaviate, etc.)
2. **Store embeddings in a database** (PostgreSQL with pgvector)
3. **Use a CDN** for static document storage
4. **Implement a hybrid approach** with multiple storage backends

## Cost Considerations

- Vercel KV has usage-based pricing
- Consider the size of your vector data
- Monitor usage in Vercel dashboard
- Implement cleanup strategies for old data 