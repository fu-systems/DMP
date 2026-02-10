"use strict";
/**
 * DMP Protocol - P2P Networking Layer
 *
 * Provides abstractions for libp2p-based peer-to-peer networking,
 * PubSub messaging, and synchronization.
 * Implements Sections 3.1 (Network Init & Sync) and 1.4 (Distribution Layer).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalNetworkProvider = exports.SyncMessageType = void 0;
const types_1 = require("../models/types");
/** Message types for P2P sync */
var SyncMessageType;
(function (SyncMessageType) {
    /** Announce a new listing */
    SyncMessageType["NEW_LISTING"] = "NEW_LISTING";
    /** Announce a new review */
    SyncMessageType["NEW_REVIEW"] = "NEW_REVIEW";
    /** Request DB manifest for initial sync */
    SyncMessageType["REQUEST_MANIFEST"] = "REQUEST_MANIFEST";
    /** Respond with DB manifest */
    SyncMessageType["MANIFEST_RESPONSE"] = "MANIFEST_RESPONSE";
    /** Request specific entries by CID */
    SyncMessageType["REQUEST_ENTRIES"] = "REQUEST_ENTRIES";
    /** Respond with requested entries */
    SyncMessageType["ENTRIES_RESPONSE"] = "ENTRIES_RESPONSE";
})(SyncMessageType || (exports.SyncMessageType = SyncMessageType = {}));
/**
 * Local-only network provider for testing and single-node development.
 * Implements the network interface without actual P2P connectivity.
 */
class LocalNetworkProvider {
    config;
    handlers = new Map();
    status = {
        peerCount: 0,
        listingCount: 0,
        reviewCount: 0,
        lastSync: null,
        isSyncing: false,
    };
    constructor(config = types_1.DEFAULT_CONFIG) {
        this.config = config;
    }
    async start() {
        this.status.lastSync = new Date().toISOString();
        this.emit('started', {});
    }
    async stop() {
        this.emit('stopped', {});
    }
    getStatus() {
        return { ...this.status };
    }
    on(event, handler) {
        const existing = this.handlers.get(event) || [];
        existing.push(handler);
        this.handlers.set(event, existing);
    }
    async broadcastListing(listing) {
        this.status.listingCount++;
        this.emit('listing:new', listing);
    }
    async broadcastReview(review) {
        this.status.reviewCount++;
        this.emit('review:new', review);
    }
    async requestSync() {
        this.status.isSyncing = true;
        this.status.lastSync = new Date().toISOString();
        this.status.isSyncing = false;
        this.emit('sync:complete', {});
    }
    emit(event, data) {
        const handlers = this.handlers.get(event) || [];
        for (const handler of handlers) {
            handler(event, data);
        }
    }
    /** Update counts (used by the DMP node) */
    updateCounts(listings, reviews) {
        this.status.listingCount = listings;
        this.status.reviewCount = reviews;
    }
}
exports.LocalNetworkProvider = LocalNetworkProvider;
//# sourceMappingURL=index.js.map