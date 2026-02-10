"use strict";
/**
 * DMP Protocol - Main Node
 *
 * The primary entry point for running a DMP node.
 * Orchestrates storage, database, networking, and services.
 * Implements Section 1.4 (High-Level Architecture).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DMPNode = void 0;
const types_1 = require("../models/types");
const crypto_1 = require("../crypto");
const storage_1 = require("../storage");
const db_1 = require("../db");
const network_1 = require("../network");
const listing_service_1 = require("./listing-service");
const review_service_1 = require("./review-service");
const browsing_service_1 = require("./browsing-service");
/**
 * A DMP protocol node.
 * Every client app acts as a node, participating in storage, replication, and distribution.
 */
class DMPNode {
    config;
    storage;
    database;
    network;
    listings;
    reviews;
    browsing;
    _started = false;
    constructor(options = {}) {
        this.config = { ...types_1.DEFAULT_CONFIG, ...options.config };
        // Initialize layers (use defaults if not provided)
        this.storage = options.storage || new storage_1.MemoryStorageProvider();
        this.database = options.database || new db_1.MemoryDatabaseProvider();
        this.network = options.network || new network_1.LocalNetworkProvider(this.config);
        // Initialize services
        this.listings = new listing_service_1.ListingService(this.storage, this.database, this.config);
        this.reviews = new review_service_1.ReviewService(this.storage, this.database);
        this.browsing = new browsing_service_1.BrowsingService(this.database, this.reviews);
    }
    /**
     * Starts the node: initializes networking and begins sync.
     * Section 3.1: Bootstrap, DB setup, sync process.
     */
    async start() {
        if (this._started)
            return;
        // Start networking
        await this.network.start();
        // Request initial sync
        await this.network.requestSync();
        this._started = true;
    }
    /**
     * Stops the node gracefully.
     */
    async stop() {
        if (!this._started)
            return;
        await this.network.stop();
        await this.database.close();
        this._started = false;
    }
    /**
     * Generate a new identity (key pair) for use as a seller or reviewer.
     */
    generateIdentity() {
        return (0, crypto_1.generateKeyPair)();
    }
    /**
     * Create a new listing.
     */
    async createListing(params) {
        const listing = await this.listings.createListing(params);
        await this.network.broadcastListing(listing);
        return listing;
    }
    /**
     * Update an existing persistent listing.
     */
    async updateListing(previousCid, params) {
        const listing = await this.listings.updateListing(previousCid, params);
        await this.network.broadcastListing(listing);
        return listing;
    }
    /**
     * Re-post an expired ephemeral listing.
     */
    async repostListing(originalCid, params) {
        const listing = await this.listings.repostListing(originalCid, params);
        await this.network.broadcastListing(listing);
        return listing;
    }
    /**
     * Submit a review.
     */
    async submitReview(params) {
        const review = await this.reviews.createReview(params);
        await this.network.broadcastReview(review);
        return review;
    }
    /**
     * Get current sync/node status.
     */
    async getStatus() {
        const counts = await this.database.getCounts();
        const status = this.network.getStatus();
        return {
            ...status,
            listingCount: counts.listings,
            reviewCount: counts.reviews,
        };
    }
    /**
     * Prune expired ephemeral listings.
     */
    async pruneExpired(olderThanDays = 7) {
        return this.browsing.pruneExpired(olderThanDays);
    }
    get isStarted() {
        return this._started;
    }
}
exports.DMPNode = DMPNode;
//# sourceMappingURL=dmp-node.js.map