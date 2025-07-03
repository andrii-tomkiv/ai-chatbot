/**
 * Standardized message responses for the chatbot
 */

export const RESPONSE_MESSAGES = {
  GIBBERISH_FIRST: 'Hello! 👋 I\'m your fertility and surrogacy assistant, here to help answer your questions about surrogacy, egg donation, intended parenting, and fertility treatments. \n\nI\'d be happy to help if you could please ask me a specific question about these topics. For example, you might ask about surrogacy costs, the IVF process, legal requirements, or finding the right clinic. \n\nWhat would you like to know? 😊',
  
  GIBBERISH_REPEATED: 'I notice you\'ve sent several unclear messages. 🤔 \n\nAs your fertility and surrogacy assistant, I\'m here to help with questions about surrogacy, egg donation, IVF, and intended parenting. Please take a moment to ask me a clear question about these topics, and I\'ll be happy to provide you with helpful information! \n\nFor example: "What are the costs involved in surrogacy?" or "How does the egg donation process work?" \n\nThank you for your understanding! 😊',
  
  MESSAGE_TOO_LONG: 'I\'d love to help, but your message is quite long! 📝 \n\nTo provide you with the best assistance regarding surrogacy, egg donation, and fertility topics, please keep your questions under 1000 characters. This helps me give you focused, accurate answers. \n\nFeel free to break longer questions into smaller parts - I\'m here to help! 😊',
  
  DUPLICATE_MESSAGE: 'I see you\'ve asked the same question again! 🔄 \n\nI\'m happy to help with any fertility, surrogacy, or egg donation questions you might have. If my previous answer wasn\'t what you were looking for, please try rephrasing your question or ask about a different aspect of the topic. \n\nI\'m here to provide you with the most helpful information possible! 😊',
  
  BOT_ACCESS_DENIED: 'Access denied.',
  
  NO_CONTENT: 'No message content provided',
  
  ERROR_GENERIC: 'Sorry, I encountered an error. Please try again.',
  
  BLOCKED_SPAM: (minutes: number) => `Too many invalid messages. You are blocked for ${minutes} minutes.`,
  
  RATE_LIMITED: (seconds: number) => `Rate limit exceeded. Please wait ${seconds} seconds before trying again.`
} as const;

/**
 * Generate a rate limit exceeded message
 * @param resetTime - The time when the rate limit resets
 * @returns Formatted rate limit message
 */
export function createRateLimitMessage(resetTime: number): string {
  const seconds = Math.ceil((resetTime - Date.now()) / 1000);
  return RESPONSE_MESSAGES.RATE_LIMITED(seconds);
}

/**
 * Generate a spam block message
 * @param blockDuration - The block duration in milliseconds
 * @returns Formatted spam block message
 */
export function createSpamBlockMessage(blockDuration: number): string {
  const minutes = Math.ceil(blockDuration / 60000);
  return RESPONSE_MESSAGES.BLOCKED_SPAM(minutes);
} 