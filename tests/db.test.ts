/**
 * Tests for DMP Protocol - Database Layer
 */

import { MemoryDatabaseProvider } from '../src/db';
import { generateKeyPair, signListing, signReview } from '../src/crypto';
import type { Listing, Review } from '../src/models/types';

function createTestListing(overrides: Partial<Listing> = {}): Listing {
  const kp = generateKeyPair();
  const base: Omit<Listing, 'signature'> = {
    id: `QmTest${Math.random().toString(36).slice(2).padEnd(42, '0').slice(0, 42)}`,
    mode: 'ephemeral',
    title: 'Test Listing',
    seller: { id: kp.publicKey },
    timestamp: new Date().toISOString(),
    expiration: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  } as any;

  const signature = signListing(
    { mode: base.mode, title: base.title, seller: base.seller, timestamp: base.timestamp, expiration: base.expiration },
    kp.privateKey
  );

  return { ...base, signature } as Listing;
}

describe('MemoryDatabaseProvider', () => {
  let db: MemoryDatabaseProvider;

  beforeEach(() => {
    db = new MemoryDatabaseProvider();
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Listing operations', () => {
    it('should store and retrieve a listing', async () => {
      const listing = createTestListing();
      await db.putListing(listing);
      const retrieved = await db.getListing(listing.id);
      expect(retrieved).toEqual(listing);
    });

    it('should return null for non-existent listing', async () => {
      const result = await db.getListing('QmNonExistent1234567890123456789012345678');
      expect(result).toBeNull();
    });

    it('should delete a listing', async () => {
      const listing = createTestListing();
      await db.putListing(listing);
      await db.deleteListing(listing.id);
      const retrieved = await db.getListing(listing.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Listing queries', () => {
    it('should filter by mode', async () => {
      const eph = createTestListing({ mode: 'ephemeral' });
      const per = createTestListing({ mode: 'persistent' });
      delete (per as any).expiration;
      await db.putListing(eph);
      await db.putListing(per);

      const ephResults = await db.queryListings({ mode: 'ephemeral' });
      expect(ephResults).toHaveLength(1);
      expect(ephResults[0].mode).toBe('ephemeral');
    });

    it('should filter by seller', async () => {
      const kp = generateKeyPair();
      const listing = createTestListing({ seller: { id: kp.publicKey } });
      const other = createTestListing();
      await db.putListing(listing);
      await db.putListing(other);

      const results = await db.queryListings({ sellerId: kp.publicKey });
      expect(results).toHaveLength(1);
      expect(results[0].seller.id).toBe(kp.publicKey);
    });

    it('should filter active only (non-expired)', async () => {
      const active = createTestListing({
        expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const expired = createTestListing({
        expiration: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      });
      await db.putListing(active);
      await db.putListing(expired);

      const results = await db.queryListings({ activeOnly: true });
      expect(results).toHaveLength(1);
    });

    it('should search by term in title', async () => {
      const listing = createTestListing({ title: 'Used Bicycle for Sale' });
      const other = createTestListing({ title: 'New Laptop' });
      await db.putListing(listing);
      await db.putListing(other);

      const results = await db.queryListings({ searchTerm: 'bicycle' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Bicycle');
    });

    it('should filter by categories', async () => {
      const listing = createTestListing({ categories: ['electronics', 'phones'] });
      const other = createTestListing({ categories: ['vehicles'] });
      await db.putListing(listing);
      await db.putListing(other);

      const results = await db.queryListings({ categories: ['electronics'] });
      expect(results).toHaveLength(1);
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 10; i++) {
        const listing = createTestListing({ title: `Listing ${i}` });
        await db.putListing(listing);
      }

      const page1 = await db.queryListings({ limit: 3, offset: 0 });
      const page2 = await db.queryListings({ limit: 3, offset: 3 });
      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
      expect(page1[0].id).not.toEqual(page2[0].id);
    });
  });

  describe('Review operations', () => {
    it('should store and retrieve a review', async () => {
      const kp = generateKeyPair();
      const sellerKp = generateKeyPair();
      const review: Review = {
        id: 'QmReview123456789012345678901234567890123456',
        sellerId: sellerKp.publicKey,
        score: 4,
        comment: 'Good!',
        reviewer: { id: kp.publicKey },
        timestamp: new Date().toISOString(),
        signature: 'abcdef',
      };

      await db.putReview(review);
      const retrieved = await db.getReview(review.id);
      expect(retrieved).toEqual(review);
    });

    it('should query reviews by seller', async () => {
      const sellerKp = generateKeyPair();
      const review1: Review = {
        id: 'QmReview1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sellerId: sellerKp.publicKey,
        score: 4,
        reviewer: { id: generateKeyPair().publicKey },
        timestamp: new Date().toISOString(),
        signature: 'sig1',
      };
      const review2: Review = {
        id: 'QmReview2bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        sellerId: generateKeyPair().publicKey,
        score: 3,
        reviewer: { id: generateKeyPair().publicKey },
        timestamp: new Date().toISOString(),
        signature: 'sig2',
      };

      await db.putReview(review1);
      await db.putReview(review2);

      const results = await db.queryReviews({ sellerId: sellerKp.publicKey });
      expect(results).toHaveLength(1);
      expect(results[0].sellerId).toBe(sellerKp.publicKey);
    });

    it('should filter reviews by recent days', async () => {
      const kp = generateKeyPair();
      const recent: Review = {
        id: 'QmRecentaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sellerId: generateKeyPair().publicKey,
        score: 5,
        reviewer: { id: kp.publicKey },
        timestamp: new Date().toISOString(),
        signature: 'sig',
      };
      const old: Review = {
        id: 'QmOlddddddddddddddddddddddddddddddddddddd',
        sellerId: generateKeyPair().publicKey,
        score: 2,
        reviewer: { id: kp.publicKey },
        timestamp: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
        signature: 'sig',
      };

      await db.putReview(recent);
      await db.putReview(old);

      const results = await db.queryReviews({ recentDays: 180 });
      expect(results).toHaveLength(1);
    });
  });

  describe('Maintenance', () => {
    it('should report counts', async () => {
      await db.putListing(createTestListing());
      await db.putListing(createTestListing());
      await db.putReview({
        id: 'QmReviewCountaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sellerId: generateKeyPair().publicKey,
        score: 5,
        reviewer: { id: generateKeyPair().publicKey },
        timestamp: new Date().toISOString(),
        signature: 'sig',
      });

      const counts = await db.getCounts();
      expect(counts.listings).toBe(2);
      expect(counts.reviews).toBe(1);
    });

    it('should prune expired ephemeral listings', async () => {
      const expired = createTestListing({
        mode: 'ephemeral',
        expiration: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const active = createTestListing({
        mode: 'ephemeral',
        expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      await db.putListing(expired);
      await db.putListing(active);

      const pruned = await db.pruneExpired(7);
      expect(pruned).toBe(1);

      const counts = await db.getCounts();
      expect(counts.listings).toBe(1);
    });
  });
});
