/**
 * DMP Protocol - Browsing and Query Service
 *
 * Client-side browsing, searching, and filtering of listings.
 * Implements Section 3.3 (Browsing and Querying) of the specification.
 */
import type { Listing } from '../models/types';
import type { DatabaseProvider } from '../db';
import { ReviewService } from './review-service';
export interface BrowseResult {
    listings: Listing[];
    total: number;
    hasMore: boolean;
}
export declare class BrowsingService {
    private db;
    private reviewService;
    constructor(db: DatabaseProvider, reviewService: ReviewService);
    /**
     * Browse active ephemeral listings.
     * Section 3.3: { mode: 'ephemeral', expiration: { $gt: Date.now() } }
     */
    browseEphemeral(options?: {
        categories?: string[];
        searchTerm?: string;
        limit?: number;
        offset?: number;
    }): Promise<BrowseResult>;
    /**
     * Browse persistent listings by seller.
     * Section 3.3: { seller.id: 'key', mode: 'persistent' }
     */
    browsePersistentBySeller(sellerId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<BrowseResult>;
    /**
     * Full-text search across listings.
     * Section 3.3: Integrate local indexer.
     */
    search(term: string, options?: {
        mode?: 'persistent' | 'ephemeral';
        activeOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<BrowseResult>;
    /**
     * Browse listings filtered by category.
     */
    browseByCategory(categories: string[], options?: {
        mode?: 'persistent' | 'ephemeral';
        activeOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<BrowseResult>;
    /**
     * Browse listings with minimum seller reputation.
     * Fetches all listings, then filters by seller reputation.
     */
    browseByReputation(minReputation: number, options?: {
        mode?: 'persistent' | 'ephemeral';
        activeOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<BrowseResult>;
    /**
     * Get a single listing by CID, verified.
     */
    getVerifiedListing(id: string): Promise<Listing | null>;
    /**
     * Prune expired ephemeral listings.
     * Section 3.3: Client filters expired; optional local delete after 7 days.
     */
    pruneExpired(olderThanDays?: number): Promise<number>;
    private executeQuery;
}
//# sourceMappingURL=browsing-service.d.ts.map