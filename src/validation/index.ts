/**
 * DMP Protocol - JSON Schema Validation
 *
 * Validates listings and reviews against the protocol schemas.
 * Uses AJV for JSON Schema Draft 2020-12 compliance.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import sanitizeHtml from 'sanitize-html';
import listingSchema from '../../schemas/listing.schema.json';
import reviewSchema from '../../schemas/review.schema.json';
import type { Listing, Review } from '../models/types';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateListingSchema = ajv.compile(listingSchema);
const validateReviewSchema = ajv.compile(reviewSchema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a listing object against the DMP listing schema.
 */
export function validateListing(listing: unknown): ValidationResult {
  const valid = validateListingSchema(listing);
  if (!valid) {
    return {
      valid: false,
      errors: (validateListingSchema.errors || []).map(
        (e) => `${e.instancePath || '/'}: ${e.message || 'unknown error'}`
      ),
    };
  }

  const l = listing as unknown as Listing;
  const errors: string[] = [];

  // Ephemeral listings must have expiration after timestamp
  if (l.mode === 'ephemeral' && l.expiration) {
    const ts = new Date(l.timestamp).getTime();
    const exp = new Date(l.expiration).getTime();
    if (exp <= ts) {
      errors.push('Expiration must be after timestamp for ephemeral listings');
    }
  }

  // Persistent listings should have version
  if (l.mode === 'persistent' && l.previousId && !l.version) {
    errors.push('Persistent listing updates should include a version');
  }

  // Categories validation
  if (l.categories && l.categories.length > 5) {
    errors.push('Maximum 5 categories allowed');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a review object against the DMP review schema.
 */
export function validateReview(review: unknown): ValidationResult {
  const valid = validateReviewSchema(review);
  if (!valid) {
    return {
      valid: false,
      errors: (validateReviewSchema.errors || []).map(
        (e) => `${e.instancePath || '/'}: ${e.message || 'unknown error'}`
      ),
    };
  }

  const r = review as unknown as Review;
  const errors: string[] = [];

  // Reviewer cannot review themselves
  if (r.reviewer.id === r.sellerId) {
    errors.push('Reviewer cannot review themselves');
  }

  // Score must be a valid number
  if (r.score < 1 || r.score > 5) {
    errors.push('Score must be between 1 and 5');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitizes HTML content in listing descriptions.
 * Allows basic formatting tags only.
 */
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'a', 'h3', 'h4'],
    allowedAttributes: {
      a: ['href', 'title'],
    },
    allowedSchemes: ['https'],
  });
}

/**
 * Checks if a listing has exceeded its size limit (2KB).
 */
export function checkSizeLimit(data: unknown, maxBytes: number = 2048): ValidationResult {
  const json = JSON.stringify(data);
  const size = Buffer.byteLength(json, 'utf8');
  if (size > maxBytes) {
    return {
      valid: false,
      errors: [`Data size ${size} bytes exceeds limit of ${maxBytes} bytes`],
    };
  }
  return { valid: true, errors: [] };
}
