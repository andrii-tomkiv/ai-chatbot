import { TestScores } from '../ab-test-runner';

interface GeminiEvaluationResponse {
  Faithfulness: string;
  Helpfulness: string;
  justification?: string;
}

// New interface for LLM-specific evaluation results
export interface LLMTestScores {
  faithfulness: number;
  helpfulness: number;
  justification?: string;
  // Keep keyword fields for backward compatibility
  keywordMatches: string[];
  missingKeywords: string[];
}

export async function evaluateWithLLM(
  answer: string,
  sources: string[],
  expectedKeywords: string[],
  expectedSources: string[],
  context: string,
  userQuestion: string
): Promise<TestScores> {
  try {
    const prompt = `You are an impartial AI quality evaluator. Your task is to evaluate a chatbot's answer based on a provided context and user question.

Please evaluate the chatbot's answer on a scale of 1 to 5 for "Faithfulness" and "Helpfulness".
- **Faithfulness (1-5):** How strictly does the answer adhere ONLY to the provided context? (1 = hallucinates information, 5 = perfectly faithful).
- **Helpfulness (1-5):** How well does the answer address the user's question? (1 = not helpful, 5 = very helpful).

**Provided Context from the website:**
"${context}"

**User's Question:**
"${userQuestion}"

**Chatbot's Answer:**
"${answer}"

**Your Evaluation (respond only with a JSON object):**
{"Faithfulness": "5", "Helpfulness": "4"}`;

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Gemini API returned failure response');
    }

    const generatedText = data.result;
    
    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    let evaluation: GeminiEvaluationResponse;
    try {
      // Clean the response by removing markdown code blocks if present
      let cleanedText = generatedText.trim();
      if (cleanedText.startsWith('```json') && cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(7, -3).trim(); // Remove ```json and ```
      } else if (cleanedText.startsWith('```') && cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(3, -3).trim(); // Remove generic ```
      }
      
      evaluation = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', generatedText);
      throw new Error('Invalid JSON response from Gemini');
    }

    // Parse string values to numbers and validate scores are within range
    const faithfulness = Math.max(1, Math.min(5, parseInt(evaluation.Faithfulness) || 1));
    const helpfulness = Math.max(1, Math.min(5, parseInt(evaluation.Helpfulness) || 1));

    // Calculate keyword matches for backward compatibility
    const keywordMatches: string[] = [];
    const missingKeywords: string[] = [];
    
    if (expectedKeywords.length > 0) {
      const answerLower = answer.toLowerCase();
      for (const keyword of expectedKeywords) {
        if (answerLower.includes(keyword.toLowerCase())) {
          keywordMatches.push(keyword);
        } else {
          missingKeywords.push(keyword);
        }
      }
    }

    // Map LLM results to TestScores interface for backward compatibility
    return {
      accuracy: faithfulness,
      completeness: keywordMatches.length > 0 ? Math.round((keywordMatches.length / Math.max(expectedKeywords.length, 1)) * 5) : helpfulness,
      helpfulness: helpfulness,
      keywordMatches,
      missingKeywords,
    };

  } catch (error) {
    console.error('LLM evaluation failed:', error);
    throw new Error(`LLM evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 