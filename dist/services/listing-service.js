"use strict";
/**
 * DMP Protocol - Listing Service
 *
 * Handles creation, updating, and management of marketplace listings.
 * Implements Section 3.2 of the DMP specification.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingService = void 0;
const types_1 = require("../models/types");
const crypto_1 = require("../crypto");
const validation_1 = require("../validation");
class ListingService {
    storage;
    db;
    config;
    constructor(storage, db, config = types_1.DEFAULT_CONFIG) {
        this.storage = storage;
        this.db = db;
        this.config = config;
    }
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
    async createListing(params) {
        const publicKey = (0, crypto_1.derivePublicKey)(params.privateKey);
        const now = new Date().toISOString();
        // Build the unsigned listing
        const unsigned = {
            mode: params.mode,
            title: params.title.slice(0, 100),
            seller: { id: publicKey },
            timestamp: now,
        };
        if (params.description) {
            unsigned.description = (0, validation_1.sanitizeDescription)(params.description);
        }
        if (params.torrent) {
            unsigned.torrent = params.torrent;
        }
        if (params.webpage) {
            unsigned.webpage = params.webpage;
        }
        if (params.categories) {
            unsigned.categories = params.categories.slice(0, 5);
        }
        if (params.version) {
            unsigned.version = params.version;
        }
        // Ephemeral listings get a default expiration
        if (params.mode === 'ephemeral') {
            const expiration = new Date(Date.now() + this.config.ephemeralTTLHours * 60 * 60 * 1000);
            unsigned.expiration = expiration.toISOString();
        }
        // Set chain references
        if (params.previousId) {
            unsigned.previousId = params.previousId;
        }
        if (params.originalId) {
            unsigned.originalId = params.originalId;
        }
        // Check rate limit
        await this.checkRateLimit(publicKey);
        // Sign the listing
        const signature = (0, crypto_1.signListing)(unsigned, params.privateKey);
        // Add to content-addressed storage to get CID
        const listingWithSig = { ...unsigned, signature };
        const cid = await this.storage.add(listingWithSig);
        // Build the final listing with CID
        const listing = {
            ...unsigned,
            id: cid,
            signature,
        };
        // Validate the complete listing
        const validation = (0, validation_1.validateListing)(listing);
        if (!validation.valid) {
            throw new Error(`Invalid listing: ${validation.errors.join(', ')}`);
        }
        // Verify our own signature
        if (!(0, crypto_1.verifyListing)(listing)) {
            throw new Error('Signature verification failed on created listing');
        }
        // Store in database
        await this.db.putListing(listing);
        return listing;
    }
    /**
     * Creates an update to an existing persistent listing.
     * Validates the chain (same seller, valid previous listing).
     */
    async updateListing(previousCid, params) {
        const previous = await this.db.getListing(previousCid);
        if (!previous) {
            throw new Error(`Previous listing ${previousCid} not found`);
        }
        if (previous.mode !== 'persistent') {
            throw new Error('Can only update persistent listings');
        }
        const publicKey = (0, crypto_1.derivePublicKey)(params.privateKey);
        if (previous.seller.id !== publicKey) {
            throw new Error('Only the original seller can update a listing');
        }
        return this.createListing({
            ...params,
            mode: 'persistent',
            previousId: previousCid,
        });
    }
    /**
     * Re-posts an ephemeral listing (creates a new one referencing the original).
     */
    async repostListing(originalCid, params) {
        const original = await this.db.getListing(originalCid);
        if (!original) {
            throw new Error(`Original listing ${originalCid} not found`);
        }
        if (original.mode !== 'ephemeral') {
            throw new Error('Can only re-post ephemeral listings');
        }
        const publicKey = (0, crypto_1.derivePublicKey)(params.privateKey);
        if (original.seller.id !== publicKey) {
            throw new Error('Only the original seller can re-post a listing');
        }
        const rootOriginalId = original.originalId || originalCid;
        return this.createListing({
            ...params,
            mode: 'ephemeral',
            originalId: rootOriginalId,
        });
    }
    /**
     * Validates the update chain for a persistent listing.
     * Traverses previousId links, ensuring all are valid and from the same seller.
     */
    async validateChain(listingId) {
        const chain = [];
        let currentId = listingId;
        while (currentId) {
            const listing = await this.db.getListing(currentId);
            if (!listing) {
                return { valid: false, chain };
            }
            if (!(0, crypto_1.verifyListing)(listing)) {
                return { valid: false, chain };
            }
            if (chain.length > 0 && listing.seller.id !== chain[0].seller.id) {
                return { valid: false, chain };
            }
            chain.push(listing);
            currentId = listing.previousId;
        }
        return { valid: true, chain: chain.reverse() };
    }
    /**
     * Checks the rate limit for a seller (max listings per day).
     */
    async checkRateLimit(sellerId) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentListings = await this.db.queryListings({
            sellerId,
            activeOnly: false,
        });
        const recentCount = recentListings.filter((l) => l.timestamp > oneDayAgo).length;
        if (recentCount >= this.config.maxListingsPerDay) {
            throw new Error(`Rate limit exceeded: maximum ${this.config.maxListingsPerDay} listings per day`);
        }
    }
}
exports.ListingService = ListingService;
//# sourceMappingURL=listing-service.js.map