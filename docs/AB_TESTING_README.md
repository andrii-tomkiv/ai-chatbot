# A/B Testing Dashboard

## Overview

The A/B Testing Dashboard is a powerful tool for comparing different configurations of your ConceiveAbilities AI chatbot. It allows you to test various parameters like LLM providers, models, prompts, and settings to determine which configuration performs better.

## Features

- **Two-Column Configuration**: Compare two different setups side-by-side
- **Multiple LLM Providers**: Test with Mistral, Groq, and other supported providers
- **Flexible Parameters**: Adjust temperature, max tokens, max results, and system prompts
- **Multiple Evaluation Strategies**: Choose between keywords matching, source accuracy, or LLM-based evaluation
- **Category Selection**: Test specific categories of questions
- **Real-time Results**: View detailed statistics and individual test results
- **Win Rate Analytics**: See which configuration performs better overall

## How to Use

### 1. Access the Dashboard

Navigate to `http://localhost:3000/dashboard` in your browser after starting the development server.

### 2. Configure Test Settings

#### Configuration A & B
- **Name**: Give your configurations descriptive names
- **Provider**: Choose between Mistral or Groq
- **Model**: Select the specific model to use
- **Max Tokens**: Set the maximum number of tokens for responses
- **Temperature**: Adjust the randomness of responses (0-2)
- **Max Results**: Set how many search results to include
- **System Prompt**: Customize the system prompt for the AI

#### Evaluation Strategy
- **Keywords Matching**: Evaluates based on how many expected keywords appear in the response
- **Source Accuracy**: Evaluates based on how accurately sources are referenced
- **LLM-based Evaluation**: Combines keyword and source evaluation (can be extended to use LLM evaluation)

#### Test Categories
Select which categories of questions to test:
- General
- Medical & Health
- Legal & Contracts
- Pricing & Costs
- Compensation & Benefits
- Insurance & Coverage
- Requirements & Eligibility
- Process & Timeline

### 3. Run the Test

1. Select at least one test category
2. Click "Run A/B Test"
3. Wait for the test to complete (this may take several minutes depending on the number of questions)

### 4. Analyze Results

The dashboard will display:
- **Win Rate Statistics**: Percentage of tests won by each configuration
- **Average Scores**: Overall performance scores for each configuration
- **Detailed Results**: Individual test results with questions, scores, and winners

## Test Methodology

The A/B testing system uses the same evaluation methodology as the existing evaluation system:

1. **Test Cases**: Uses the same test cases from `data/evaluation/evaluation-test-cases.json`
2. **Scoring System**: 1-5 scale for accuracy, completeness, and helpfulness
3. **Keyword Matching**: Compares responses against expected keywords
4. **Source Verification**: Checks if appropriate sources are referenced
5. **Winner Determination**: Based on helpfulness scores

## Example Use Cases

### Testing Different Models
- Configuration A: Mistral Small
- Configuration B: Mistral Large
- Compare performance vs. cost trade-offs

### Testing Different Providers
- Configuration A: Mistral
- Configuration B: Groq
- Compare response quality and speed

### Testing Different Prompts
- Configuration A: Standard prompt
- Configuration B: Custom optimized prompt
- See which prompt generates better responses

### Testing Different Parameters
- Configuration A: Temperature 0.7
- Configuration B: Temperature 0.3
- Compare creative vs. conservative responses

## API Integration

The A/B testing system uses your existing `/api/chat` endpoint, so it tests the actual production API with real configurations.

## Performance Considerations

- Each test makes 2 API calls per question (one for each configuration)
- Tests run sequentially with small delays to avoid overwhelming the API
- Total test time depends on the number of questions and API response times
- Results are stored in memory during the session

## Troubleshooting

### Common Issues

1. **No test cases found**: Make sure you've selected at least one category
2. **API errors**: Check that your API keys are properly configured
3. **Network errors**: Ensure the development server is running
4. **Slow performance**: Reduce the number of test categories or check API response times

### Error Messages

- **"No test cases found for the selected categories"**: Select at least one category
- **"Failed to load test cases"**: The test cases file might not be accessible
- **HTTP errors**: Check your API configuration and network connection

## Technical Details

### Architecture
- **Frontend**: React component with TypeScript
- **Backend**: Uses existing Next.js API routes
- **Test Runner**: Custom TypeScript class for managing A/B tests
- **Data**: JSON-based test cases and results

### File Structure
```
src/
├── app/dashboard/page.tsx          # Main dashboard page
├── components/ABTestingDashboard.tsx # A/B testing interface
├── lib/ab-test-runner.ts           # Test execution logic
└── public/data/evaluation/         # Test cases (copied from data/)
```

## Future Enhancements

- **LLM-based Evaluation**: Use an LLM to evaluate response quality
- **Custom Test Cases**: Allow users to create their own test cases
- **Export Results**: Download test results as JSON/CSV
- **Historical Comparison**: Compare results across different test runs
- **Real-time Charts**: Add charts and graphs for better visualization
- **Statistical Significance**: Add confidence intervals and p-values

## Contributing

To add new evaluation strategies or improve the testing system:

1. Modify the `ABTestRunner` class in `src/lib/ab-test-runner.ts`
2. Add new evaluation strategies in the `calculateScores` method
3. Update the UI in `src/components/ABTestingDashboard.tsx`
4. Test your changes thoroughly before deploying

## Support

For issues or questions about the A/B testing system, please refer to the main project documentation or create an issue in the project repository. 