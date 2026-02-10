/**
 * DMP Protocol - Review Service
 *
 * Handles review submission and reputation calculation.
 * Implements Section 3.5 of the DMP specification.
 */
import type { Review, ReputationSummary } from '../models/types';
import type { StorageProvider } from '../storage';
import type { DatabaseProvider } from '../db';
export interface CreateReviewParams {
    sellerId: string;
    listingId?: string;
    score: number;
    comment?: string;
    privateKey: string;
}
export declare class ReviewService {
    private storage;
    private db;
    constructor(storage: StorageProvider, db: DatabaseProvider);
    /**
     * Submits a new review for a seller.
     */
    createReview(params: CreateReviewParams): Promise<Review>;
    /**
     * Calculates the simple average reputation for a seller.
     * Section 3.5: sum(scores) / count
     */
    calculateReputation(sellerId: string, recentDays?: number): Promise<ReputationSummary>;
    /**
     * Calculates weighted reputation using reviewer reputation.
     * Section 3.5: Weighted by reviewer rep (recursive, max depth 3).
     */
    calculateWeightedReputation(sellerId: string, recentDays?: number, maxDepth?: number): Promise<ReputationSummary>;
    /**
     * Internal recursive reputation calculation with depth limit.
     */
    private calculateReputationRecursive;
    /**
     * Gets all reviews for a seller, verified.
     */
    getVerifiedReviews(sellerId: string): Promise<Review[]>;
}
//# sourceMappingURL=review-service.d.ts.map