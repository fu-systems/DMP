/**
 * Tests for DMP Protocol - DMPNode (Integration)
 */

import { DMPNode } from '../src/services/dmp-node';
import { generateKeyPair, verifyListing, verifyReview } from '../src/crypto';

describe('DMPNode', () => {
  let node: DMPNode;

  beforeEach(async () => {
    node = new DMPNode();
    await node.start();
  });

  afterEach(async () => {
    await node.stop();
  });

  describe('lifecycle', () => {
    it('should start and stop', async () => {
      expect(node.isStarted).toBe(true);
      await node.stop();
      expect(node.isStarted).toBe(false);
    });

    it('should not start twice', async () => {
      // Already started in beforeEach
      await node.start(); // Should be no-op
      expect(node.isStarted).toBe(true);
    });
  });

  describe('identity', () => {
    it('should generate identity key pairs', () => {
      const kp = node.generateIdentity();
      expect(kp.privateKey).toHaveLength(64);
      expect(kp.publicKey).toHaveLength(130);
    });
  });

  describe('listings end-to-end', () => {
    it('should create, retrieve, and verify an ephemeral listing', async () => {
      const kp = node.generateIdentity();

      const listing = await node.createListing({
        mode: 'ephemeral',
        title: 'Used Guitar',
        description: '<p>Fender Stratocaster, great condition</p>',
        categories: ['instruments', 'guitars'],
        webpage: 'https://example.com/guitar',
        privateKey: kp.privateKey,
      });

      expect(listing.id).toMatch(/^Qm/);
      expect(listing.mode).toBe('ephemeral');
      expect(listing.expiration).toBeDefined();
      expect(verifyListing(listing)).toBe(true);

      // Retrieve via browsing
      const found = await node.browsing.getVerifiedListing(listing.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe('Used Guitar');
    });

    it('should create and update a persistent listing', async () => {
      const kp = node.generateIdentity();

      const v1 = await node.createListing({
        mode: 'persistent',
        title: 'My Software v1.0',
        version: '1.0.0',
        torrent: {
          magnet: 'magnet:?xt=urn:btih:abcdef1234567890',
          fileHash: 'a'.repeat(64),
        },
        privateKey: kp.privateKey,
      });

      const v2 = await node.updateListing(v1.id, {
        title: 'My Software v2.0',
        version: '2.0.0',
        torrent: {
          magnet: 'magnet:?xt=urn:btih:updated1234567890',
          fileHash: 'b'.repeat(64),
        },
        privateKey: kp.privateKey,
      });

      expect(v2.previousId).toBe(v1.id);
      expect(verifyListing(v2)).toBe(true);

      // Validate the chain
      const chain = await node.listings.validateChain(v2.id);
      expect(chain.valid).toBe(true);
      expect(chain.chain).toHaveLength(2);
    });

    it('should repost an ephemeral listing', async () => {
      const kp = node.generateIdentity();

      const original = await node.createListing({
        mode: 'ephemeral',
        title: 'Free Couch',
        privateKey: kp.privateKey,
      });

      const repost = await node.repostListing(original.id, {
        title: 'Free Couch - Still Available!',
        privateKey: kp.privateKey,
      });

      expect(repost.originalId).toBe(original.id);
      expect(repost.mode).toBe('ephemeral');
      expect(verifyListing(repost)).toBe(true);
    });
  });

  describe('reviews end-to-end', () => {
    it('should submit a review and calculate reputation', async () => {
      const seller = node.generateIdentity();
      const buyer1 = node.generateIdentity();
      const buyer2 = node.generateIdentity();

      // Create a listing first
      await node.createListing({
        mode: 'ephemeral',
        title: 'Item for Sale',
        privateKey: seller.privateKey,
      });

      // Submit reviews
      const review1 = await node.submitReview({
        sellerId: seller.publicKey,
        score: 5,
        comment: 'Excellent seller!',
        privateKey: buyer1.privateKey,
      });

      const review2 = await node.submitReview({
        sellerId: seller.publicKey,
        score: 3,
        comment: 'Okay experience',
        privateKey: buyer2.privateKey,
      });

      expect(verifyReview(review1)).toBe(true);
      expect(verifyReview(review2)).toBe(true);

      // Check reputation
      const rep = await node.reviews.calculateReputation(seller.publicKey);
      expect(rep.averageScore).toBe(4);
      expect(rep.totalReviews).toBe(2);
    });
  });

  describe('browsing', () => {
    it('should browse ephemeral listings', async () => {
      const kp = node.generateIdentity();

      await node.createListing({ mode: 'ephemeral', title: 'Item 1', privateKey: kp.privateKey });
      await node.createListing({ mode: 'ephemeral', title: 'Item 2', privateKey: kp.privateKey });
      await node.createListing({ mode: 'persistent', title: 'Software', version: '1.0.0', privateKey: kp.privateKey });

      const result = await node.browsing.browseEphemeral();
      expect(result.listings).toHaveLength(2);
      result.listings.forEach((l) => expect(l.mode).toBe('ephemeral'));
    });

    it('should search listings', async () => {
      const kp = node.generateIdentity();

      await node.createListing({ mode: 'ephemeral', title: 'Mountain Bike', privateKey: kp.privateKey });
      await node.createListing({ mode: 'ephemeral', title: 'Road Bike', privateKey: kp.privateKey });
      await node.createListing({ mode: 'ephemeral', title: 'Laptop', privateKey: kp.privateKey });

      const result = await node.browsing.search('bike');
      expect(result.listings).toHaveLength(2);
    });

    it('should browse by category', async () => {
      const kp = node.generateIdentity();

      await node.createListing({
        mode: 'ephemeral',
        title: 'Phone',
        categories: ['electronics'],
        privateKey: kp.privateKey,
      });
      await node.createListing({
        mode: 'ephemeral',
        title: 'Bike',
        categories: ['vehicles'],
        privateKey: kp.privateKey,
      });

      const result = await node.browsing.browseByCategory(['electronics']);
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].title).toBe('Phone');
    });

    it('should browse persistent by seller', async () => {
      const seller1 = node.generateIdentity();
      const seller2 = node.generateIdentity();

      await node.createListing({
        mode: 'persistent', title: 'App 1', version: '1.0.0', privateKey: seller1.privateKey,
      });
      await node.createListing({
        mode: 'persistent', title: 'App 2', version: '1.0.0', privateKey: seller2.privateKey,
      });

      const result = await node.browsing.browsePersistentBySeller(seller1.publicKey);
      expect(result.listings).toHaveLength(1);
    });
  });

  describe('status', () => {
    it('should report node status', async () => {
      const kp = node.generateIdentity();
      await node.createListing({ mode: 'ephemeral', title: 'Test', privateKey: kp.privateKey });

      const status = await node.getStatus();
      expect(status.listingCount).toBe(1);
      expect(status.reviewCount).toBe(0);
      expect(status.lastSync).toBeDefined();
    });
  });

  describe('pruning', () => {
    it('should prune expired listings', async () => {
      // Directly inject an old expired listing
      const kp = node.generateIdentity();
      const expired = {
        id: 'QmExpired1234567890123456789012345678901234',
        mode: 'ephemeral' as const,
        title: 'Old Item',
        seller: { id: kp.publicKey },
        timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        expiration: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        signature: 'dummy',
      };
      await node.database.putListing(expired);

      const pruned = await node.pruneExpired(7);
      expect(pruned).toBe(1);
    });
  });
});
