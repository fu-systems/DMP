"use strict";
/**
 * DMP Protocol - Review Service
 *
 * Handles review submission and reputation calculation.
 * Implements Section 3.5 of the DMP specification.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const crypto_1 = require("../crypto");
const validation_1 = require("../validation");
class ReviewService {
    storage;
    db;
    constructor(storage, db) {
        this.storage = storage;
        this.db = db;
    }
    /**
     * Submits a new review for a seller.
     */
    async createReview(params) {
        const publicKey = (0, crypto_1.derivePublicKey)(params.privateKey);
        if (publicKey === params.sellerId) {
            throw new Error('Cannot review yourself');
        }
        const unsigned = {
            sellerId: params.sellerId,
            score: Math.max(1, Math.min(5, params.score)),
            reviewer: { id: publicKey },
            timestamp: new Date().toISOString(),
        };
        if (params.listingId) {
            unsigned.listingId = params.listingId;
        }
        if (params.comment) {
            unsigned.comment = params.comment.slice(0, 500);
        }
        // Sign the review
        const signature = (0, crypto_1.signReview)(unsigned, params.privateKey);
        // Add to content-addressed storage
        const reviewWithSig = { ...unsigned, signature };
        const cid = await this.storage.add(reviewWithSig);
        const review = {
            ...unsigned,
            id: cid,
            signature,
        };
        // Validate
        const validation = (0, validation_1.validateReview)(review);
        if (!validation.valid) {
            throw new Error(`Invalid review: ${validation.errors.join(', ')}`);
        }
        // Verify signature
        if (!(0, crypto_1.verifyReview)(review)) {
            throw new Error('Signature verification failed on created review');
        }
        // Store in database
        await this.db.putReview(review);
        return review;
    }
    /**
     * Calculates the simple average reputation for a seller.
     * Section 3.5: sum(scores) / count
     */
    async calculateReputation(sellerId, recentDays = 180) {
        const reviews = await this.db.queryReviews({
            sellerId,
            recentDays,
        });
        // Verify each review signature
        const validReviews = reviews.filter((r) => (0, crypto_1.verifyReview)(r));
        if (validReviews.length === 0) {
            return {
                sellerId,
                averageScore: 0,
                totalReviews: 0,
            };
        }
        const sum = validReviews.reduce((acc, r) => acc + r.score, 0);
        const averageScore = Math.round((sum / validReviews.length) * 10) / 10;
        return {
            sellerId,
            averageScore,
            totalReviews: validReviews.length,
        };
    }
    /**
     * Calculates weighted reputation using reviewer reputation.
     * Section 3.5: Weighted by reviewer rep (recursive, max depth 3).
     */
    async calculateWeightedReputation(sellerId, recentDays = 180, maxDepth = 3) {
        const base = await this.calculateReputation(sellerId, recentDays);
        if (base.totalReviews === 0) {
            return base;
        }
        const reviews = await this.db.queryReviews({
            sellerId,
            recentDays,
        });
        const validReviews = reviews.filter((r) => (0, crypto_1.verifyReview)(r));
        // Calculate reviewer weights
        let weightedSum = 0;
        let totalWeight = 0;
        for (const review of validReviews) {
            let weight = 1.0;
            if (maxDepth > 0) {
                const reviewerRep = await this.calculateReputationRecursive(review.reviewer.id, recentDays, maxDepth - 1);
                // Normalize reviewer rep to a weight (0.5 - 2.0 range)
                if (reviewerRep.totalReviews > 0) {
                    weight = 0.5 + (reviewerRep.averageScore / 5.0) * 1.5;
                }
            }
            weightedSum += review.score * weight;
            totalWeight += weight;
        }
        const weightedScore = totalWeight > 0
            ? Math.round((weightedSum / totalWeight) * 10) / 10
            : base.averageScore;
        return {
            ...base,
            weightedScore,
        };
    }
    /**
     * Internal recursive reputation calculation with depth limit.
     */
    async calculateReputationRecursive(sellerId, recentDays, depth) {
        if (depth <= 0) {
            return this.calculateReputation(sellerId, recentDays);
        }
        return this.calculateWeightedReputation(sellerId, recentDays, depth);
    }
    /**
     * Gets all reviews for a seller, verified.
     */
    async getVerifiedReviews(sellerId) {
        const reviews = await this.db.queryReviews({ sellerId });
        return reviews.filter((r) => (0, crypto_1.verifyReview)(r));
    }
}
exports.ReviewService = ReviewService;
//# sourceMappingURL=review-service.js.map