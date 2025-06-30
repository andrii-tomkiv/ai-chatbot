#!/usr/bin/env tsx

import { ChatbotEvaluator } from './evaluate-chatbot';

async function main() {
  // Get base URL from command line argument or use default
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  
  console.log('🤖 Starting Mistral vs Groq Comparison Test Runner');
  console.log(`📍 Target URL: ${baseUrl}`);
  console.log('⏳ Initializing evaluator...\n');
  
  try {
    const evaluator = new ChatbotEvaluator(baseUrl);
    
    console.log('🚀 Running comparison tests...\n');
    console.log('📝 Each test case will be evaluated with both Mistral and Groq\n');
    const startTime = Date.now();
    
    const report = await evaluator.runEvaluation();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n✅ Comparison completed in ${duration.toFixed(2)} seconds`);
    
    // Save report with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mistral-vs-groq-comparison-${timestamp}.json`;
    evaluator.saveReport(report, filename);
    
    // Print summary
    evaluator.printSummary(report);
    
    console.log('\n📊 Comparison Results:');
    console.log(`   📁 Report saved as: ${filename}`);
    console.log(`   🏆 Mistral Win Rate: ${((report.summary.mistralWins / report.summary.totalTests) * 100).toFixed(1)}%`);
    console.log(`   🏆 Groq Win Rate: ${((report.summary.groqWins / report.summary.totalTests) * 100).toFixed(1)}%`);
    console.log(`   🤝 Tie Rate: ${((report.summary.ties / report.summary.totalTests) * 100).toFixed(1)}%`);
    
    // Determine overall winner
    const mistralAvgScore = report.summary.averageScores.mistral.helpfulness;
    const groqAvgScore = report.summary.averageScores.groq.helpfulness;
    
    console.log(`\n📈 Average Helpfulness Scores:`);
    console.log(`   Mistral: ${mistralAvgScore.toFixed(2)}/5`);
    console.log(`   Groq: ${groqAvgScore.toFixed(2)}/5`);
    
    if (mistralAvgScore > groqAvgScore) {
      console.log('\n🎉 Mistral wins overall!');
      console.log(`   Margin: +${(mistralAvgScore - groqAvgScore).toFixed(2)} points`);
    } else if (groqAvgScore > mistralAvgScore) {
      console.log('\n🎉 Groq wins overall!');
      console.log(`   Margin: +${(groqAvgScore - mistralAvgScore).toFixed(2)} points`);
    } else {
      console.log('\n🤝 It\'s a tie overall!');
    }
    
    // Exit with appropriate code
    const mistralWinRate = report.summary.mistralWins / report.summary.totalTests;
    const groqWinRate = report.summary.groqWins / report.summary.totalTests;
    
    if (mistralWinRate > 0.6) {
      console.log('\n🎯 Recommendation: Consider using Mistral as primary provider');
      process.exit(0);
    } else if (groqWinRate > 0.6) {
      console.log('\n🎯 Recommendation: Consider using Groq as primary provider');
      process.exit(0);
    } else {
      console.log('\n🎯 Recommendation: Both providers perform similarly. Consider using the one with better cost/performance for your use case.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 Comparison failed:', error);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('   1. Make sure the chatbot server is running');
    console.error('   2. Check if the base URL is correct');
    console.error('   3. Verify that both Mistral and Groq API keys are configured');
    console.error('   4. Check server logs for any errors');
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { main as runEvaluation }; 