import sanitizeHtml from 'sanitize-html';

/**
 * Configuration for allowed HTML tags and attributes.
 * This whitelist defines the safe subset of HTML that can be used in template fields.
 */
const ALLOWED_TAGS = [
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'p',
  'br',
  'a',
  'span',
];

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'title', 'target', 'rel'],
  span: ['class'],
};

const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

/**
 * Sanitizes HTML content by removing all unsafe tags, attributes, and scripts.
 * Only the tags and attributes defined in ALLOWED_TAGS and ALLOWED_ATTRIBUTES are preserved.
 * 
 * @param input - The HTML string to sanitize. Can be null or undefined.
 * @returns The sanitized HTML string. Returns empty string if input is null/undefined.
 * 
 * @example
 * ```ts
 * const safe = sanitizeHtml('<strong>Bold</strong><script>alert("XSS")</script>');
 * // Returns: '<strong>Bold</strong>'
 * ```
 */
export function sanitizeTemplateHtml(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto'],
    },
    // Disallow iframe and similar embedding tags
    disallowedTagsMode: 'discard',
    // Enforce that links are safe
    transformTags: {
      a: (tagName, attribs) => {
        // Add rel="noopener noreferrer" to external links for security
        const href = attribs.href || '';
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return {
            tagName,
            attribs: {
              ...attribs,
              rel: 'noopener noreferrer',
              target: attribs.target || '_blank',
            },
          };
        }
        return { tagName, attribs };
      },
    },
  });
}

/**
 * Strips all HTML tags from the input, leaving only plain text.
 * Useful for contexts where only plain text should be displayed (e.g., search results, notifications).
 * 
 * @param input - The HTML string to strip. Can be null or undefined.
 * @returns The plain text without any HTML tags. Returns empty string if input is null/undefined.
 * 
 * @example
 * ```ts
 * const plain = stripHtmlTags('<strong>Bold</strong> text');
 * // Returns: 'Bold text'
 * ```
 */
export function stripHtmlTags(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}
