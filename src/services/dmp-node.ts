/**
 * DMP Protocol - Main Node
 *
 * The primary entry point for running a DMP node.
 * Orchestrates storage, database, networking, and services.
 * Implements Section 1.4 (High-Level Architecture).
 */

import type { DMPConfig, Listing, Review, SyncStatus, KeyPair } from '../models/types';
import { DEFAULT_CONFIG } from '../models/types';
import { generateKeyPair } from '../crypto';
import { MemoryStorageProvider, type StorageProvider } from '../storage';
import { MemoryDatabaseProvider, type DatabaseProvider } from '../db';
import { LocalNetworkProvider, type NetworkProvider } from '../network';
import { ListingService, type CreateListingParams } from './listing-service';
import { ReviewService, type CreateReviewParams } from './review-service';
import { BrowsingService } from './browsing-service';

export interface DMPNodeOptions {
  config?: Partial<DMPConfig>;
  storage?: StorageProvider;
  database?: DatabaseProvider;
  network?: NetworkProvider;
}

/**
 * A DMP protocol node.
 * Every client app acts as a node, participating in storage, replication, and distribution.
 */
export class DMPNode {
  readonly config: DMPConfig;
  readonly storage: StorageProvider;
  readonly database: DatabaseProvider;
  readonly network: NetworkProvider;
  readonly listings: ListingService;
  readonly reviews: ReviewService;
  readonly browsing: BrowsingService;

  private _started = false;

  constructor(options: DMPNodeOptions = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options.config };

    // Initialize layers (use defaults if not provided)
    this.storage = options.storage || new MemoryStorageProvider();
    this.database = options.database || new MemoryDatabaseProvider();
    this.network = options.network || new LocalNetworkProvider(this.config);

    // Initialize services
    this.listings = new ListingService(this.storage, this.database, this.config);
    this.reviews = new ReviewService(this.storage, this.database);
    this.browsing = new BrowsingService(this.database, this.reviews);
  }

  /**
   * Starts the node: initializes networking and begins sync.
   * Section 3.1: Bootstrap, DB setup, sync process.
   */
  async start(): Promise<void> {
    if (this._started) return;

    // Start networking
    await this.network.start();

    // Request initial sync
    await this.network.requestSync();

    this._started = true;
  }

  /**
   * Stops the node gracefully.
   */
  async stop(): Promise<void> {
    if (!this._started) return;

    await this.network.stop();
    await this.database.close();

    this._started = false;
  }

  /**
   * Generate a new identity (key pair) for use as a seller or reviewer.
   */
  generateIdentity(): KeyPair {
    return generateKeyPair();
  }

  /**
   * Create a new listing.
   */
  async createListing(params: CreateListingParams): Promise<Listing> {
    const listing = await this.listings.createListing(params);
    await this.network.broadcastListing(listing);
    return listing;
  }

  /**
   * Update an existing persistent listing.
   */
  async updateListing(
    previousCid: string,
    params: Omit<CreateListingParams, 'mode' | 'previousId'>
  ): Promise<Listing> {
    const listing = await this.listings.updateListing(previousCid, params);
    await this.network.broadcastListing(listing);
    return listing;
  }

  /**
   * Re-post an expired ephemeral listing.
   */
  async repostListing(
    originalCid: string,
    params: Omit<CreateListingParams, 'mode' | 'originalId'>
  ): Promise<Listing> {
    const listing = await this.listings.repostListing(originalCid, params);
    await this.network.broadcastListing(listing);
    return listing;
  }

  /**
   * Submit a review.
   */
  async submitReview(params: CreateReviewParams): Promise<Review> {
    const review = await this.reviews.createReview(params);
    await this.network.broadcastReview(review);
    return review;
  }

  /**
   * Get current sync/node status.
   */
  async getStatus(): Promise<SyncStatus> {
    const counts = await this.database.getCounts();
    const status = this.network.getStatus();
    return {
      ...status,
      listingCount: counts.listings,
      reviewCount: counts.reviews,
    };
  }

  /**
   * Prune expired ephemeral listings.
   */
  async pruneExpired(olderThanDays: number = 7): Promise<number> {
    return this.browsing.pruneExpired(olderThanDays);
  }

  get isStarted(): boolean {
    return this._started;
  }
}
