/**
 * DMP Protocol - Listing Service
 *
 * Handles creation, updating, and management of marketplace listings.
 * Implements Section 3.2 of the DMP specification.
 */
import type { Listing, ListingMode, TorrentInfo, DMPConfig } from '../models/types';
import type { StorageProvider } from '../storage';
import type { DatabaseProvider } from '../db';
export interface CreateListingParams {
    mode: ListingMode;
    title: string;
    description?: string;
    torrent?: TorrentInfo;
    webpage?: string;
    categories?: string[];
    version?: string;
    privateKey: string;
    previousId?: string;
    originalId?: string;
}
export declare class ListingService {
    private storage;
    private db;
    private config;
    constructor(storage: StorageProvider, db: DatabaseProvider, config?: DMPConfig);
    /**
     * Creates a new listing following the protocol algorithm (Section 3.2):
     * 1. Build JSON with mode, timestamp, expiration
     * 2. Set previousId/originalId for updates/re-posts
     * 3. Sort keys, stringify, SHA-256 hash
     * 4. Sign hash (DER format)
     * 5. Add to IPFS -> get CID -> set id
     * 6. Validate schema
     * 7. Store in DB
     */
    createListing(params: CreateListingParams): Promise<Listing>;
    /**
     * Creates an update to an existing persistent listing.
     * Validates the chain (same seller, valid previous listing).
     */
    updateListing(previousCid: string, params: Omit<CreateListingParams, 'mode' | 'previousId'>): Promise<Listing>;
    /**
     * Re-posts an ephemeral listing (creates a new one referencing the original).
     */
    repostListing(originalCid: string, params: Omit<CreateListingParams, 'mode' | 'originalId'>): Promise<Listing>;
    /**
     * Validates the update chain for a persistent listing.
     * Traverses previousId links, ensuring all are valid and from the same seller.
     */
    validateChain(listingId: string): Promise<{
        valid: boolean;
        chain: Listing[];
    }>;
    /**
     * Checks the rate limit for a seller (max listings per day).
     */
    private checkRateLimit;
}
//# sourceMappingURL=listing-service.d.ts.map