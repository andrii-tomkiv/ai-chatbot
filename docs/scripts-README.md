# Mistral vs Groq Comparison Test Runner

This directory contains the automated comparison system for testing Mistral vs Groq performance on the ConceiveAbilities AI chatbot.

## Files

- `evaluate-chatbot.ts` - Core comparison engine with scoring algorithms
- `run-evaluation.ts` - Simple test runner script with comparison output
- `README.md` - This documentation

## Quick Start

### Prerequisites

1. Make sure your chatbot server is running:
   ```bash
   npm run dev
   ```

2. Ensure you have both API keys configured:
   - `MISTRAL_API_KEY` in your environment
   - `GROQ_API_KEY` in your environment

3. Ensure you have the test cases file:
   ```
   data/evaluation/evaluation-test-cases.json
   ```

### Running the Comparison

#### Option 1: Using the test runner script
```bash
npx tsx scripts/run-evaluation.ts
```

#### Option 2: Using the original evaluator
```bash
npx tsx scripts/evaluate-chatbot.ts
```

#### Option 3: Test against a different URL
```bash
npx tsx scripts/run-evaluation.ts http://localhost:3001
```

## What the Comparison Does

1. **Loads Test Cases**: Reads 80+ test cases from `data/evaluation/evaluation-test-cases.json`
2. **Tests Both Providers**: For each question, sends the same request to both Mistral and Groq
3. **Evaluates Responses**: Scores both answers based on:
   - **Accuracy**: Keyword matching (1-5 scale)
   - **Completeness**: How many expected keywords are found
   - **Source Accuracy**: Whether expected sources are cited
   - **Helpfulness**: Overall quality score
4. **Determines Winner**: Compares scores and declares a winner for each test
5. **Generates Report**: Creates detailed JSON report with side-by-side comparisons

## Test Categories

The comparison covers 8 categories:
- **General** (28 tests)
- **Medical & Health** (6 tests) 
- **Requirements & Eligibility** (6 tests)
- **Pricing & Costs** (6 tests)
- **Compensation & Benefits** (6 tests)
- **Insurance & Coverage** (6 tests)
- **Legal & Contracts** (6 tests)
- **Process & Timeline** (6 tests)

## Difficulty Levels

- **Easy**: Basic questions about services and processes
- **Medium**: Detailed questions about requirements and procedures  
- **Hard**: Complex legal, medical, or technical questions

## Output

### Console Output
```
🤖 Starting Mistral vs Groq Comparison Test Runner
📍 Target URL: http://localhost:3000
⏳ Initializing evaluator...

🚀 Running comparison tests...
📝 Each test case will be evaluated with both Mistral and Groq

Evaluating TC001: What is the cost of the All-In Program?...
Evaluating TC002: What is included in the All-In Program?...
...

✅ Comparison completed in 90.45 seconds

============================================================
EVALUATION SUMMARY
============================================================
Total Tests: 80
Mistral Wins: 45
Groq Wins: 32
Ties: 3
Mistral Win Rate: 56.3%

Average Scores (1-5 scale):
  Mistral Accuracy: 4.2
  Mistral Completeness: 4.1
  Mistral Source Accuracy: 3.8
  Mistral Helpfulness: 4.0
  Groq Accuracy: 3.9
  Groq Completeness: 3.8
  Groq Source Accuracy: 3.5
  Groq Helpfulness: 3.7

📊 Comparison Results:
   📁 Report saved as: mistral-vs-groq-comparison-2024-01-15T10-30-45-123Z.json
   🏆 Mistral Win Rate: 56.3%
   🏆 Groq Win Rate: 40.0%
   🤝 Tie Rate: 3.8%

📈 Average Helpfulness Scores:
   Mistral: 4.0/5
   Groq: 3.7/5

🎉 Mistral wins overall!
   Margin: +0.3 points

🎯 Recommendation: Consider using Mistral as primary provider
```

### Report File
Detailed JSON report saved to `data/evaluation/mistral-vs-groq-comparison-{timestamp}.json` with:
- Individual test results with both providers' answers
- Side-by-side score comparisons
- Winner determination for each test
- Category and difficulty breakdowns
- Full response text and sources from both providers

## What You'll Learn

### Performance Insights
- **Which provider is better overall** for your specific use case
- **Category-specific performance** (e.g., Mistral might be better at legal questions, Groq at medical)
- **Difficulty-level performance** (e.g., which handles complex questions better)
- **Score differences** to understand the margin of victory

### Decision Making
- **Primary provider selection** based on win rates
- **Cost vs performance trade-offs** (Groq is often faster/cheaper)
- **Fallback strategy** (use the runner-up as backup)
- **Prompt optimization** insights from comparing responses

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Make sure all dependencies are installed: `npm install`

2. **"Connection refused" errors**
   - Ensure your chatbot server is running on the correct port
   - Check the base URL in the command

3. **"Rate limit exceeded" errors**
   - The evaluator includes delays between requests
   - If still getting rate limited, increase delays in `evaluate-chatbot.ts`

4. **"API key not found" errors**
   - Verify both `MISTRAL_API_KEY` and `GROQ_API_KEY` are set in your environment
   - Check your `.env` file

5. **Empty responses from one provider**
   - Check server logs for API errors
   - Verify the specific provider's API key and configuration

### Performance Tips

- The comparison runs 80+ tests × 2 providers = 160+ API calls
- Total runtime is typically 60-120 seconds
- For faster testing, you can modify the test cases file to include fewer tests

## Customization

### Adding New Test Cases
Edit `data/evaluation/evaluation-test-cases.json`:
```json
{
  "id": "TC081",
  "category": "Your Category",
  "difficulty": "Easy|Medium|Hard", 
  "question": "Your test question?",
  "expectedKeywords": ["keyword1", "keyword2"],
  "expectedSources": ["source1", "source2"]
}
```

### Modifying Scoring
Edit the scoring algorithms in `evaluate-chatbot.ts`:
- `calculateKeywordScore()` - How keyword matching is scored
- `calculateSourceScore()` - How source citation is scored
- `calculateScores()` - Overall scoring logic

### Changing Test Parameters
- **Delay between requests**: Modify the `setTimeout` in `runEvaluation()`
- **Win thresholds**: Change the logic in `printSummary()`
- **Report format**: Modify `generateReport()` and `saveReport()` 