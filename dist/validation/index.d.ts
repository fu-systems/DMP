/**
 * DMP Protocol - JSON Schema Validation
 *
 * Validates listings and reviews against the protocol schemas.
 * Uses AJV for JSON Schema Draft 2020-12 compliance.
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Validates a listing object against the DMP listing schema.
 */
export declare function validateListing(listing: unknown): ValidationResult;
/**
 * Validates a review object against the DMP review schema.
 */
export declare function validateReview(review: unknown): ValidationResult;
/**
 * Sanitizes HTML content in listing descriptions.
 * Allows basic formatting tags only.
 */
export declare function sanitizeDescription(html: string): string;
/**
 * Checks if a listing has exceeded its size limit (2KB).
 */
export declare function checkSizeLimit(data: unknown, maxBytes?: number): ValidationResult;
//# sourceMappingURL=index.d.ts.map