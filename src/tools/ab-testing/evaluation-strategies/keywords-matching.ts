export interface KeywordEvaluationResult {
  accuracy: number;
  completeness: number;
  helpfulness: number;
  keywordMatches: string[];
  missingKeywords: string[];
}

export function evaluateWithKeywords(
  answer: string,
  expectedKeywords: string[],
): KeywordEvaluationResult {
  const keywordResult = calculateKeywordScore(answer, expectedKeywords);

  // Accuracy: Based on keyword matches
  const accuracy = keywordResult.score;

  // Completeness: Based on how many keywords are found
  const completeness = keywordResult.score;

  // Helpfulness: Combination of accuracy and completeness
  const helpfulness = (accuracy + completeness) / 2;

  return {
    accuracy: Math.round(accuracy * 5), // Convert to 1-5 scale
    completeness: Math.round(completeness * 5),
    helpfulness: Math.round(helpfulness * 5),
    keywordMatches: keywordResult.matches,
    missingKeywords: keywordResult.missing,
  };
}

function calculateKeywordScore(answer: string, expectedKeywords: string[]): {
  score: number;
  matches: string[];
  missing: string[];
} {
  const answerLower = answer.toLowerCase();
  const matches: string[] = [];
  const missing: string[] = [];

  for (const keyword of expectedKeywords) {
    if (answerLower.includes(keyword.toLowerCase())) {
      matches.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  const score = expectedKeywords.length > 0 ? matches.length / expectedKeywords.length : 0;
  return { score, matches, missing };
} 