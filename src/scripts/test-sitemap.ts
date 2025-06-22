import * as cheerio from 'cheerio';
import axios from 'axios';

// Parse sitemap XML to extract URLs
async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    console.log(`Fetching sitemap: ${sitemapUrl}`);
    const response = await axios.get(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    
    const urls: string[] = [];
    $('url').each((_, element) => {
      const loc = $(element).find('loc').text();
      if (loc) {
        urls.push(loc);
      }
    });
    
    console.log(`Found ${urls.length} URLs in sitemap`);
    return urls;
  } catch (error) {
    console.error(`Error parsing sitemap ${sitemapUrl}:`, error);
    return [];
  }
}

// Try to access the main website and find links
async function scrapeMainSite(): Promise<string[]> {
  try {
    console.log('Trying to access main website...');
    const response = await axios.get('https://www.conceiveabilities.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const urls: string[] = [];
    
    // Find all links
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && href.startsWith('/') && !href.includes('#') && !href.includes('javascript:')) {
        const fullUrl = `https://www.conceiveabilities.com${href}`;
        if (!urls.includes(fullUrl)) {
          urls.push(fullUrl);
        }
      }
    });
    
    console.log(`Found ${urls.length} internal links on main page`);
    return urls;
  } catch (error) {
    console.error('Error accessing main website:', error);
    return [];
  }
}

async function testSitemaps() {
  console.log('Testing sitemap parsing...\n');
  
  const sitemapUrls = [
    'https://www.conceiveabilities.com/blog-sitemap-xml/',
    'https://www.conceiveabilities.com/marketing-sitemap.xml'
  ];
  
  for (const sitemapUrl of sitemapUrls) {
    console.log(`\n--- Testing ${sitemapUrl} ---`);
    const urls = await parseSitemap(sitemapUrl);
    
    console.log(`Total URLs: ${urls.length}`);
    if (urls.length > 0) {
      console.log('First 5 URLs:');
      urls.slice(0, 5).forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
      });
      
      if (urls.length > 5) {
        console.log(`... and ${urls.length - 5} more URLs`);
      }
    }
  }
  
  // Try alternative approach
  console.log('\n--- Trying alternative approach ---');
  const mainSiteUrls = await scrapeMainSite();
  
  if (mainSiteUrls.length > 0) {
    console.log(`Found ${mainSiteUrls.length} URLs from main site`);
    console.log('First 10 URLs:');
    mainSiteUrls.slice(0, 10).forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });
  }
}

// Run the test
testSitemaps().catch(console.error); 