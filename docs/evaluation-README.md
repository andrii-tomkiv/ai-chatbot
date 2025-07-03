# Chatbot Evaluation System

This directory contains the evaluation system for the ConceiveAbilities chatbot.

## Files

- `evaluation-test-cases.json` - 80 test cases covering all FAQ categories
- `evaluation-report.json` - Generated evaluation results (created after running evaluation)
- `README.md` - This documentation

## Running Evaluation

### Prerequisites

1. Make sure your chatbot is running on `http://localhost:3000` (or specify a different URL)
2. Ensure your chatbot API endpoint `/api/chat` is working

### Basic Usage

```bash
# Run evaluation against localhost:3000
npm run evaluate

# Run evaluation against a different URL
npm run evaluate http://your-chatbot-url.com
```

### What the Evaluation Does

1. **Loads test cases** from `evaluation-test-cases.json`
2. **Sends each question** to your chatbot API
3. **Compares responses** against expected keywords and sources
4. **Calculates scores** for:
   - Accuracy (1-5 scale)
   - Completeness (1-5 scale) 
   - Source Accuracy (1-5 scale)
   - Helpfulness (1-5 scale)
5. **Generates a comprehensive report** with:
   - Overall summary statistics
   - Breakdown by category
   - Breakdown by difficulty level
   - Detailed results for each test case

### Understanding the Results

- **Pass Rate**: Percentage of tests with accuracy score ≥ 3
- **Average Scores**: Mean scores across all metrics
- **Category Breakdown**: Performance by FAQ category (Pricing, Medical, Legal, etc.)
- **Difficulty Breakdown**: Performance by difficulty level (Easy, Medium, Hard)

### Test Case Structure

Each test case includes:
- `id`: Unique identifier (TC001, TC002, etc.)
- `category`: FAQ category
- `difficulty`: Easy, Medium, or Hard
- `question`: The test question
- `expectedKeywords`: Keywords that should appear in the answer
- `expectedSources`: Sources that should be referenced

### Customizing Evaluation

You can modify the evaluation by:
1. **Adding new test cases** to `evaluation-test-cases.json`
2. **Adjusting scoring logic** in `scripts/evaluate-chatbot.ts`
3. **Changing the API endpoint** or request format
4. **Modifying the pass threshold** (currently set to accuracy ≥ 3)

### Example Output

```
============================================================
EVALUATION SUMMARY
============================================================
Total Tests: 80
Passed Tests: 65
Failed Tests: 15
Pass Rate: 81.3%

Average Scores (1-5 scale):
  Accuracy: 3.85
  Completeness: 3.72
  Source Accuracy: 3.91
  Helpfulness: 3.83

Category Breakdown:
  General: 20 tests, Avg Accuracy: 3.90
  Medical & Health: 15 tests, Avg Accuracy: 3.80
  Pricing & Costs: 5 tests, Avg Accuracy: 3.60
  ...

Difficulty Breakdown:
  Easy: 30 tests, Avg Accuracy: 4.10
  Medium: 35 tests, Avg Accuracy: 3.75
  Hard: 15 tests, Avg Accuracy: 3.40
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Make sure your chatbot is running
2. **API errors**: Check that your `/api/chat` endpoint returns the expected format
3. **Low scores**: Review your chatbot's responses and adjust test cases or scoring logic

### API Response Format

The evaluator expects your chatbot API to return:
```json
{
  "answer": "The chatbot's response text",
  "sources": ["source1", "source2"]
}
```

If your API returns a different format, modify the `sendQuestionToChatbot` method in `scripts/evaluate-chatbot.ts`. 