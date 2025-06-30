import * as fs from 'fs';
import * as path from 'path';

interface ScrapedChunk {
  id: string;
  content: string;
  url: string;
  metadata: {
    title: string;
    type: string;
    chunkIndex?: number;
  };
}

interface FAQItem {
  question: string;
  answer: string;
  source: string;
  url: string;
  confidence: number;
  category?: string;
}

// HTML patterns for details/summary tags
const DETAILS_SUMMARY_PATTERN = /<details[^>]*>[\s\S]*?<summary[^>]*>(.*?)<\/summary>[\s\S]*?<div[^>]*>(.*?)<\/div>[\s\S]*?<\/details>/gi;

// Question patterns to identify FAQ content (fallback for non-HTML content)
const QUESTION_PATTERNS = [
  /^(How\s+do\s+I\s+[^?]+\?)/i,
  /^(What\s+is\s+[^?]+\?)/i,
  /^(Why\s+[^?]+\?)/i,
  /^(When\s+[^?]+\?)/i,
  /^(Where\s+[^?]+\?)/i,
  /^(Can\s+I\s+[^?]+\?)/i,
  /^(Does\s+[^?]+\?)/i,
  /^(Is\s+[^?]+\?)/i,
  /^(Are\s+[^?]+\?)/i,
  /^(Will\s+[^?]+\?)/i,
  /^(Should\s+I\s+[^?]+\?)/i,
  /^(What\s+are\s+[^?]+\?)/i,
  /^(How\s+can\s+I\s+[^?]+\?)/i,
  /^(What\s+does\s+[^?]+\?)/i,
  /^(How\s+does\s+[^?]+\?)/i,
  /^(What\s+happens\s+[^?]+\?)/i,
  /^(How\s+long\s+[^?]+\?)/i,
  /^(How\s+much\s+[^?]+\?)/i,
  /^(What\s+if\s+[^?]+\?)/i,
  /^(Do\s+I\s+[^?]+\?)/i,
];

// Keywords that suggest FAQ content
const FAQ_KEYWORDS = [
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

export async function extractFAQContent() {
  console.log('🔍 Starting FAQ content extraction...');
  
  // Find the most recent scraped content file
  const dataDir = './data/scraped-content';
  const files = fs.readdirSync(dataDir).filter(file => file.startsWith('scraped-content-'));
  
  if (files.length === 0) {
    console.error('❌ No scraped content files found');
    return;
  }
  
  // Get the most recent file
  const latestFile = files.sort().pop()!;
  const filePath = path.join(dataDir, latestFile);
  
  console.log(`📁 Processing file: ${latestFile}`);
  
  // Read the scraped content
  const content = fs.readFileSync(filePath, 'utf-8');
  const chunks: ScrapedChunk[] = JSON.parse(content);
  
  console.log(`📦 Found ${chunks.length} chunks to analyze`);
  
  const faqItems: FAQItem[] = [];
  let processedChunks = 0;
  
  for (const chunk of chunks) {
    processedChunks++;
    if (processedChunks % 100 === 0) {
      console.log(`🔄 Processed ${processedChunks}/${chunks.length} chunks...`);
    }
    
    const faqFromChunk = extractFAQFromChunk(chunk);
    faqItems.push(...faqFromChunk);
  }
  
  console.log(`\n✅ Extracted ${faqItems.length} potential FAQ items`);
  
  // Sort by confidence score
  faqItems.sort((a, b) => b.confidence - a.confidence);
  
  // Save results
  const outputPath = './data/extracted-faq.json';
  fs.writeFileSync(outputPath, JSON.stringify(faqItems, null, 2));
  
  console.log(`💾 Saved FAQ items to: ${outputPath}`);
  
  // Generate summary
  const summary = {
    extractedAt: new Date().toISOString(),
    sourceFile: latestFile,
    totalChunks: chunks.length,
    totalFAQItems: faqItems.length,
    highConfidenceItems: faqItems.filter(item => item.confidence >= 0.7).length,
    mediumConfidenceItems: faqItems.filter(item => item.confidence >= 0.4 && item.confidence < 0.7).length,
    lowConfidenceItems: faqItems.filter(item => item.confidence < 0.4).length,
    categories: getCategoryBreakdown(faqItems),
    sampleItems: faqItems.slice(0, 5).map(item => ({
      question: item.question.substring(0, 100) + '...',
      confidence: item.confidence,
      category: item.category
    }))
  };
  
  const summaryPath = './data/faq-extraction-summary.json';
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`📊 Summary saved to: ${summaryPath}`);
  console.log('\n📈 Extraction Summary:');
  console.log(`   High confidence (≥0.7): ${summary.highConfidenceItems}`);
  console.log(`   Medium confidence (0.4-0.7): ${summary.mediumConfidenceItems}`);
  console.log(`   Low confidence (<0.4): ${summary.lowConfidenceItems}`);
  
  return faqItems;
}

function extractFAQFromChunk(chunk: ScrapedChunk): FAQItem[] {
  const faqItems: FAQItem[] = [];
  const content = chunk.content;
  
  // First, try to extract from HTML details/summary tags
  const htmlFAQItems = extractFAQFromHTML(content, chunk);
  faqItems.push(...htmlFAQItems);
  
  // If no HTML FAQ found, try to extract from regular text
  if (htmlFAQItems.length === 0) {
    const textFAQItems = extractFAQFromText(content, chunk);
    faqItems.push(...textFAQItems);
  }
  
  return faqItems;
}

function extractFAQFromHTML(content: string, chunk: ScrapedChunk): FAQItem[] {
  const faqItems: FAQItem[] = [];
  
  // Find all details/summary pairs
  let match;
  const regex = new RegExp(DETAILS_SUMMARY_PATTERN);
  
  while ((match = regex.exec(content)) !== null) {
    const question = cleanHTML(match[1]);
    const answer = cleanHTML(match[2]);
    
    if (question && answer && question.length > 10 && answer.length > 20) {
      const confidence = calculateHTMLConfidence(question, answer);
      const category = categorizeFAQ(question, answer);
      
      faqItems.push({
        question,
        answer,
        source: chunk.metadata.title,
        url: chunk.url,
        confidence,
        category
      });
    }
  }
  
  return faqItems;
}

function extractFAQFromText(content: string, chunk: ScrapedChunk): FAQItem[] {
  const faqItems: FAQItem[] = [];
  
  // Split content into paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    // Check if this paragraph contains a question
    const questionMatch = findQuestionInText(paragraph);
    
    if (questionMatch) {
      const question = questionMatch.question;
      const answer = extractAnswer(paragraphs, i, questionMatch);
      const confidence = calculateConfidence(paragraph, questionMatch);
      const category = categorizeFAQ(question, answer);
      
      faqItems.push({
        question,
        answer,
        source: chunk.metadata.title,
        url: chunk.url,
        confidence,
        category
      });
    }
  }
  
  return faqItems;
}

function cleanHTML(html: string): string {
  // Remove HTML tags
  let cleaned = html.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

function calculateHTMLConfidence(question: string, answer: string): number {
  let confidence = 0.9; // High base confidence for HTML structure
  
  // Boost for question mark
  if (question.includes('?')) confidence += 0.05;
  
  // Boost for longer answers
  if (answer.length > 100) confidence += 0.05;
  
  // Penalize very short content
  if (question.length < 10) confidence -= 0.1;
  if (answer.length < 20) confidence -= 0.1;
  
  return Math.max(0, Math.min(1, confidence));
}

function findQuestionInText(text: string): { question: string; pattern: RegExp } | null {
  for (const pattern of QUESTION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        question: match[1].trim(),
        pattern
      };
    }
  }
  
  // Look for question marks in the text
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  for (const sentence of sentences) {
    if (sentence.includes('?') && sentence.length > 10 && sentence.length < 200) {
      // Check if it looks like a question
      const questionText = sentence.trim();
      if (isLikelyQuestion(questionText)) {
        return {
          question: questionText,
          pattern: /question/
        };
      }
    }
  }
  
  return null;
}

function isLikelyQuestion(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for question keywords
  const hasQuestionKeywords = FAQ_KEYWORDS.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  // Check for question structure
  const hasQuestionStructure = /^(how|what|why|when|where|can|does|is|are|will|should|do)/i.test(text);
  
  // Check for question mark
  const hasQuestionMark = text.includes('?');
  
  return (hasQuestionKeywords || hasQuestionStructure) && hasQuestionMark;
}

function extractAnswer(paragraphs: string[], questionIndex: number, questionMatch: { question: string; pattern: RegExp }): string {
  let answer = '';
  
  // Try to find answer in the same paragraph (after the question)
  const questionParagraph = paragraphs[questionIndex];
  const questionEndIndex = questionParagraph.indexOf(questionMatch.question) + questionMatch.question.length;
  const remainingText = questionParagraph.substring(questionEndIndex).trim();
  
  if (remainingText.length > 20) {
    answer = remainingText;
  }
  
  // If no answer in same paragraph, look in next few paragraphs
  if (answer.length < 50 && questionIndex + 1 < paragraphs.length) {
    const nextParagraphs = paragraphs.slice(questionIndex + 1, questionIndex + 4);
    answer = nextParagraphs.join(' ').trim();
  }
  
  // Clean up the answer
  answer = answer.replace(/^\s*[.!?]\s*/, ''); // Remove leading punctuation
  answer = answer.substring(0, 1000); // Limit length
  
  return answer || 'No answer found';
}

function calculateConfidence(text: string, questionMatch: { question: string; pattern: RegExp }): number {
  let confidence = 0.5; // Base confidence
  
  const lowerText = text.toLowerCase();
  
  // Boost confidence for strong question patterns
  if (questionMatch.pattern.source !== 'question') {
    confidence += 0.3;
  }
  
  // Boost for FAQ keywords
  const keywordMatches = FAQ_KEYWORDS.filter(keyword => 
    lowerText.includes(keyword.toLowerCase())
  ).length;
  confidence += Math.min(keywordMatches * 0.1, 0.3);
  
  // Boost for longer answers
  const answerLength = text.length - questionMatch.question.length;
  if (answerLength > 100) confidence += 0.1;
  if (answerLength > 300) confidence += 0.1;
  
  // Penalize very short content
  if (text.length < 50) confidence -= 0.2;
  
  return Math.max(0, Math.min(1, confidence));
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

function getCategoryBreakdown(faqItems: FAQItem[]): Record<string, number> {
  const categories: Record<string, number> = {};
  
  for (const item of faqItems) {
    const category = item.category || 'General';
    categories[category] = (categories[category] || 0) + 1;
  }
  
  return categories;
}

// Run the extraction if this file is executed directly
if (require.main === module) {
  extractFAQContent()
    .then(() => {
      console.log('✅ FAQ extraction completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ FAQ extraction failed:', error);
      process.exit(1);
    });
} 