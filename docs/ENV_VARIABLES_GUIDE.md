# 🔧 Environment Variables Guide

## Essential Variables for Your `.env` File

### 🗄️ **Database Configuration (REQUIRED)**

```env
# Prisma Database Connection
DATABASE_URL="mysql://chatbot_user:chatbot_password@localhost:3306/chatbot_db"
```

**For Docker deployment:**
```env
DATABASE_URL="mysql://chatbot_user:chatbot_password@mysql:3306/chatbot_db"
```

### 🤖 **AI Provider API Keys (REQUIRED)**

```env
# Mistral AI (Primary LLM Provider)
MISTRAL_API_KEY="your_mistral_api_key_here"

# Groq AI (Fallback LLM Provider)  
GROQ_API_KEY="your_groq_api_key_here"

# OpenAI (Optional - for embeddings fallback)
OPENAI_API_KEY="your_openai_api_key_here"
```

### 📊 **Vector Store Configuration (CHOOSE ONE)**

**Option 1: Local Vector Store (Default)**
```env
# Uses local file system
VECTOR_DB_STORE_PATH="./data/vector-store"
```

**Option 2: Supabase Cloud Vector Store (Recommended for production)**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key_here"
```

---

## 📋 **Complete .env File Template**

Create a `.env` file in your project root with these variables:

```env
# =============================================================================
# ConceiveAbilities AI Chatbot - Environment Variables
# =============================================================================

# 🗄️ DATABASE (REQUIRED)
DATABASE_URL="mysql://chatbot_user:chatbot_password@localhost:3306/chatbot_db"

# 🤖 AI PROVIDERS (REQUIRED)
MISTRAL_API_KEY="your_mistral_api_key_here"
GROQ_API_KEY="your_groq_api_key_here"

# 📊 VECTOR STORE (OPTIONAL - for cloud storage)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key_here"

# 🔧 LLM CONFIGURATION (OPTIONAL - has defaults)
LLM_PRIMARY_PROVIDER="mistral"
LLM_FALLBACK_PROVIDER="groq"
LLM_TIMEOUT_MS="5000"

# 💬 CHAT SETTINGS (OPTIONAL - has defaults)
CHAT_MAX_TOKENS="1000"
CHAT_TEMPERATURE="0.7"
CHAT_MAX_HISTORY_LENGTH="10"

# 🛡️ RATE LIMITING (OPTIONAL - has defaults)
RATE_LIMIT_MAX_REQUESTS="100"
RATE_LIMIT_WINDOW_MS="900000"

# 🚀 DEPLOYMENT (OPTIONAL - auto-detected)
NODE_ENV="development"
NEXT_TELEMETRY_DISABLED="1"
PORT="3000"

# 📱 SOCIAL MEDIA (OPTIONAL)
FACEBOOK_ACCESS_TOKEN="your_facebook_access_token_here"
FACEBOOK_PAGE_ID="ConceiveAbilities"
```

---

## 🚀 **Setup Instructions**

### 1. **Database Setup**
```bash
# Start MySQL with Docker
docker-compose up -d mysql

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

### 2. **Get API Keys**

**Mistral AI:**
1. Go to [console.mistral.ai](https://console.mistral.ai/)
2. Create account → API Keys → Create new key
3. Copy the key to `MISTRAL_API_KEY`

**Groq AI:**
1. Go to [console.groq.com](https://console.groq.com/)
2. Create account → API Keys → Create API Key
3. Copy the key to `GROQ_API_KEY`

**Supabase (Optional):**
1. Go to [supabase.com](https://supabase.com/)
2. Create project → Settings → API
3. Copy URL and anon key

### 3. **Verify Setup**
```bash
# Test database connection
npx prisma db pull

# Test API keys
npm run dev
# Visit http://localhost:3000 and try chatting
```

---

## 🔍 **Environment Variable Details**

### **Required Variables**
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma database connection | `mysql://user:pass@host:3306/db` |
| `MISTRAL_API_KEY` | Mistral AI API key | `your_mistral_key` |
| `GROQ_API_KEY` | Groq AI API key | `your_groq_key` |

### **Optional Variables**
| Variable | Description | Default |
|----------|-------------|---------|
| `VECTOR_DB_STORE_PATH` | Local vector store path | `./data/vector-store` |
| `CHAT_MAX_TOKENS` | Max response tokens | `1000` |
| `CHAT_TEMPERATURE` | AI creativity (0.0-1.0) | `0.7` |
| `LLM_TIMEOUT_MS` | LLM request timeout | `5000` |

### **Deployment Variables**
| Variable | Description | Auto-detected |
|----------|-------------|---------------|
| `VERCEL_URL` | Vercel deployment URL | ✅ |
| `RAILWAY_STATIC_URL` | Railway deployment URL | ✅ |
| `HEROKU_APP_NAME` | Heroku app name | ✅ |
| `PORT` | Application port | `3000` |

---

## 🛠️ **Troubleshooting**

### **Database Connection Issues**
```bash
# Check if MySQL is running
docker ps | grep mysql

# Test connection
npx prisma db pull

# Reset database
docker-compose down -v
docker-compose up -d mysql
```

### **API Key Issues**
```bash
# Test Mistral API
curl -H "Authorization: Bearer YOUR_KEY" https://api.mistral.ai/v1/models

# Test Groq API  
curl -H "Authorization: Bearer YOUR_KEY" https://api.groq.com/openai/v1/models
```

### **Common Errors**
- **"Prisma Client not found"** → Run `npx prisma generate`
- **"Database connection failed"** → Check `DATABASE_URL` format
- **"API key invalid"** → Verify API keys are correct
- **"Module not found"** → Run `npm install`

---

## 📝 **Quick Start Checklist**

- [ ] Create `.env` file in project root
- [ ] Add `DATABASE_URL` with correct MySQL connection
- [ ] Add `MISTRAL_API_KEY` from Mistral console
- [ ] Add `GROQ_API_KEY` from Groq console
- [ ] Start MySQL: `docker-compose up -d mysql`
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Run migrations: `npx prisma migrate dev`
- [ ] Test application: `npm run dev`

**You're ready to go!** 🎉 