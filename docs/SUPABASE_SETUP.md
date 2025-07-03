# 🗄️ Supabase Setup Guide for Hackathon

This guide will help you set up a free Supabase database to store your embeddings instead of using local files.

## 🚀 Quick Setup (5 minutes)

### 1. Create Free Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" 
3. Sign up with GitHub (recommended for hackathons)
4. Create a new project

### 2. Get Your Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. These will look like:
   - URL: `https://your-project-id.supabase.co`
   - Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Set Environment Variables
Create or update your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Create Database Table
Run this SQL in your Supabase SQL Editor:

```sql
-- Create embeddings table
CREATE TABLE embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding REAL[] NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_embeddings_metadata ON embeddings USING GIN (metadata);

-- Enable Row Level Security (optional for hackathon)
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict later)
CREATE POLICY "Allow all operations" ON embeddings FOR ALL USING (true);
```

### 5. Migrate Your Data
Run the migration script to move your existing embeddings:

```bash
# Install dependencies if not already done
npm install

# Run migration
npx tsx src/scripts/migrate-to-supabase.ts
```

## 🎯 Benefits for Hackathon

### ✅ **Free Tier Limits**
- **500MB** database storage
- **2GB** bandwidth per month
- **50,000** monthly active users
- **Unlimited** API requests

### ✅ **Perfect for Hackathons**
- No credit card required
- Instant setup
- Global access from anywhere
- Real-time capabilities
- Built-in authentication (if needed later)

### ✅ **Better Than Local Files**
- Accessible from any deployment (Vercel, Netlify, etc.)
- No file size limits
- Better performance
- Scalable

## 🔧 Troubleshooting

### "Missing Supabase environment variables"
- Make sure your `.env.local` file has the correct variables
- Restart your development server after adding environment variables

### "Table does not exist"
- Run the SQL commands in Supabase SQL Editor
- Check that the table name is exactly `embeddings`

### "Permission denied"
- Make sure Row Level Security policies are set up correctly
- Check that your anon key has the right permissions

## 🚀 Deployment

### Vercel
1. Add environment variables in Vercel dashboard
2. Deploy normally - Supabase will work from anywhere

### Other Platforms
- Add the same environment variables to your deployment platform
- No additional configuration needed

## 📊 Monitoring

Check your Supabase dashboard for:
- Database usage
- API requests
- Storage usage
- Real-time connections

## 🎉 You're Ready!

Your embeddings are now stored in a free, globally accessible database perfect for hackathon demos and presentations! 