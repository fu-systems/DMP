/**
 * Tests for DMP Protocol - JSON Schema Validation
 */

import {
  validateListing,
  validateReview,
  sanitizeDescription,
  checkSizeLimit,
} from '../src/validation';
import { generateKeyPair } from '../src/crypto';

describe('Validation Module', () => {
  const kp = generateKeyPair();

  describe('validateListing', () => {
    const validEphemeral = {
      id: 'QmYwAPJzv5CZsnANHRSQB8Dkh1MFoEQGFchNSGhFLnSQ1k',
      mode: 'ephemeral',
      title: 'Test Listing',
      seller: { id: kp.publicKey },
      timestamp: '2026-02-09T12:00:00Z',
      expiration: '2026-02-11T12:00:00Z',
      signature: 'abcdef1234567890',
    };

    const validPersistent = {
      id: 'QmYwAPJzv5CZsnANHRSQB8Dkh1MFoEQGFchNSGhFLnSQ1k',
      mode: 'persistent',
      title: 'Test Software',
      seller: { id: kp.publicKey },
      timestamp: '2026-02-09T12:00:00Z',
      version: '1.0.0',
      signature: 'abcdef1234567890',
    };

    it('should validate a valid ephemeral listing', () => {
      const result = validateListing(validEphemeral);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid persistent listing', () => {
      const result = validateListing(validPersistent);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a listing without required fields', () => {
      const result = validateListing({ id: 'test' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject an ephemeral listing without expiration', () => {
      const listing = { ...validEphemeral };
      delete (listing as any).expiration;
      const result = validateListing(listing);
      expect(result.valid).toBe(false);
    });

    it('should reject a listing with invalid seller id format', () => {
      const listing = { ...validEphemeral, seller: { id: 'invalid' } };
      const result = validateListing(listing);
      expect(result.valid).toBe(false);
    });

    it('should reject a listing with title exceeding max length', () => {
      const listing = { ...validEphemeral, title: 'x'.repeat(101) };
      const result = validateListing(listing);
      expect(result.valid).toBe(false);
    });

    it('should reject a listing with description exceeding max length', () => {
      const listing = { ...validEphemeral, description: 'x'.repeat(2049) };
      const result = validateListing(listing);
      expect(result.valid).toBe(false);
    });

    it('should reject a listing with too many categories', () => {
      const listing = {
        ...validEphemeral,
        categories: ['a', 'b', 'c', 'd', 'e', 'f'],
      };
      const result = validateListing(listing);
      expect(result.valid).toBe(false);
    });

    it('should reject a listing with invalid version format', () => {
      const listing = { ...validPersistent, version: 'v1.0' };
      const result = validateListing(listing);
      expect(result.valid).toBe(false);
    });

    it('should reject a listing with invalid CID format', () => {
      const listing = { ...validEphemeral, id: 'invalidCID' };
      const result = validateListing(listing);
      expect(result.valid).toBe(false);
    });

    it('should warn about expiration before timestamp', () => {
      const listing = {
        ...validEphemeral,
        timestamp: '2026-02-11T12:00:00Z',
        expiration: '2026-02-09T12:00:00Z',
      };
      const result = validateListing(listing);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Expiration must be after timestamp for ephemeral listings'
      );
    });

    it('should validate a listing with optional torrent info', () => {
      const listing = {
        ...validEphemeral,
        torrent: {
          magnet: 'magnet:?xt=urn:btih:abcdef1234567890',
          fileHash: 'a'.repeat(64),
        },
      };
      const result = validateListing(listing);
      expect(result.valid).toBe(true);
    });

    it('should reject a listing with invalid torrent fileHash', () => {
      const listing = {
        ...validEphemeral,
        torrent: {
          magnet: 'magnet:?xt=urn:btih:abcdef1234567890',
          fileHash: 'short',
        },
      };
      const result = validateListing(listing);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateReview', () => {
    const reviewer = generateKeyPair();
    const validReview = {
      id: 'QmYwAPJzv5CZsnANHRSQB8Dkh1MFoEQGFchNSGhFLnSQ1k',
      sellerId: kp.publicKey,
      score: 4,
      comment: 'Great seller!',
      reviewer: { id: reviewer.publicKey },
      timestamp: '2026-02-10T14:00:00Z',
      signature: 'abcdef1234567890',
    };

    it('should validate a valid review', () => {
      const result = validateReview(validReview);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a review without required fields', () => {
      const result = validateReview({ id: 'test' });
      expect(result.valid).toBe(false);
    });

    it('should reject a review with score out of range', () => {
      const review = { ...validReview, score: 6 };
      const result = validateReview(review);
      expect(result.valid).toBe(false);
    });

    it('should reject a review with score below minimum', () => {
      const review = { ...validReview, score: 0 };
      const result = validateReview(review);
      expect(result.valid).toBe(false);
    });

    it('should reject self-reviews', () => {
      const review = {
        ...validReview,
        sellerId: reviewer.publicKey,
        reviewer: { id: reviewer.publicKey },
      };
      const result = validateReview(review);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reviewer cannot review themselves');
    });

    it('should reject a review with comment exceeding max length', () => {
      const review = { ...validReview, comment: 'x'.repeat(501) };
      const result = validateReview(review);
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeDescription', () => {
    it('should allow safe HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      expect(sanitizeDescription(html)).toBe(html);
    });

    it('should strip dangerous script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script>';
      expect(sanitizeDescription(html)).toBe('<p>Hello</p>');
    });

    it('should strip event handlers', () => {
      const html = '<p onclick="alert(1)">Click me</p>';
      expect(sanitizeDescription(html)).toBe('<p>Click me</p>');
    });

    it('should allow https links', () => {
      const html = '<a href="https://example.com">Link</a>';
      expect(sanitizeDescription(html)).toBe(html);
    });

    it('should strip javascript: URLs', () => {
      const html = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeDescription(html);
      expect(result).not.toContain('javascript:');
    });

    it('should strip iframe tags', () => {
      const html = '<iframe src="https://evil.com"></iframe>';
      expect(sanitizeDescription(html)).toBe('');
    });
  });

  describe('checkSizeLimit', () => {
    it('should pass for data within limit', () => {
      const result = checkSizeLimit({ small: 'data' });
      expect(result.valid).toBe(true);
    });

    it('should fail for data exceeding limit', () => {
      const large = { data: 'x'.repeat(3000) };
      const result = checkSizeLimit(large, 2048);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds limit');
    });

    it('should accept custom size limit', () => {
      const data = { test: 'value' };
      const result = checkSizeLimit(data, 10);
      expect(result.valid).toBe(false);
    });
  });
});
