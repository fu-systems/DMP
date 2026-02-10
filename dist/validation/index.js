"use strict";
/**
 * DMP Protocol - JSON Schema Validation
 *
 * Validates listings and reviews against the protocol schemas.
 * Uses AJV for JSON Schema Draft 2020-12 compliance.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateListing = validateListing;
exports.validateReview = validateReview;
exports.sanitizeDescription = sanitizeDescription;
exports.checkSizeLimit = checkSizeLimit;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const listing_schema_json_1 = __importDefault(require("../../schemas/listing.schema.json"));
const review_schema_json_1 = __importDefault(require("../../schemas/review.schema.json"));
const ajv = new ajv_1.default({ allErrors: true, strict: false });
(0, ajv_formats_1.default)(ajv);
const validateListingSchema = ajv.compile(listing_schema_json_1.default);
const validateReviewSchema = ajv.compile(review_schema_json_1.default);
/**
 * Validates a listing object against the DMP listing schema.
 */
function validateListing(listing) {
    const valid = validateListingSchema(listing);
    if (!valid) {
        return {
            valid: false,
            errors: (validateListingSchema.errors || []).map((e) => `${e.instancePath || '/'}: ${e.message || 'unknown error'}`),
        };
    }
    const l = listing;
    const errors = [];
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
function validateReview(review) {
    const valid = validateReviewSchema(review);
    if (!valid) {
        return {
            valid: false,
            errors: (validateReviewSchema.errors || []).map((e) => `${e.instancePath || '/'}: ${e.message || 'unknown error'}`),
        };
    }
    const r = review;
    const errors = [];
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
function sanitizeDescription(html) {
    return (0, sanitize_html_1.default)(html, {
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
function checkSizeLimit(data, maxBytes = 2048) {
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
//# sourceMappingURL=index.js.map