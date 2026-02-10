"use strict";
/**
 * DMP Protocol - Browsing and Query Service
 *
 * Client-side browsing, searching, and filtering of listings.
 * Implements Section 3.3 (Browsing and Querying) of the specification.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowsingService = void 0;
const crypto_1 = require("../crypto");
class BrowsingService {
    db;
    reviewService;
    constructor(db, reviewService) {
        this.db = db;
        this.reviewService = reviewService;
    }
    /**
     * Browse active ephemeral listings.
     * Section 3.3: { mode: 'ephemeral', expiration: { $gt: Date.now() } }
     */
    async browseEphemeral(options = {}) {
        const query = {
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
    async browsePersistentBySeller(sellerId, options = {}) {
        const query = {
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
    async search(term, options = {}) {
        const query = {
            searchTerm: term,
            activeOnly: options.activeOnly !== false,
            ...options,
        };
        return this.executeQuery(query);
    }
    /**
     * Browse listings filtered by category.
     */
    async browseByCategory(categories, options = {}) {
        const query = {
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
    async browseByReputation(minReputation, options = {}) {
        const allListings = await this.db.queryListings({
            activeOnly: options.activeOnly !== false,
            mode: options.mode,
        });
        // Group by seller and calculate reputation
        const sellerIds = [...new Set(allListings.map((l) => l.seller.id))];
        const reputations = new Map();
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
    async getVerifiedListing(id) {
        const listing = await this.db.getListing(id);
        if (!listing)
            return null;
        if (!(0, crypto_1.verifyListing)(listing))
            return null;
        return listing;
    }
    /**
     * Prune expired ephemeral listings.
     * Section 3.3: Client filters expired; optional local delete after 7 days.
     */
    async pruneExpired(olderThanDays = 7) {
        return this.db.pruneExpired(olderThanDays);
    }
    async executeQuery(query) {
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
exports.BrowsingService = BrowsingService;
//# sourceMappingURL=browsing-service.js.map