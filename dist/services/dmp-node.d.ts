/**
 * DMP Protocol - Main Node
 *
 * The primary entry point for running a DMP node.
 * Orchestrates storage, database, networking, and services.
 * Implements Section 1.4 (High-Level Architecture).
 */
import type { DMPConfig, Listing, Review, SyncStatus, KeyPair } from '../models/types';
import { type StorageProvider } from '../storage';
import { type DatabaseProvider } from '../db';
import { type NetworkProvider } from '../network';
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
export declare class DMPNode {
    readonly config: DMPConfig;
    readonly storage: StorageProvider;
    readonly database: DatabaseProvider;
    readonly network: NetworkProvider;
    readonly listings: ListingService;
    readonly reviews: ReviewService;
    readonly browsing: BrowsingService;
    private _started;
    constructor(options?: DMPNodeOptions);
    /**
     * Starts the node: initializes networking and begins sync.
     * Section 3.1: Bootstrap, DB setup, sync process.
     */
    start(): Promise<void>;
    /**
     * Stops the node gracefully.
     */
    stop(): Promise<void>;
    /**
     * Generate a new identity (key pair) for use as a seller or reviewer.
     */
    generateIdentity(): KeyPair;
    /**
     * Create a new listing.
     */
    createListing(params: CreateListingParams): Promise<Listing>;
    /**
     * Update an existing persistent listing.
     */
    updateListing(previousCid: string, params: Omit<CreateListingParams, 'mode' | 'previousId'>): Promise<Listing>;
    /**
     * Re-post an expired ephemeral listing.
     */
    repostListing(originalCid: string, params: Omit<CreateListingParams, 'mode' | 'originalId'>): Promise<Listing>;
    /**
     * Submit a review.
     */
    submitReview(params: CreateReviewParams): Promise<Review>;
    /**
     * Get current sync/node status.
     */
    getStatus(): Promise<SyncStatus>;
    /**
     * Prune expired ephemeral listings.
     */
    pruneExpired(olderThanDays?: number): Promise<number>;
    get isStarted(): boolean;
}
//# sourceMappingURL=dmp-node.d.ts.map