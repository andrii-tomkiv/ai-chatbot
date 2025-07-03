import { headers } from 'next/headers';

/**
 * Get request information for rate limiting and identification
 * Extracts IP address and user agent from request headers
 * @returns A string identifier combining IP and user agent
 */
export async function getRequestInfo(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  const userAgent = headersList.get('user-agent') || 'unknown';
  
  let ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  ip = ip.trim();
  
  return `${ip}:${userAgent.substring(0, 50)}`;
}

/**
 * Check if a user agent appears to be a bot
 * @param userAgent - The user agent string to check
 * @returns True if the user agent appears to be a bot
 */
export function isBotUserAgent(userAgent: string): boolean {
  const botPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i];
  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Extract IP address from request headers
 * @param headersList - The headers object
 * @returns The IP address as a string
 */
export function extractIpAddress(headersList: Headers): string {
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  
  let ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  return ip.trim();
} 