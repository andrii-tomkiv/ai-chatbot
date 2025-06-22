import * as cheerio from 'cheerio';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface ContentChunk {
  id: string;
  content: string;
  url: string;
  metadata: {
    title: string;
    type: string;
    chunkIndex?: number;
  };
}

// Parse sitemap XML to extract URLs
async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  const headerSets = [
    // Chrome Desktop
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/xml, text/xml, */*;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
    // Chrome Mobile
    {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/xml, text/xml, */*;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/',
      'Upgrade-Insecure-Requests': '1',
    },
    // Googlebot
    {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'application/xml, text/xml, */*;q=0.9',
      'Referer': 'https://www.google.com/',
    },
    // Bingbot
    {
      'User-Agent': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Accept': 'application/xml, text/xml, */*;q=0.9',
      'Referer': 'https://www.bing.com/',
    },
    // Edge Desktop
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
      'Accept': 'application/xml, text/xml, */*;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.bing.com/',
      'Upgrade-Insecure-Requests': '1',
    },
    // Safari Desktop
    {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Accept': 'application/xml, text/xml, */*;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/',
      'Upgrade-Insecure-Requests': '1',
    },
  ];

  for (let i = 0; i < headerSets.length; i++) {
    const headers = headerSets[i];
    try {
      console.log(`\n🔍 [Headers ${i+1}/${headerSets.length}] Fetching sitemap: ${sitemapUrl}`);
      const response = await axios.get(sitemapUrl, {
        headers,
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: status => status < 500 // treat 4xx as valid for error handling
      });
      if (response.status === 200) {
        const $ = cheerio.load(response.data, { xmlMode: true });
        const urls: string[] = [];
        $('url').each((_, element) => {
          const loc = $(element).find('loc').text();
          if (loc) urls.push(loc);
        });
        console.log(`✅ Found ${urls.length} URLs in sitemap: ${sitemapUrl}`);
        return urls;
      } else {
        console.log(`❌ Status ${response.status} for ${sitemapUrl} with headers set ${i+1}`);
      }
    } catch (error: any) {
      console.error(`❌ Error with headers set ${i+1} for ${sitemapUrl}:`, error.message);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.error(`❌ All header sets failed for ${sitemapUrl}`);
  return [];
}

// Scrape content from a single page with retry mechanism
async function scrapePage(url: string): Promise<ContentChunk[]> {
  const strategies = [
    {
      name: 'Strategy 1: Modern Browser Headers',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
        'DNT': '1'
      }
    },
    {
      name: 'Strategy 2: Mobile Browser Headers',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    },
    {
      name: 'Strategy 3: Simple Headers',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    }
  ];

  for (let attempt = 0; attempt < strategies.length; attempt++) {
    const strategy = strategies[attempt];
    
    try {
      console.log(`📄 Scraping: ${url} (${strategy.name})`);
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: strategy.headers,
        maxRedirects: 5
      });
      
      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, footer, .header, .sidebar, .ads').remove();
      
      // Extract title
      const title = $('title').text().trim() || $('h1').first().text().trim();
      console.log(`📝 Title: ${title}`);
      
      // Extract main content - prioritize article content, main content areas
      let content = '';
      
      // Try to find main content areas
      const contentSelectors = [
        'article',
        '.content',
        '.main-content',
        '.post-content',
        '.entry-content',
        'main',
        '.blog-post',
        '.page-content'
      ];
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text().trim();
          console.log(`🎯 Found content using selector: ${selector}`);
          break;
        }
      }
      
      // If no main content found, get body text
      if (!content) {
        content = $('body').text().trim();
        console.log(`⚠️  No specific content area found, using body text`);
      }
      
      // Clean up the content
      content = content
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
        .trim();
      
      console.log(`📊 Raw content length: ${content.length} characters`);
      
      // Split content into chunks if it's too long
      const chunks: ContentChunk[] = [];
      const maxChunkLength = 1000;
      
      if (content.length <= maxChunkLength) {
        chunks.push({
          id: `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: content,
          url: url,
          metadata: { title, type: 'page' }
        });
        console.log(`📦 Created 1 chunk (${content.length} chars)`);
      } else {
        // Split into paragraphs and create chunks
        const paragraphs = content.split('\n').filter(p => p.trim().length > 50);
        console.log(`📄 Found ${paragraphs.length} paragraphs to process`);
        
        let currentChunk = '';
        let chunkIndex = 0;
        
        for (const paragraph of paragraphs) {
          if ((currentChunk + paragraph).length > maxChunkLength && currentChunk.length > 0) {
            chunks.push({
              id: `chunk-${Date.now()}-${chunkIndex}-${Math.random().toString(36).substr(2, 9)}`,
              content: currentChunk.trim(),
              url: url,
              metadata: { title, type: 'page', chunkIndex }
            });
            console.log(`📦 Created chunk ${chunkIndex + 1} (${currentChunk.trim().length} chars)`);
            currentChunk = paragraph;
            chunkIndex++;
          } else {
            currentChunk += (currentChunk ? '\n' : '') + paragraph;
          }
        }
        
        // Add the last chunk
        if (currentChunk.trim()) {
          chunks.push({
            id: `chunk-${Date.now()}-${chunkIndex}-${Math.random().toString(36).substr(2, 9)}`,
            content: currentChunk.trim(),
            url: url,
            metadata: { title, type: 'page', chunkIndex }
          });
          console.log(`📦 Created final chunk ${chunkIndex + 1} (${currentChunk.trim().length} chars)`);
        }
      }
      
      console.log(`✅ Successfully extracted ${chunks.length} chunks from ${url}`);
      return chunks;
      
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log(`🚫 403 Forbidden - Page blocked (Attempt ${attempt + 1}/${strategies.length})`);
        if (attempt < strategies.length - 1) {
          console.log(`🔄 Retrying with different strategy...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        } else {
          console.log(`💔 All strategies failed for: ${url}`);
        }
      } else {
        console.log(`❌ Error scraping ${url} (Attempt ${attempt + 1}/${strategies.length}):`, error.message);
        if (attempt < strategies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }
  }
  
  console.log(`💔 Failed to scrape: ${url}`);
  return [];
}

// Save chunks to JSON file
function saveChunksToJson(chunks: ContentChunk[], filename: string) {
  const dataDir = './data/scraped-content';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filepath = path.join(dataDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(chunks, null, 2));
  console.log(`💾 Saved ${chunks.length} chunks to ${filepath}`);
}

// Main scraping function
export async function scrapeSiteContent() {
  console.log('🚀 Starting content scraping...');
  
  // Use only the provided sitemap URLs
  const sitemapUrls = [
    'https://www.conceiveabilities.com/blog-sitemap-xml',
    'https://www.conceiveabilities.com/marketing-sitemap.xml'
  ];
  
  let allUrls: string[] = [];
  
  // Parse all sitemaps
  for (const sitemapUrl of sitemapUrls) {
    const urls = await parseSitemap(sitemapUrl);
    allUrls = [...allUrls, ...urls];
  }
  
  // Remove duplicates
  allUrls = [...new Set(allUrls)];
  console.log(`\n📋 Total unique URLs to scrape: ${allUrls.length}`);
  
  // Scrape each URL
  const allChunks: ContentChunk[] = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < allUrls.length; i++) {
    const url = allUrls[i];
    console.log(`\n[${i + 1}/${allUrls.length}] Processing: ${url}`);
    
    const chunks = await scrapePage(url);
    if (chunks.length > 0) {
      allChunks.push(...chunks);
      successCount++;
      console.log(`✅ Successfully scraped ${chunks.length} chunks`);
    } else {
      failCount++;
      console.log(`❌ Failed to scrape`);
    }
    
    // Save progress every 10 URLs
    if ((i + 1) % 10 === 0) {
      const progressFilename = `scraped-content-progress-${i + 1}.json`;
      saveChunksToJson(allChunks, progressFilename);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Save final results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalFilename = `scraped-content-${timestamp}.json`;
  saveChunksToJson(allChunks, finalFilename);
  
  console.log(`\n🎉 Scraping completed!`);
  console.log(`✅ Successful URLs: ${successCount}`);
  console.log(`❌ Failed URLs: ${failCount}`);
  console.log(`📦 Total chunks: ${allChunks.length}`);
  console.log(`💾 Final file: data/scraped-content/${finalFilename}`);
  
  // Show some sample chunks with URLs
  console.log(`\n📋 Sample chunks with URLs:`);
  allChunks.slice(0, 3).forEach((chunk, index) => {
    console.log(`${index + 1}. URL: ${chunk.url}`);
    console.log(`   Title: ${chunk.metadata.title}`);
    console.log(`   Content preview: ${chunk.content.substring(0, 100)}...`);
    console.log('');
  });
}

// Run the script
if (require.main === module) {
  scrapeSiteContent().catch(console.error);
} 