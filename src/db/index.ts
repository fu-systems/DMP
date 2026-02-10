/**
 * DMP Protocol - Database Layer
 *
 * Provides querying and persistence for listings and reviews.
 * Implements Section 1.4 (Database Layer) and Section 3.3 (Browsing and Querying).
 */

import type { Listing, Review, ListingQuery, ReviewQuery } from '../models/types';

/**
 * Abstract database provider interface.
 * Implementations should wrap OrbitDB, RxDB, or compatible distributed DB.
 */
export interface DatabaseProvider {
  /** Store a listing */
  putListing(listing: Listing): Promise<void>;
  /** Retrieve a listing by CID */
  getListing(id: string): Promise<Listing | null>;
  /** Query listings with filters */
  queryListings(query: ListingQuery): Promise<Listing[]>;
  /** Delete a listing by CID */
  deleteListing(id: string): Promise<void>;
  /** Store a review */
  putReview(review: Review): Promise<void>;
  /** Retrieve a review by CID */
  getReview(id: string): Promise<Review | null>;
  /** Query reviews with filters */
  queryReviews(query: ReviewQuery): Promise<Review[]>;
  /** Delete a review by CID */
  deleteReview(id: string): Promise<void>;
  /** Get total counts */
  getCounts(): Promise<{ listings: number; reviews: number }>;
  /** Prune expired ephemeral listings older than given days */
  pruneExpired(olderThanDays: number): Promise<number>;
  /** Close the database */
  close(): Promise<void>;
}

/**
 * In-memory database provider for testing and development.
 * Implements all query operations with client-side filtering.
 */
export class MemoryDatabaseProvider implements DatabaseProvider {
  private listings = new Map<string, Listing>();
  private reviews = new Map<string, Review>();

  async putListing(listing: Listing): Promise<void> {
    this.listings.set(listing.id, { ...listing });
  }

  async getListing(id: string): Promise<Listing | null> {
    return this.listings.get(id) || null;
  }

  async queryListings(query: ListingQuery): Promise<Listing[]> {
    let results = Array.from(this.listings.values());

    if (query.mode) {
      results = results.filter((l) => l.mode === query.mode);
    }

    if (query.sellerId) {
      results = results.filter((l) => l.seller.id === query.sellerId);
    }

    if (query.categories && query.categories.length > 0) {
      results = results.filter(
        (l) =>
          l.categories &&
          query.categories!.some((c) => l.categories!.includes(c))
      );
    }

    if (query.activeOnly) {
      const now = new Date().toISOString();
      results = results.filter((l) => {
        if (l.mode === 'ephemeral' && l.expiration) {
          return l.expiration > now;
        }
        return true;
      });
    }

    if (query.searchTerm) {
      const term = query.searchTerm.toLowerCase();
      results = results.filter(
        (l) =>
          l.title.toLowerCase().includes(term) ||
          (l.description && l.description.toLowerCase().includes(term))
      );
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || results.length;
    results = results.slice(offset, offset + limit);

    return results;
  }

  async deleteListing(id: string): Promise<void> {
    this.listings.delete(id);
  }

  async putReview(review: Review): Promise<void> {
    this.reviews.set(review.id, { ...review });
  }

  async getReview(id: string): Promise<Review | null> {
    return this.reviews.get(id) || null;
  }

  async queryReviews(query: ReviewQuery): Promise<Review[]> {
    let results = Array.from(this.reviews.values());

    if (query.sellerId) {
      results = results.filter((r) => r.sellerId === query.sellerId);
    }

    if (query.listingId) {
      results = results.filter((r) => r.listingId === query.listingId);
    }

    if (query.reviewerId) {
      results = results.filter((r) => r.reviewer.id === query.reviewerId);
    }

    if (query.recentDays) {
      const cutoff = new Date(
        Date.now() - query.recentDays * 24 * 60 * 60 * 1000
      ).toISOString();
      results = results.filter((r) => r.timestamp > cutoff);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || results.length;
    results = results.slice(offset, offset + limit);

    return results;
  }

  async deleteReview(id: string): Promise<void> {
    this.reviews.delete(id);
  }

  async getCounts(): Promise<{ listings: number; reviews: number }> {
    return {
      listings: this.listings.size,
      reviews: this.reviews.size,
    };
  }

  async pruneExpired(olderThanDays: number): Promise<number> {
    const cutoff = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    ).toISOString();
    let pruned = 0;

    for (const [id, listing] of this.listings) {
      if (
        listing.mode === 'ephemeral' &&
        listing.expiration &&
        listing.expiration < cutoff
      ) {
        this.listings.delete(id);
        pruned++;
      }
    }

    return pruned;
  }

  async close(): Promise<void> {
    this.listings.clear();
    this.reviews.clear();
  }
}
