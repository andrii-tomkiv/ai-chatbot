/**
 * Check if a message appears to be gibberish
 * @param content - The message content to validate
 * @returns True if the message appears to be gibberish
 */
export function isGibberishMessage(content: string): boolean {
  const trimmed = content.trim();
  
  // Very short messages
  if (trimmed.length < 3) return true;
  
  // Check for random character patterns
  const randomPatterns = [
    /^[a-zA-Z0-9]{2,15}$/, // Random alphanumeric
    /^[0-9]+[a-zA-Z]+[0-9]+$/, // Number-letter-number pattern
    /^[a-zA-Z]+[0-9]+[a-zA-Z]+$/, // Letter-number-letter pattern
    /^[a-zA-Z]{1,3}[0-9]{1,3}[a-zA-Z]{1,3}$/, // Short mixed patterns
  ];
  
  if (randomPatterns.some(pattern => pattern.test(trimmed))) {
    // Allow some legitimate short words
    const legitimateShortWords = ['hi', 'hello', 'hey', 'ok', 'yes', 'no', 'why', 'how', 'what', 'when', 'where', 'who'];
    if (legitimateShortWords.includes(trimmed.toLowerCase())) {
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Check if a message exceeds the maximum length
 * @param content - The message content to validate
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns True if the message is too long
 */
export function isMessageTooLong(content: string, maxLength: number = 1000): boolean {
  return content.length > maxLength;
}

/**
 * Check if a message is a duplicate of previous messages
 * @param currentMessage - The current message content
 * @param previousMessages - Array of previous message contents
 * @returns True if the message is a duplicate
 */
export function isDuplicateMessage(currentMessage: string, previousMessages: string[]): boolean {
  const currentLower = currentMessage.toLowerCase();
  return previousMessages.some(msg => msg.toLowerCase() === currentLower);
}

/**
 * Validate message content against multiple criteria
 * @param content - The message content to validate
 * @param options - Validation options
 * @returns Validation result object
 */
export function validateMessage(content: string, options: {
  maxLength?: number;
  checkGibberish?: boolean;
  previousMessages?: string[];
} = {}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!content || !content.trim()) {
    errors.push('Message content is required');
  }
  
  if (options.checkGibberish && isGibberishMessage(content)) {
    errors.push('Message appears to be gibberish');
  }
  
  if (options.maxLength && isMessageTooLong(content, options.maxLength)) {
    errors.push(`Message exceeds maximum length of ${options.maxLength} characters`);
  }
  
  if (options.previousMessages && isDuplicateMessage(content, options.previousMessages)) {
    errors.push('Message is a duplicate of a previous message');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 