"use strict";
/**
 * DMP Protocol - Database Layer
 *
 * Provides querying and persistence for listings and reviews.
 * Implements Section 1.4 (Database Layer) and Section 3.3 (Browsing and Querying).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDatabaseProvider = void 0;
/**
 * In-memory database provider for testing and development.
 * Implements all query operations with client-side filtering.
 */
class MemoryDatabaseProvider {
    listings = new Map();
    reviews = new Map();
    async putListing(listing) {
        this.listings.set(listing.id, { ...listing });
    }
    async getListing(id) {
        return this.listings.get(id) || null;
    }
    async queryListings(query) {
        let results = Array.from(this.listings.values());
        if (query.mode) {
            results = results.filter((l) => l.mode === query.mode);
        }
        if (query.sellerId) {
            results = results.filter((l) => l.seller.id === query.sellerId);
        }
        if (query.categories && query.categories.length > 0) {
            results = results.filter((l) => l.categories &&
                query.categories.some((c) => l.categories.includes(c)));
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
            results = results.filter((l) => l.title.toLowerCase().includes(term) ||
                (l.description && l.description.toLowerCase().includes(term)));
        }
        // Sort by timestamp descending (newest first)
        results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        // Pagination
        const offset = query.offset || 0;
        const limit = query.limit || results.length;
        results = results.slice(offset, offset + limit);
        return results;
    }
    async deleteListing(id) {
        this.listings.delete(id);
    }
    async putReview(review) {
        this.reviews.set(review.id, { ...review });
    }
    async getReview(id) {
        return this.reviews.get(id) || null;
    }
    async queryReviews(query) {
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
            const cutoff = new Date(Date.now() - query.recentDays * 24 * 60 * 60 * 1000).toISOString();
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
    async deleteReview(id) {
        this.reviews.delete(id);
    }
    async getCounts() {
        return {
            listings: this.listings.size,
            reviews: this.reviews.size,
        };
    }
    async pruneExpired(olderThanDays) {
        const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
        let pruned = 0;
        for (const [id, listing] of this.listings) {
            if (listing.mode === 'ephemeral' &&
                listing.expiration &&
                listing.expiration < cutoff) {
                this.listings.delete(id);
                pruned++;
            }
        }
        return pruned;
    }
    async close() {
        this.listings.clear();
        this.reviews.clear();
    }
}
exports.MemoryDatabaseProvider = MemoryDatabaseProvider;
//# sourceMappingURL=index.js.map