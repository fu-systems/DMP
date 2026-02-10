/**
 * Tests for DMP Protocol - Cryptographic Operations
 */

import {
  generateKeyPair,
  derivePublicKey,
  sortKeys,
  hashObject,
  sign,
  verify,
  signListing,
  verifyListing,
  signReview,
  verifyReview,
  proofOfWork,
  verifyProofOfWork,
} from '../src/crypto';
import type { Listing, Review } from '../src/models/types';

describe('Crypto Module', () => {
  describe('generateKeyPair', () => {
    it('should generate a valid key pair', () => {
      const kp = generateKeyPair();
      expect(kp.privateKey).toHaveLength(64); // 32 bytes hex
      expect(kp.publicKey).toHaveLength(130); // 65 bytes uncompressed hex
      expect(kp.publicKey).toMatch(/^04/); // uncompressed prefix
    });

    it('should generate unique key pairs', () => {
      const kp1 = generateKeyPair();
      const kp2 = generateKeyPair();
      expect(kp1.privateKey).not.toEqual(kp2.privateKey);
      expect(kp1.publicKey).not.toEqual(kp2.publicKey);
    });
  });

  describe('derivePublicKey', () => {
    it('should derive the correct public key from a private key', () => {
      const kp = generateKeyPair();
      const derived = derivePublicKey(kp.privateKey);
      expect(derived).toEqual(kp.publicKey);
    });
  });

  describe('sortKeys', () => {
    it('should sort top-level keys alphabetically', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const sorted = sortKeys(obj);
      expect(Object.keys(sorted)).toEqual(['a', 'm', 'z']);
    });

    it('should sort nested object keys recursively', () => {
      const obj = { b: { z: 1, a: 2 }, a: 1 };
      const sorted = sortKeys(obj);
      expect(Object.keys(sorted)).toEqual(['a', 'b']);
      expect(Object.keys(sorted['b'] as Record<string, unknown>)).toEqual(['a', 'z']);
    });

    it('should not sort arrays', () => {
      const obj = { items: [3, 1, 2] };
      const sorted = sortKeys(obj);
      expect(sorted['items']).toEqual([3, 1, 2]);
    });
  });

  describe('hashObject', () => {
    it('should produce consistent hashes for the same object', () => {
      const obj = { foo: 'bar', baz: 42 };
      const h1 = hashObject(obj);
      const h2 = hashObject(obj);
      expect(h1).toEqual(h2);
    });

    it('should produce the same hash regardless of key order', () => {
      const obj1 = { a: 1, b: 2 } as Record<string, unknown>;
      const obj2 = { b: 2, a: 1 } as Record<string, unknown>;
      expect(hashObject(obj1)).toEqual(hashObject(obj2));
    });

    it('should produce different hashes for different objects', () => {
      const obj1 = { a: 1 } as Record<string, unknown>;
      const obj2 = { a: 2 } as Record<string, unknown>;
      expect(hashObject(obj1)).not.toEqual(hashObject(obj2));
    });
  });

  describe('sign and verify', () => {
    it('should sign and verify data correctly', () => {
      const kp = generateKeyPair();
      const hash = hashObject({ test: 'data' });
      const signature = sign(hash, kp.privateKey);
      expect(verify(hash, signature, kp.publicKey)).toBe(true);
    });

    it('should fail verification with wrong public key', () => {
      const kp1 = generateKeyPair();
      const kp2 = generateKeyPair();
      const hash = hashObject({ test: 'data' });
      const signature = sign(hash, kp1.privateKey);
      expect(verify(hash, signature, kp2.publicKey)).toBe(false);
    });

    it('should fail verification with tampered data', () => {
      const kp = generateKeyPair();
      const hash1 = hashObject({ test: 'data' });
      const hash2 = hashObject({ test: 'tampered' });
      const signature = sign(hash1, kp.privateKey);
      expect(verify(hash2, signature, kp.publicKey)).toBe(false);
    });

    it('should fail verification with invalid signature', () => {
      const kp = generateKeyPair();
      const hash = hashObject({ test: 'data' });
      expect(verify(hash, 'invalidhex', kp.publicKey)).toBe(false);
    });
  });

  describe('signListing and verifyListing', () => {
    it('should sign and verify a listing', () => {
      const kp = generateKeyPair();
      const unsigned = {
        mode: 'ephemeral' as const,
        title: 'Test Listing',
        seller: { id: kp.publicKey },
        timestamp: new Date().toISOString(),
        expiration: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      };

      const signature = signListing(unsigned, kp.privateKey);
      expect(signature).toMatch(/^[0-9a-f]+$/);

      const listing: Listing = {
        ...unsigned,
        id: 'QmTestCID12345678901234567890123456789012345',
        signature,
      };

      expect(verifyListing(listing)).toBe(true);
    });

    it('should fail verification if listing is tampered', () => {
      const kp = generateKeyPair();
      const unsigned = {
        mode: 'ephemeral' as const,
        title: 'Test Listing',
        seller: { id: kp.publicKey },
        timestamp: new Date().toISOString(),
        expiration: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      };

      const signature = signListing(unsigned, kp.privateKey);
      const listing: Listing = {
        ...unsigned,
        id: 'QmTestCID12345678901234567890123456789012345',
        title: 'TAMPERED TITLE',
        signature,
      };

      expect(verifyListing(listing)).toBe(false);
    });

    it('should fail verification with wrong seller key', () => {
      const kp1 = generateKeyPair();
      const kp2 = generateKeyPair();
      const unsigned = {
        mode: 'ephemeral' as const,
        title: 'Test Listing',
        seller: { id: kp2.publicKey }, // different key
        timestamp: new Date().toISOString(),
        expiration: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      };

      const signature = signListing(unsigned, kp1.privateKey); // signed with kp1
      const listing: Listing = {
        ...unsigned,
        id: 'QmTestCID12345678901234567890123456789012345',
        signature,
      };

      expect(verifyListing(listing)).toBe(false);
    });
  });

  describe('signReview and verifyReview', () => {
    it('should sign and verify a review', () => {
      const kp = generateKeyPair();
      const sellerKp = generateKeyPair();
      const unsigned = {
        sellerId: sellerKp.publicKey,
        score: 4,
        comment: 'Great!',
        reviewer: { id: kp.publicKey },
        timestamp: new Date().toISOString(),
      };

      const signature = signReview(unsigned, kp.privateKey);
      const review: Review = {
        ...unsigned,
        id: 'QmTestCID12345678901234567890123456789012345',
        signature,
      };

      expect(verifyReview(review)).toBe(true);
    });

    it('should fail verification if review is tampered', () => {
      const kp = generateKeyPair();
      const sellerKp = generateKeyPair();
      const unsigned = {
        sellerId: sellerKp.publicKey,
        score: 4,
        reviewer: { id: kp.publicKey },
        timestamp: new Date().toISOString(),
      };

      const signature = signReview(unsigned, kp.privateKey);
      const review: Review = {
        ...unsigned,
        id: 'QmTestCID12345678901234567890123456789012345',
        score: 1, // tampered
        signature,
      };

      expect(verifyReview(review)).toBe(false);
    });
  });

  describe('proofOfWork', () => {
    it('should find a valid nonce for difficulty 1', () => {
      const data = 'test data';
      const result = proofOfWork(data, 1);
      expect(result.hash.startsWith('0')).toBe(true);
      expect(result.nonce).toBeGreaterThanOrEqual(0);
    });

    it('should verify PoW correctly', () => {
      const data = 'test data';
      const result = proofOfWork(data, 1);
      expect(verifyProofOfWork(data, result.nonce, 1)).toBe(true);
    });

    it('should fail PoW verification with wrong nonce', () => {
      const data = 'test data';
      expect(verifyProofOfWork(data, 999999999, 4)).toBe(false);
    });
  });
});
