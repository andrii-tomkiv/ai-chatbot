import * as cheerio from 'cheerio';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface FAQItem {
  question: string;
  answer: string;
  source: string;
  url: string;
  category?: string;
}

// Staging site sitemaps to scrape
const STAGING_SITEMAPS = [
  'https://www.staging.conceiveabilities.com/blog-sitemap-xml',
  'https://www.staging.conceiveabilities.com/marketing-sitemap.xml'
];

// Headers to avoid being blocked
const HEADERS = {
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
};

// Parse sitemap XML to extract URLs
async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    console.log(`🔍 Fetching sitemap: ${sitemapUrl}`);
    
    const response = await axios.get(sitemapUrl, {
      headers: HEADERS,
      timeout: 15000,
      maxRedirects: 5
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
      console.log(`❌ Status ${response.status} for ${sitemapUrl}`);
      return [];
    }
  } catch (error: any) {
    console.error(`❌ Error fetching sitemap ${sitemapUrl}:`, error.message);
    return [];
  }
}

async function scrapeFAQPage(url: string): Promise<FAQItem[]> {
  try {
    console.log(`📄 Scraping page: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: HEADERS,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim();
    console.log(`📝 Page title: ${title}`);
    
    const faqItems: FAQItem[] = [];
    
    // Look for details/summary elements (accordion structure)
    $('details').each((index, element) => {
      const $details = $(element);
      const $summary = $details.find('summary');
      const $content = $details.find('div, .accordion-content, .content');
      
      if ($summary.length > 0 && $content.length > 0) {
        const question = $summary.text().trim();
        const answer = $content.text().trim();
        
        if (question && answer && question.length > 10 && answer.length > 20) {
          const category = categorizeFAQ(question, answer);
          
          faqItems.push({
            question,
            answer,
            source: title,
            url,
            category
          });
          
          console.log(`✅ Found FAQ: ${question.substring(0, 50)}...`);
        }
      }
    });
    
    // If no details/summary found, look for other FAQ patterns
    if (faqItems.length === 0) {
      console.log(`🔍 No details/summary found, looking for other FAQ patterns...`);
      
      // Look for FAQ sections with questions and answers
      $('h2, h3, h4').each((index, element) => {
        const $heading = $(element);
        const headingText = $heading.text().trim();
        
        // Check if this looks like a question
        if (isLikelyQuestion(headingText)) {
          // Look for answer in next sibling elements
          let answer = '';
          let $next = $heading.next();
          
          // Collect text from next few elements until we hit another heading
          for (let i = 0; i < 5 && $next.length > 0; i++) {
            if ($next.is('h2, h3, h4, h5, h6')) {
              break; // Stop at next heading
            }
            
            const text = $next.text().trim();
            if (text.length > 20) {
              answer += (answer ? ' ' : '') + text;
            }
            
            $next = $next.next();
          }
          
          if (answer.length > 50) {
            const category = categorizeFAQ(headingText, answer);
            
            faqItems.push({
              question: headingText,
              answer,
              source: title,
              url,
              category
            });
            
            console.log(`✅ Found FAQ from heading: ${headingText.substring(0, 50)}...`);
          }
        }
      });
    }
    
    console.log(`📊 Found ${faqItems.length} FAQ items on ${url}`);
    return faqItems;
    
  } catch (error: any) {
    console.error(`❌ Error scraping ${url}:`, error.message);
    return [];
  }
}

function isLikelyQuestion(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for question patterns
  const questionPatterns = [
    /^(how\s+do\s+I\s+[^?]*\?)/i,
    /^(what\s+is\s+[^?]*\?)/i,
    /^(why\s+[^?]*\?)/i,
    /^(when\s+[^?]*\?)/i,
    /^(where\s+[^?]*\?)/i,
    /^(can\s+I\s+[^?]*\?)/i,
    /^(does\s+[^?]*\?)/i,
    /^(is\s+[^?]*\?)/i,
    /^(are\s+[^?]*\?)/i,
    /^(will\s+[^?]*\?)/i,
    /^(should\s+I\s+[^?]*\?)/i,
    /^(what\s+are\s+[^?]*\?)/i,
    /^(how\s+can\s+I\s+[^?]*\?)/i,
    /^(what\s+does\s+[^?]*\?)/i,
    /^(how\s+does\s+[^?]*\?)/i,
    /^(what\s+happens\s+[^?]*\?)/i,
    /^(how\s+long\s+[^?]*\?)/i,
    /^(how\s+much\s+[^?]*\?)/i,
    /^(what\s+if\s+[^?]*\?)/i,
    /^(do\s+I\s+[^?]*\?)/i,
  ];
  
  // Check for question keywords
  const questionKeywords = [
    'frequently asked',
    'common questions',
    'faq',
    'questions and answers',
    'q&a',
    'how to',
    'what is',
    'why',
    'when',
    'where',
    'can i',
    'should i',
    'do i need',
    'cost',
    'price',
    'coverage',
    'insurance',
    'process',
    'requirements',
    'eligibility',
    'timeline',
    'duration',
    'payment',
    'compensation',
  ];
  
  // Check for question patterns
  const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(text));
  
  // Check for question keywords
  const hasQuestionKeywords = questionKeywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  // Check for question mark
  const hasQuestionMark = text.includes('?');
  
  return (hasQuestionPattern || hasQuestionKeywords) && hasQuestionMark;
}

function categorizeFAQ(question: string, answer: string): string {
  const lowerQuestion = question.toLowerCase();
  const lowerAnswer = answer.toLowerCase();
  
  if (lowerQuestion.includes('cost') || lowerQuestion.includes('price') || lowerQuestion.includes('payment') || lowerAnswer.includes('$')) {
    return 'Pricing & Costs';
  }
  
  if (lowerQuestion.includes('insurance') || lowerQuestion.includes('coverage') || lowerAnswer.includes('insurance')) {
    return 'Insurance & Coverage';
  }
  
  if (lowerQuestion.includes('process') || lowerQuestion.includes('step') || lowerQuestion.includes('timeline')) {
    return 'Process & Timeline';
  }
  
  if (lowerQuestion.includes('requirement') || lowerQuestion.includes('eligibility') || lowerQuestion.includes('qualify')) {
    return 'Requirements & Eligibility';
  }
  
  if (lowerQuestion.includes('compensation') || lowerQuestion.includes('pay') || lowerAnswer.includes('compensation')) {
    return 'Compensation & Benefits';
  }
  
  if (lowerQuestion.includes('medical') || lowerQuestion.includes('health') || lowerAnswer.includes('medical')) {
    return 'Medical & Health';
  }
  
  if (lowerQuestion.includes('legal') || lowerQuestion.includes('contract') || lowerAnswer.includes('legal')) {
    return 'Legal & Contracts';
  }
  
  return 'General';
}

export async function scrapeStagingFAQ() {
  console.log('🚀 Starting FAQ scraping from staging site sitemaps...');
  
  let allUrls: string[] = [];
  
  // Parse all sitemaps
  for (const sitemapUrl of STAGING_SITEMAPS) {
    const urls = await parseSitemap(sitemapUrl);
    allUrls = [...allUrls, ...urls];
  }
  
  // Remove duplicates
  allUrls = [...new Set(allUrls)];
  console.log(`\n📋 Total unique URLs to scrape: ${allUrls.length}`);
  
  const allFAQItems: FAQItem[] = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < allUrls.length; i++) {
    const url = allUrls[i];
    console.log(`\n[${i + 1}/${allUrls.length}] Processing: ${url}`);
    
    const faqItems = await scrapeFAQPage(url);
    if (faqItems.length > 0) {
      allFAQItems.push(...faqItems);
      successCount++;
      console.log(`✅ Successfully scraped ${faqItems.length} FAQ items`);
    } else {
      failCount++;
      console.log(`❌ No FAQ items found`);
    }
    
    // Save progress every 10 URLs
    if ((i + 1) % 10 === 0) {
      const progressPath = `./data/staging-faq-progress-${i + 1}.json`;
      fs.writeFileSync(progressPath, JSON.stringify(allFAQItems, null, 2));
      console.log(`💾 Progress saved: ${progressPath}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Remove duplicates based on question text
  const uniqueFAQItems = allFAQItems.filter((item, index, self) => 
    index === self.findIndex(t => t.question.toLowerCase() === item.question.toLowerCase())
  );
  
  console.log(`\n🎉 FAQ scraping completed!`);
  console.log(`✅ Successful pages: ${successCount}`);
  console.log(`❌ Failed pages: ${failCount}`);
  console.log(`📦 Total FAQ items: ${uniqueFAQItems.length}`);
  
  // Save results
  const dataDir = './data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const outputPath = './data/staging-faq.json';
  fs.writeFileSync(outputPath, JSON.stringify(uniqueFAQItems, null, 2));
  console.log(`💾 Saved FAQ items to: ${outputPath}`);
  
  // Generate summary
  const summary = {
    scrapedAt: new Date().toISOString(),
    totalPages: allUrls.length,
    successfulPages: successCount,
    failedPages: failCount,
    totalFAQItems: uniqueFAQItems.length,
    categories: getCategoryBreakdown(uniqueFAQItems),
    sampleItems: uniqueFAQItems.slice(0, 5).map(item => ({
      question: item.question.substring(0, 100) + '...',
      category: item.category,
      source: item.source
    }))
  };
  
  const summaryPath = './data/staging-faq-summary.json';
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`📊 Summary saved to: ${summaryPath}`);
  
  // Show category breakdown
  console.log('\n📈 FAQ Categories:');
  Object.entries(summary.categories).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}`);
  });
  
  return uniqueFAQItems;
}

function getCategoryBreakdown(faqItems: FAQItem[]): Record<string, number> {
  const categories: Record<string, number> = {};
  
  for (const item of faqItems) {
    const category = item.category || 'General';
    categories[category] = (categories[category] || 0) + 1;
  }
  
  return categories;
}

// Run the script
if (require.main === module) {
  scrapeStagingFAQ()
    .then(() => {
      console.log('✅ FAQ scraping completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ FAQ scraping failed:', error);
      process.exit(1);
    });
} 