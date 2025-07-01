import fs from 'fs';
import path from 'path';
import { FacebookScraper, FacebookGraphAPI } from './scrapeFacebookContent';
import { generateEmbeddings } from './generateEmbeddings';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  url: string;
  source: 'website' | 'facebook' | 'blog';
  timestamp: string;
  metadata?: any;
}

interface IntegratedContent {
  items: ContentItem[];
  totalCount: number;
  sources: {
    website: number;
    facebook: number;
    blog: number;
  };
  generatedAt: string;
}

class SocialContentIntegrator {
  private dataDir = path.join(process.cwd(), 'data');
  private scrapedContentDir = path.join(this.dataDir, 'scraped-content');
  private vectorStoreDir = path.join(this.dataDir, 'vector-store');

  async loadExistingContent(): Promise<ContentItem[]> {
    const items: ContentItem[] = [];
    
    // Load website content
    const websiteFiles = fs.readdirSync(this.scrapedContentDir)
      .filter(file => file.includes('scraped-content') && file.endsWith('.json'));
    
    for (const file of websiteFiles) {
      const filePath = path.join(this.scrapedContentDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (content.pages) {
        content.pages.forEach((page: any) => {
          items.push({
            id: `website_${page.url}`,
            title: page.title || 'Website Page',
            content: page.content || '',
            url: page.url,
            source: 'website',
            timestamp: page.timestamp || new Date().toISOString(),
            metadata: {
              type: 'page',
              wordCount: page.content?.split(' ').length || 0,
            }
          });
        });
      }
    }
    
    return items;
  }

  async loadFacebookContent(): Promise<ContentItem[]> {
    const items: ContentItem[] = [];
    
    // Load Facebook content
    const facebookFiles = fs.readdirSync(this.scrapedContentDir)
      .filter(file => file.includes('facebook-content') && file.endsWith('.json'));
    
    for (const file of facebookFiles) {
      const filePath = path.join(this.scrapedContentDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (content.posts) {
        content.posts.forEach((post: any) => {
          if (post.content && post.content.length > 50) { // Only include substantial posts
            items.push({
              id: `facebook_${post.id}`,
              title: `Facebook Post - ${new Date(post.timestamp).toLocaleDateString()}`,
              content: post.content,
              url: post.url,
              source: 'facebook',
              timestamp: post.timestamp,
              metadata: {
                type: 'social_post',
                reactions: post.reactions || 0,
                comments: post.comments || 0,
                shares: post.shares || 0,
                engagement: (post.reactions || 0) + (post.comments || 0) + (post.shares || 0),
              }
            });
          }
        });
      }
    }
    
    return items;
  }

  async integrateContent(): Promise<IntegratedContent> {
    console.log('🔄 Integrating content from multiple sources...');
    
    const [websiteContent, facebookContent] = await Promise.all([
      this.loadExistingContent(),
      this.loadFacebookContent(),
    ]);
    
    const allItems = [...websiteContent, ...facebookContent];
    
    // Sort by timestamp (newest first)
    allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const integratedContent: IntegratedContent = {
      items: allItems,
      totalCount: allItems.length,
      sources: {
        website: websiteContent.length,
        facebook: facebookContent.length,
        blog: 0, // TODO: Add blog content integration
      },
      generatedAt: new Date().toISOString(),
    };
    
    return integratedContent;
  }

  async saveIntegratedContent(content: IntegratedContent): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `integrated-content-${timestamp}.json`;
    const filePath = path.join(this.scrapedContentDir, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`✅ Integrated content saved to: ${filePath}`);
    
    // Also save a latest version
    const latestPath = path.join(this.scrapedContentDir, 'integrated-content-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(content, null, 2));
    console.log(`✅ Latest integrated content saved to: ${latestPath}`);
  }

  async generateEmbeddingsForIntegratedContent(content: IntegratedContent): Promise<void> {
    console.log('🔄 Generating embeddings for integrated content...');
    
    // Prepare documents for embedding
    const documents = content.items.map(item => ({
      id: item.id,
      content: `${item.title}\n\n${item.content}`,
      metadata: {
        source: item.source,
        url: item.url,
        timestamp: item.timestamp,
        ...item.metadata,
      }
    }));
    
    // Generate embeddings
    await generateEmbeddings();
    
    console.log(`✅ Generated embeddings for ${documents.length} content items`);
  }

  async runFullIntegration(): Promise<void> {
    try {
      console.log('🚀 Starting full content integration...');
      
      // 1. Integrate content from all sources
      const integratedContent = await this.integrateContent();
      
      // 2. Save integrated content
      await this.saveIntegratedContent(integratedContent);
      
      // 3. Generate embeddings
      await this.generateEmbeddingsForIntegratedContent(integratedContent);
      
      console.log('🎉 Full integration completed!');
      console.log(`📊 Summary:`);
      console.log(`   - Total content items: ${integratedContent.totalCount}`);
      console.log(`   - Website pages: ${integratedContent.sources.website}`);
      console.log(`   - Facebook posts: ${integratedContent.sources.facebook}`);
      console.log(`   - Blog posts: ${integratedContent.sources.blog}`);
      
    } catch (error) {
      console.error('❌ Error during integration:', error);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const integrator = new SocialContentIntegrator();
  await integrator.runFullIntegration();
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SocialContentIntegrator };
export type { IntegratedContent, ContentItem }; 