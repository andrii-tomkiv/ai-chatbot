/**
 * Website URLs and endpoints
 * Centralized constants for all ConceiveAbilities URLs
 */

export const WEBSITE_URLS = {
  // Base URLs
  PRODUCTION: {
    BASE: 'https://www.conceiveabilities.com',
    CONTACT: 'https://www.conceiveabilities.com/about/contact-us/',
    SITEMAPS: {
      BLOG: 'https://www.conceiveabilities.com/blog-sitemap-xml',
      MARKETING: 'https://www.conceiveabilities.com/marketing-sitemap.xml'
    }
  },

  STAGING: {
    BASE: 'https://www.staging.conceiveabilities.com',
    CONTACT: 'https://www.staging.conceiveabilities.com/about/contact-us/',
    SITEMAPS: {
      BLOG: 'https://www.staging.conceiveabilities.com/blog-sitemap-xml',
      MARKETING: 'https://www.staging.conceiveabilities.com/marketing-sitemap.xml'
    }
  }
} as const;

/**
 * Get sitemap URLs for the specified environment
 * @param environment - 'production' or 'staging'
 * @returns Array of sitemap URLs
 */
export function getSitemapUrls(environment: 'production' | 'staging' = 'production'): string[] {
  const config = environment === 'production' ? WEBSITE_URLS.PRODUCTION : WEBSITE_URLS.STAGING;
  return [
    config.SITEMAPS.BLOG,
    config.SITEMAPS.MARKETING
  ];
}

/**
 * Get contact URL for the specified environment
 * @param environment - 'production' or 'staging'
 * @returns Contact page URL
 */
export function getContactUrl(environment: 'production' | 'staging' = 'production'): string {
  return environment === 'production' 
    ? WEBSITE_URLS.PRODUCTION.CONTACT 
    : WEBSITE_URLS.STAGING.CONTACT;
} 