import { Message } from '@/app/actions';

const CHAT_HISTORY_KEY = 'conab_chat_history';
const CHAT_TIMESTAMP_KEY = 'conab_chat_timestamp';
const MAX_HISTORY_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MAX_HISTORY_LENGTH = 50; // Maximum number of messages to store

export function saveChatHistory(conversation: Message[]): void {
  try {
    const historyData = {
      messages: conversation,
      timestamp: Date.now()
    };
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyData));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

export function loadChatHistory(): Message[] {
  try {
    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!savedHistory) return [];

    const historyData = JSON.parse(savedHistory);
    
    if (Date.now() - historyData.timestamp > MAX_HISTORY_AGE) {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      return [];
    }

    const messages = historyData.messages.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined
    }));

    return messages.slice(-MAX_HISTORY_LENGTH);
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
}

export function clearChatHistory(): void {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    localStorage.removeItem(CHAT_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
} 