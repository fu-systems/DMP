/**
 * Tests for DMP Protocol - Listing Service, Review Service, Browsing Service
 */

import { ListingService } from '../src/services/listing-service';
import { ReviewService } from '../src/services/review-service';
import { BrowsingService } from '../src/services/browsing-service';
import { MemoryStorageProvider } from '../src/storage';
import { MemoryDatabaseProvider } from '../src/db';
import { generateKeyPair, verifyListing, verifyReview } from '../src/crypto';
import { DEFAULT_CONFIG } from '../src/models/types';

describe('ListingService', () => {
  let storage: MemoryStorageProvider;
  let db: MemoryDatabaseProvider;
  let service: ListingService;

  beforeEach(() => {
    storage = new MemoryStorageProvider();
    db = new MemoryDatabaseProvider();
    service = new ListingService(storage, db, DEFAULT_CONFIG);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('createListing', () => {
    it('should create an ephemeral listing', async () => {
      const kp = generateKeyPair();
      const listing = await service.createListing({
        mode: 'ephemeral',
        title: 'Used Bike',
        description: '<p>Great condition</p>',
        categories: ['marketplace/bikes'],
        privateKey: kp.privateKey,
      });

      expect(listing.id).toMatch(/^Qm/);
      expect(listing.mode).toBe('ephemeral');
      expect(listing.title).toBe('Used Bike');
      expect(listing.seller.id).toBe(kp.publicKey);
      expect(listing.expiration).toBeDefined();
      expect(listing.signature).toBeDefined();
      expect(verifyListing(listing)).toBe(true);
    });

    it('should create a persistent listing', async () => {
      const kp = generateKeyPair();
      const listing = await service.createListing({
        mode: 'persistent',
        title: 'DMP Client v1.0',
        version: '1.0.0',
        privateKey: kp.privateKey,
      });

      expect(listing.mode).toBe('persistent');
      expect(listing.version).toBe('1.0.0');
      expect(listing.expiration).toBeUndefined();
      expect(verifyListing(listing)).toBe(true);
    });

    it('should sanitize HTML in description', async () => {
      const kp = generateKeyPair();
      const listing = await service.createListing({
        mode: 'ephemeral',
        title: 'Test',
        description: '<p>Hello</p><script>alert("xss")</script>',
        privateKey: kp.privateKey,
      });

      expect(listing.description).toBe('<p>Hello</p>');
    });

    it('should truncate title to 100 chars', async () => {
      const kp = generateKeyPair();
      const listing = await service.createListing({
        mode: 'ephemeral',
        title: 'x'.repeat(150),
        privateKey: kp.privateKey,
      });

      expect(listing.title).toHaveLength(100);
    });

    it('should limit categories to 5', async () => {
      const kp = generateKeyPair();
      const listing = await service.createListing({
        mode: 'ephemeral',
        title: 'Test',
        categories: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        privateKey: kp.privateKey,
      });

      expect(listing.categories).toHaveLength(5);
    });

    it('should store listing in storage and database', async () => {
      const kp = generateKeyPair();
      const listing = await service.createListing({
        mode: 'ephemeral',
        title: 'Test',
        privateKey: kp.privateKey,
      });

      const fromStorage = await storage.get(listing.id);
      expect(fromStorage).toBeDefined();

      const fromDb = await db.getListing(listing.id);
      expect(fromDb).toEqual(listing);
    });

    it('should enforce rate limiting', async () => {
      const kp = generateKeyPair();
      const config = { ...DEFAULT_CONFIG, maxListingsPerDay: 2 };
      const limitedService = new ListingService(storage, db, config);

      await limitedService.createListing({ mode: 'ephemeral', title: 'A', privateKey: kp.privateKey });
      await limitedService.createListing({ mode: 'ephemeral', title: 'B', privateKey: kp.privateKey });

      await expect(
        limitedService.createListing({ mode: 'ephemeral', title: 'C', privateKey: kp.privateKey })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('updateListing', () => {
    it('should update a persistent listing', async () => {
      const kp = generateKeyPair();
      const original = await service.createListing({
        mode: 'persistent',
        title: 'DMP Client v1.0',
        version: '1.0.0',
        privateKey: kp.privateKey,
      });

      const updated = await service.updateListing(original.id, {
        title: 'DMP Client v1.1',
        version: '1.1.0',
        privateKey: kp.privateKey,
      });

      expect(updated.previousId).toBe(original.id);
      expect(updated.version).toBe('1.1.0');
      expect(verifyListing(updated)).toBe(true);
    });

    it('should reject updating ephemeral listing', async () => {
      const kp = generateKeyPair();
      const listing = await service.createListing({
        mode: 'ephemeral',
        title: 'Test',
        privateKey: kp.privateKey,
      });

      await expect(
        service.updateListing(listing.id, {
          title: 'Updated',
          privateKey: kp.privateKey,
        })
      ).rejects.toThrow('Can only update persistent listings');
    });

    it('should reject update from different seller', async () => {
      const kp1 = generateKeyPair();
      const kp2 = generateKeyPair();
      const listing = await service.createListing({
        mode: 'persistent',
        title: 'Test',
        version: '1.0.0',
        privateKey: kp1.privateKey,
      });

      await expect(
        service.updateListing(listing.id, {
          title: 'Hijacked',
          version: '2.0.0',
          privateKey: kp2.privateKey,
        })
      ).rejects.toThrow('Only the original seller can update');
    });
  });

  describe('repostListing', () => {
    it('should repost an ephemeral listing', async () => {
      const kp = generateKeyPair();
      const original = await service.createListing({
        mode: 'ephemeral',
        title: 'Used Bike',
        privateKey: kp.privateKey,
      });

      const repost = await service.repostListing(original.id, {
        title: 'Used Bike - Still Available',
        privateKey: kp.privateKey,
      });

      expect(repost.originalId).toBe(original.id);
      expect(repost.mode).toBe('ephemeral');
      expect(verifyListing(repost)).toBe(true);
    });

    it('should reject reposting persistent listing', async () => {
      const kp = generateKeyPair();
      const listing = await service.createListing({
        mode: 'persistent',
        title: 'Software',
        version: '1.0.0',
        privateKey: kp.privateKey,
      });

      await expect(
        service.repostListing(listing.id, {
          title: 'Repost',
          privateKey: kp.privateKey,
        })
      ).rejects.toThrow('Can only re-post ephemeral listings');
    });
  });

  describe('validateChain', () => {
    it('should validate a chain of persistent updates', async () => {
      const kp = generateKeyPair();
      const v1 = await service.createListing({
        mode: 'persistent',
        title: 'App v1',
        version: '1.0.0',
        privateKey: kp.privateKey,
      });
      const v2 = await service.updateListing(v1.id, {
        title: 'App v2',
        version: '2.0.0',
        privateKey: kp.privateKey,
      });

      const result = await service.validateChain(v2.id);
      expect(result.valid).toBe(true);
      expect(result.chain).toHaveLength(2);
      expect(result.chain[0].id).toBe(v1.id);
      expect(result.chain[1].id).toBe(v2.id);
    });
  });
});

describe('ReviewService', () => {
  let storage: MemoryStorageProvider;
  let db: MemoryDatabaseProvider;
  let service: ReviewService;

  beforeEach(() => {
    storage = new MemoryStorageProvider();
    db = new MemoryDatabaseProvider();
    service = new ReviewService(storage, db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('createReview', () => {
    it('should create a valid review', async () => {
      const reviewer = generateKeyPair();
      const seller = generateKeyPair();

      const review = await service.createReview({
        sellerId: seller.publicKey,
        score: 4.5,
        comment: 'Great seller!',
        privateKey: reviewer.privateKey,
      });

      expect(review.id).toMatch(/^Qm/);
      expect(review.sellerId).toBe(seller.publicKey);
      expect(review.score).toBe(4.5);
      expect(review.reviewer.id).toBe(reviewer.publicKey);
      expect(verifyReview(review)).toBe(true);
    });

    it('should reject self-reviews', async () => {
      const kp = generateKeyPair();
      await expect(
        service.createReview({
          sellerId: kp.publicKey,
          score: 5,
          privateKey: kp.privateKey,
        })
      ).rejects.toThrow('Cannot review yourself');
    });

    it('should clamp score to valid range', async () => {
      const reviewer = generateKeyPair();
      const seller = generateKeyPair();

      const review = await service.createReview({
        sellerId: seller.publicKey,
        score: 10,
        privateKey: reviewer.privateKey,
      });

      expect(review.score).toBe(5);
    });

    it('should truncate long comments', async () => {
      const reviewer = generateKeyPair();
      const seller = generateKeyPair();

      const review = await service.createReview({
        sellerId: seller.publicKey,
        score: 3,
        comment: 'x'.repeat(600),
        privateKey: reviewer.privateKey,
      });

      expect(review.comment!.length).toBeLessThanOrEqual(500);
    });
  });

  describe('calculateReputation', () => {
    it('should calculate average reputation', async () => {
      const seller = generateKeyPair();
      const reviewers = [generateKeyPair(), generateKeyPair(), generateKeyPair()];

      for (let i = 0; i < 3; i++) {
        await service.createReview({
          sellerId: seller.publicKey,
          score: i + 3, // 3, 4, 5
          privateKey: reviewers[i].privateKey,
        });
      }

      const rep = await service.calculateReputation(seller.publicKey);
      expect(rep.averageScore).toBe(4);
      expect(rep.totalReviews).toBe(3);
    });

    it('should return zero for seller with no reviews', async () => {
      const seller = generateKeyPair();
      const rep = await service.calculateReputation(seller.publicKey);
      expect(rep.averageScore).toBe(0);
      expect(rep.totalReviews).toBe(0);
    });
  });

  describe('getVerifiedReviews', () => {
    it('should return only verified reviews', async () => {
      const seller = generateKeyPair();
      const reviewer = generateKeyPair();

      await service.createReview({
        sellerId: seller.publicKey,
        score: 4,
        privateKey: reviewer.privateKey,
      });

      const reviews = await service.getVerifiedReviews(seller.publicKey);
      expect(reviews).toHaveLength(1);
    });
  });
});

describe('BrowsingService', () => {
  let storage: MemoryStorageProvider;
  let db: MemoryDatabaseProvider;
  let listingService: ListingService;
  let reviewService: ReviewService;
  let browsing: BrowsingService;

  beforeEach(() => {
    storage = new MemoryStorageProvider();
    db = new MemoryDatabaseProvider();
    listingService = new ListingService(storage, db, DEFAULT_CONFIG);
    reviewService = new ReviewService(storage, db);
    browsing = new BrowsingService(db, reviewService);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('browseEphemeral', () => {
    it('should return active ephemeral listings', async () => {
      const kp = generateKeyPair();
      await listingService.createListing({
        mode: 'ephemeral',
        title: 'Active Listing',
        privateKey: kp.privateKey,
      });

      const result = await browsing.browseEphemeral();
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].mode).toBe('ephemeral');
    });
  });

  describe('search', () => {
    it('should find listings by search term', async () => {
      const kp = generateKeyPair();
      await listingService.createListing({
        mode: 'ephemeral',
        title: 'Mountain Bike for Sale',
        privateKey: kp.privateKey,
      });
      await listingService.createListing({
        mode: 'ephemeral',
        title: 'Laptop Computer',
        privateKey: kp.privateKey,
      });

      const result = await browsing.search('bike');
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].title).toContain('Bike');
    });
  });

  describe('getVerifiedListing', () => {
    it('should return a verified listing', async () => {
      const kp = generateKeyPair();
      const created = await listingService.createListing({
        mode: 'ephemeral',
        title: 'Test',
        privateKey: kp.privateKey,
      });

      const listing = await browsing.getVerifiedListing(created.id);
      expect(listing).toBeDefined();
      expect(listing!.id).toBe(created.id);
    });

    it('should return null for non-existent listing', async () => {
      const listing = await browsing.getVerifiedListing('QmNonExistent1234567890123456789012345678');
      expect(listing).toBeNull();
    });
  });

  describe('pruneExpired', () => {
    it('should prune old expired listings', async () => {
      const kp = generateKeyPair();

      // Create a listing and manually set its expiration in the past
      const listing = await listingService.createListing({
        mode: 'ephemeral',
        title: 'Old Listing',
        privateKey: kp.privateKey,
      });

      // Directly put an expired listing into the DB
      const expiredListing = {
        ...listing,
        id: 'QmExpired1234567890123456789012345678901234',
        expiration: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await db.putListing(expiredListing);

      const pruned = await browsing.pruneExpired(7);
      expect(pruned).toBe(1);
    });
  });
});
