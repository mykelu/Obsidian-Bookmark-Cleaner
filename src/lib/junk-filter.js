/**
 * Logic for identifying "junk" content that should be skipped during bookmark ingestion.
 */

const JUNK_PATTERNS = [
  /domain for sale/i,
  /buy this domain/i,
  /get this domain/i,
  /this domain name is for sale/i,
  /dan\.com/i, // common domain broker
  /godaddy\.com/i // when used in domain-for-sale contexts
];

const TOOL_HOMEPAGE_REGEX = [
  /^https?:\/\/(?:www\.)?chatgpt\.com\/?$/i,
  /^https?:\/\/(?:www\.)?openai\.com\/?$/i,
  /^https?:\/\/(?:www\.)?anthropic\.com\/?$/i,
  /^https?:\/\/(?:www\.)?claude\.ai\/?$/i,
  /^https?:\/\/(?:www\.)?app\.super-productivity\.com\/?$/i,
  /^https?:\/\/(?:www\.)?github\.com\/?$/i,
  /^https?:\/\/(?:www\.)?notion\.so\/?$/i,
  /^https?:\/\/(?:www\.)?slack\.com\/?$/i
];

/**
 * Checks if a URL is a generic tool homepage that should be skipped.
 */
export function isToolHomepage(url) {
  return TOOL_HOMEPAGE_REGEX.some(regex => regex.test(url));
}

/**
 * Checks if the extracted text content indicates a "Domain for Sale" page.
 */
export function isDomainForSale(text) {
  if (!text) return false;
  // Check the first 500 characters to avoid scanning huge documents unnecessarily
  const snippet = text.substring(0, 500);
  return JUNK_PATTERNS.some(regex => regex.test(snippet));
}

/**
 * Combined check for all junk types.
 */
export function isJunk(url, text) {
  if (isToolHomepage(url)) return true;
  if (isDomainForSale(text)) return true;
  return false;
}
