import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

interface FacebookPost {
  id: string;
  content: string;
  timestamp: string;
  url: string;
  reactions?: number;
  comments?: number;
  shares?: number;
  media?: string[];
}

interface FacebookPageData {
  pageName: string;
  pageUrl: string;
  description: string;
  posts: FacebookPost[];
  scrapedAt: string;
}

class FacebookScraper {
  private baseUrl = 'https://www.facebook.com/ConceiveAbilities/';
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  async scrapePage(): Promise<FacebookPageData> {
    try {
      console.log('🔄 Scraping Facebook page:', this.baseUrl);
      
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      
      // Extract page information
      const pageName = $('meta[property="og:site_name"]').attr('content') || 'ConceiveAbilities';
      const description = $('meta[property="og:description"]').attr('content') || '';
      
      // Extract posts (this is a simplified version - Facebook's structure is complex)
      const posts: FacebookPost[] = [];
      
      // Look for post containers
      $('[data-testid="post_message"]').each((index, element) => {
        const content = $(element).text().trim();
        if (content) {
          posts.push({
            id: `post_${index}`,
            content,
            timestamp: new Date().toISOString(), // Facebook timestamps are hard to extract
            url: this.baseUrl,
          });
        }
      });

      const pageData: FacebookPageData = {
        pageName,
        pageUrl: this.baseUrl,
        description,
        posts,
        scrapedAt: new Date().toISOString(),
      };

      return pageData;
    } catch (error) {
      console.error('❌ Error scraping Facebook:', error);
      throw error;
    }
  }

  async saveToFile(data: FacebookPageData, filename?: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `facebook-content-${timestamp}.json`;
    const finalFilename = filename || defaultFilename;
    
    const outputPath = path.join(process.cwd(), 'data', 'scraped-content', finalFilename);
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Facebook content saved to: ${outputPath}`);
  }
}

// Facebook Graph API integration (preferred method)
class FacebookGraphAPI {
  private accessToken: string;
  private pageId: string;

  constructor(accessToken: string, pageId: string = 'ConceiveAbilities') {
    this.accessToken = accessToken;
    this.pageId = pageId;
  }

  async getPagePosts(limit: number = 50): Promise<FacebookPost[]> {
    try {
      console.log('🔄 Fetching Facebook posts via Graph API...');
      
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${this.pageId}/posts`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,message,created_time,permalink_url,reactions.summary(true),comments.summary(true),shares',
            limit,
          },
        }
      );

      const posts: FacebookPost[] = response.data.data.map((post: any) => ({
        id: post.id,
        content: post.message || '',
        timestamp: post.created_time,
        url: post.permalink_url,
        reactions: post.reactions?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
      }));

      console.log(`✅ Fetched ${posts.length} Facebook posts`);
      return posts;
    } catch (error) {
      console.error('❌ Error fetching Facebook posts via API:', error);
      throw error;
    }
  }

  async getPageInfo(): Promise<any> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${this.pageId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'name,description,fan_count,verification_status',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching Facebook page info:', error);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const scraper = new FacebookScraper();
  
  try {
    // Try Graph API first if access token is available
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID || 'ConceiveAbilities';
    
    if (accessToken) {
      console.log('🔑 Using Facebook Graph API...');
      const api = new FacebookGraphAPI(accessToken, pageId);
      
      const [pageInfo, posts] = await Promise.all([
        api.getPageInfo(),
        api.getPagePosts(100),
      ]);
      
      const pageData: FacebookPageData = {
        pageName: pageInfo.name,
        pageUrl: `https://www.facebook.com/${pageId}/`,
        description: pageInfo.description || '',
        posts,
        scrapedAt: new Date().toISOString(),
      };
      
      await scraper.saveToFile(pageData);
    } else {
      console.log('⚠️ No Facebook access token found, falling back to web scraping...');
      const pageData = await scraper.scrapePage();
      await scraper.saveToFile(pageData);
    }
  } catch (error) {
    console.error('❌ Failed to scrape Facebook content:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { FacebookScraper, FacebookGraphAPI };
export type { FacebookPost, FacebookPageData }; 