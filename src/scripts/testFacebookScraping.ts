import { FacebookScraper } from './scrapeFacebookContent';

async function testFacebookScraping() {
  console.log('🧪 Testing Facebook scraping...');
  
  try {
    const scraper = new FacebookScraper();
    const pageData = await scraper.scrapePage();
    
    console.log('✅ Facebook scraping test successful!');
    console.log(`📊 Results:`);
    console.log(`   - Page Name: ${pageData.pageName}`);
    console.log(`   - Description: ${pageData.description.substring(0, 100)}...`);
    console.log(`   - Posts Found: ${pageData.posts.length}`);
    
    if (pageData.posts.length > 0) {
      console.log(`   - Sample Post: ${pageData.posts[0].content.substring(0, 100)}...`);
    }
    
    // Save the test results
    await scraper.saveToFile(pageData, 'facebook-test-results.json');
    
  } catch (error) {
    console.error('❌ Facebook scraping test failed:', error);
    console.log('💡 This is expected - Facebook blocks most scraping attempts.');
    console.log('🔑 For production use, you\'ll need a Facebook Graph API access token.');
  }
}

// Run the test
testFacebookScraping(); 