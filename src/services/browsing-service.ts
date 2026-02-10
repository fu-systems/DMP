/**
 * DMP Protocol - Browsing and Query Service
 *
 * Client-side browsing, searching, and filtering of listings.
 * Implements Section 3.3 (Browsing and Querying) of the specification.
 */

import type { Listing, Review, ListingQuery, ReviewQuery, ReputationSummary } from '../models/types';
import type { DatabaseProvider } from '../db';
import { verifyListing } from '../crypto';
import { ReviewService } from './review-service';

export interface BrowseResult {
  listings: Listing[];
  total: number;
  hasMore: boolean;
}

export class BrowsingService {
  constructor(
    private db: DatabaseProvider,
    private reviewService: ReviewService
  ) {}

  /**
   * Browse active ephemeral listings.
   * Section 3.3: { mode: 'ephemeral', expiration: { $gt: Date.now() } }
   */
  async browseEphemeral(
    options: { categories?: string[]; searchTerm?: string; limit?: number; offset?: number } = {}
  ): Promise<BrowseResult> {
    const query: ListingQuery = {
      mode: 'ephemeral',
      activeOnly: true,
      ...options,
    };
    return this.executeQuery(query);
  }

  /**
   * Browse persistent listings by seller.
   * Section 3.3: { seller.id: 'key', mode: 'persistent' }
   */
  async browsePersistentBySeller(
    sellerId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<BrowseResult> {
    const query: ListingQuery = {
      mode: 'persistent',
      sellerId,
      ...options,
    };
    return this.executeQuery(query);
  }

  /**
   * Full-text search across listings.
   * Section 3.3: Integrate local indexer.
   */
  async search(
    term: string,
    options: { mode?: 'persistent' | 'ephemeral'; activeOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<BrowseResult> {
    const query: ListingQuery = {
      searchTerm: term,
      activeOnly: options.activeOnly !== false,
      ...options,
    };
    return this.executeQuery(query);
  }

  /**
   * Browse listings filtered by category.
   */
  async browseByCategory(
    categories: string[],
    options: { mode?: 'persistent' | 'ephemeral'; activeOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<BrowseResult> {
    const query: ListingQuery = {
      categories,
      activeOnly: options.activeOnly !== false,
      ...options,
    };
    return this.executeQuery(query);
  }

  /**
   * Browse listings with minimum seller reputation.
   * Fetches all listings, then filters by seller reputation.
   */
  async browseByReputation(
    minReputation: number,
    options: { mode?: 'persistent' | 'ephemeral'; activeOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<BrowseResult> {
    const allListings = await this.db.queryListings({
      activeOnly: options.activeOnly !== false,
      mode: options.mode,
    });

    // Group by seller and calculate reputation
    const sellerIds = [...new Set(allListings.map((l) => l.seller.id))];
    const reputations = new Map<string, ReputationSummary>();

    for (const sellerId of sellerIds) {
      const rep = await this.reviewService.calculateReputation(sellerId);
      reputations.set(sellerId, rep);
    }

    // Filter by reputation
    const filtered = allListings.filter((l) => {
      const rep = reputations.get(l.seller.id);
      return rep && rep.averageScore >= minReputation && rep.totalReviews > 0;
    });

    const offset = options.offset || 0;
    const limit = options.limit || 50;
    const page = filtered.slice(offset, offset + limit);

    return {
      listings: page,
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
    };
  }

  /**
   * Get a single listing by CID, verified.
   */
  async getVerifiedListing(id: string): Promise<Listing | null> {
    const listing = await this.db.getListing(id);
    if (!listing) return null;
    if (!verifyListing(listing)) return null;
    return listing;
  }

  /**
   * Prune expired ephemeral listings.
   * Section 3.3: Client filters expired; optional local delete after 7 days.
   */
  async pruneExpired(olderThanDays: number = 7): Promise<number> {
    return this.db.pruneExpired(olderThanDays);
  }

  private async executeQuery(query: ListingQuery): Promise<BrowseResult> {
    // Get one extra to check hasMore
    const limit = query.limit || 50;
    const extendedQuery = { ...query, limit: limit + 1 };
    const results = await this.db.queryListings(extendedQuery);

    const hasMore = results.length > limit;
    const page = hasMore ? results.slice(0, limit) : results;

    return {
      listings: page,
      total: page.length + (hasMore ? 1 : 0), // Approximate; full count requires separate query
      hasMore,
    };
  }
}
