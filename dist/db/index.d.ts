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
    getCounts(): Promise<{
        listings: number;
        reviews: number;
    }>;
    /** Prune expired ephemeral listings older than given days */
    pruneExpired(olderThanDays: number): Promise<number>;
    /** Close the database */
    close(): Promise<void>;
}
/**
 * In-memory database provider for testing and development.
 * Implements all query operations with client-side filtering.
 */
export declare class MemoryDatabaseProvider implements DatabaseProvider {
    private listings;
    private reviews;
    putListing(listing: Listing): Promise<void>;
    getListing(id: string): Promise<Listing | null>;
    queryListings(query: ListingQuery): Promise<Listing[]>;
    deleteListing(id: string): Promise<void>;
    putReview(review: Review): Promise<void>;
    getReview(id: string): Promise<Review | null>;
    queryReviews(query: ReviewQuery): Promise<Review[]>;
    deleteReview(id: string): Promise<void>;
    getCounts(): Promise<{
        listings: number;
        reviews: number;
    }>;
    pruneExpired(olderThanDays: number): Promise<number>;
    close(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map