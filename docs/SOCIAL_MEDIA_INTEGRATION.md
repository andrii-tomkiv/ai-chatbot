# 📱 Social Media Integration Guide

This guide explains how to integrate Facebook content from the [ConceiveAbilities Facebook page](https://www.facebook.com/ConceiveAbilities/) into your AI chatbot.

## 🎯 **What We've Built**

### **1. Facebook Content Scraper**
- **File**: `src/scripts/scrapeFacebookContent.ts`
- **Purpose**: Fetches posts and content from Facebook
- **Methods**: 
  - Graph API (preferred, requires access token)
  - Web scraping (fallback, limited success)

### **2. Content Integration System**
- **File**: `src/scripts/integrateSocialContent.ts`
- **Purpose**: Combines website + Facebook content
- **Features**: 
  - Merges multiple content sources
  - Generates unified embeddings
  - Maintains source attribution

### **3. Test Script**
- **File**: `src/scripts/testFacebookScraping.ts`
- **Purpose**: Test Facebook scraping without API tokens

## 🚀 **How to Use**

### **Step 1: Test Facebook Scraping**
```bash
# Test basic scraping (will likely fail due to Facebook's anti-scraping)
npm run test-facebook

# Or run directly
npx tsx src/scripts/testFacebookScraping.ts
```

### **Step 2: Set Up Facebook Graph API (Recommended)**

#### **Get Facebook Access Token:**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Get Page Access Token for ConceiveAbilities page
5. Add to your `.env` file:

```env
FACEBOOK_ACCESS_TOKEN=your_access_token_here
FACEBOOK_PAGE_ID=ConceiveAbilities
```

#### **Run Facebook Scraping with API:**
```bash
npm run scrape-facebook
```

### **Step 3: Integrate All Content**
```bash
npm run integrate-social
```

This will:
- Load existing website content
- Load Facebook content
- Combine them into unified dataset
- Generate new embeddings
- Update your vector store

## 📊 **Content Sources**

### **Current Sources:**
1. **Website Pages** - All pages from ConceiveAbilities.com
2. **Blog Posts** - Blog content (if available)
3. **Facebook Posts** - Social media updates and engagement

### **Future Sources:**
- Instagram posts
- Twitter/X posts
- LinkedIn updates
- YouTube videos
- Email newsletters

## 🔧 **Technical Details**

### **Facebook Graph API Endpoints Used:**
```javascript
// Get page posts
GET https://graph.facebook.com/v18.0/ConceiveAbilities/posts
  ?access_token={token}
  &fields=id,message,created_time,permalink_url,reactions.summary(true),comments.summary(true),shares
  &limit=100

// Get page info
GET https://graph.facebook.com/v18.0/ConceiveAbilities
  ?access_token={token}
  &fields=name,description,fan_count,verification_status
```

### **Content Structure:**
```typescript
interface ContentItem {
  id: string;           // Unique identifier
  title: string;        // Display title
  content: string;      // Main content
  url: string;          // Source URL
  source: 'website' | 'facebook' | 'blog';
  timestamp: string;    // When content was created
  metadata?: {          // Additional info
    type: string;
    reactions?: number;
    comments?: number;
    shares?: number;
    engagement?: number;
  }
}
```

## 🎯 **Benefits for Your Chatbot**

### **Enhanced Knowledge Base:**
- **Real-time updates** from social media
- **Community insights** from comments and reactions
- **Engagement metrics** to prioritize popular content
- **Fresh content** beyond static website pages

### **Better User Experience:**
- **Current information** about events and updates
- **Social proof** from community engagement
- **Personal touch** from social media posts
- **Comprehensive answers** combining all sources

## 🔄 **Automation Options**

### **Manual Integration:**
```bash
# Run when you want to update content
npm run scrape-facebook
npm run integrate-social
```

### **Scheduled Integration:**
```bash
# Add to cron job (daily/weekly)
0 2 * * * cd /path/to/project && npm run integrate-social
```

### **CI/CD Integration:**
```yaml
# GitHub Actions example
- name: Update Social Content
  run: |
    npm run scrape-facebook
    npm run integrate-social
  env:
    FACEBOOK_ACCESS_TOKEN: ${{ secrets.FACEBOOK_ACCESS_TOKEN }}
```

## 🚨 **Important Notes**

### **Facebook Limitations:**
- **API Rate Limits**: 200 calls per hour per user
- **Content Access**: Only public posts are accessible
- **Token Expiration**: Access tokens expire and need renewal
- **Permissions**: Requires page admin access for full data

### **Legal Considerations:**
- **Terms of Service**: Respect Facebook's ToS
- **Data Privacy**: Only collect public information
- **Attribution**: Always credit original sources
- **Consent**: Ensure you have permission to use content

## 🔮 **Next Steps**

### **Immediate:**
1. Test the scraping scripts
2. Set up Facebook Graph API access
3. Run full integration
4. Test chatbot with new content

### **Future Enhancements:**
1. **Instagram Integration** - Photos and stories
2. **YouTube Integration** - Video content
3. **Email Integration** - Newsletter content
4. **Real-time Updates** - Webhook-based updates
5. **Content Filtering** - Quality and relevance scoring

## 📞 **Support**

If you encounter issues:
1. Check Facebook API documentation
2. Verify access token permissions
3. Review rate limiting
4. Test with smaller data sets first

Your chatbot will now have access to the most current and engaging content from ConceiveAbilities' social media presence! 🚀 