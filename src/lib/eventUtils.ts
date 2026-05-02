/**
 * Utility functions for generating event slugs and unique codes
 */

/**
 * Generate a URL-friendly slug from event title
 * @param title - The event title
 * @returns A slug string (lowercase, hyphens instead of spaces, no special chars)
 */
export function generateEventSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .slice(0, 200); // Limit length
}

/**
 * Generate a unique event code for sharing
 * Format: EVT-XXXXX-XXXXX (12 characters total)
 * @returns A unique event code string
 */
export function generateEventCode(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const code = `EVT-${timestamp.toString().slice(-5)}-${random}`;
  return code;
}

/**
 * Generate a shareable URL for an event
 * @param eventSlug - The event slug
 * @param baseUrl - Optional base URL (defaults to current domain)
 * @returns The full shareable URL
 */
export function generateEventShareUrl(eventSlug: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com');
  return `${base}/events/${eventSlug}`;
}

/**
 * Validate if a slug is valid
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidEventSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length <= 200;
}

/**
 * Validate if an event code is valid
 * @param code - The code to validate
 * @returns true if valid, false otherwise
 */
export function isValidEventCode(code: string): boolean {
  return /^EVT-\d{5}-[A-Z0-9]{6}$/.test(code);
}

/**
 * Create a unique slug by appending a timestamp/random suffix if needed
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function makeSlugUnique(baseSlug: string, existingSlugs: string[] = []): string {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug) && counter < 100) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
