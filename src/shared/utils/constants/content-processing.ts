/**
 * Content processing constants
 * Configuration values for scraping and content processing
 */

export const CONTENT_PROCESSING = {
  // Chunk settings
  MAX_CHUNK_LENGTH: 1000,
  MIN_PARAGRAPH_LENGTH: 50,
  
  // Scraping settings
  RETRY_STRATEGIES: 3,
  REQUEST_DELAY_MS: 1000,
  RETRY_DELAY_MS: 2000,
  PROGRESS_SAVE_INTERVAL: 10,

  // Content selectors for scraping
  CONTENT_SELECTORS: [
    'article',
    '.content',
    '.main-content',
    '.post-content',
    '.entry-content',
    'main',
    '.blog-post',
    '.page-content'
  ],

  // File paths
  PATHS: {
    SCRAPED_CONTENT_DIR: './data/scraped-content',
    PROGRESS_FILE_PREFIX: 'scraped-content-progress-',
    FINAL_FILE_PREFIX: 'scraped-content-'
  }
} as const;

/**
 * Generate a unique chunk ID
 * @param chunkIndex - Optional chunk index for multi-chunk content
 * @returns Unique chunk identifier
 */
export function generateChunkId(chunkIndex?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return chunkIndex !== undefined 
    ? `chunk-${timestamp}-${chunkIndex}-${random}`
    : `chunk-${timestamp}-${random}`;
} 