/**
 * DMP Protocol - P2P Networking Layer
 *
 * Provides abstractions for libp2p-based peer-to-peer networking,
 * PubSub messaging, and synchronization.
 * Implements Sections 3.1 (Network Init & Sync) and 1.4 (Distribution Layer).
 */
import type { Listing, Review, SyncStatus, DMPConfig } from '../models/types';
/** Message types for P2P sync */
export declare enum SyncMessageType {
    /** Announce a new listing */
    NEW_LISTING = "NEW_LISTING",
    /** Announce a new review */
    NEW_REVIEW = "NEW_REVIEW",
    /** Request DB manifest for initial sync */
    REQUEST_MANIFEST = "REQUEST_MANIFEST",
    /** Respond with DB manifest */
    MANIFEST_RESPONSE = "MANIFEST_RESPONSE",
    /** Request specific entries by CID */
    REQUEST_ENTRIES = "REQUEST_ENTRIES",
    /** Respond with requested entries */
    ENTRIES_RESPONSE = "ENTRIES_RESPONSE"
}
/** P2P sync message envelope */
export interface SyncMessage {
    type: SyncMessageType;
    payload: unknown;
    sender: string;
    timestamp: string;
}
/** DB manifest for sync negotiation */
export interface DBManifest {
    listingCids: string[];
    reviewCids: string[];
    lastUpdated: string;
}
/** Event handler for network events */
export type NetworkEventHandler = (event: string, data: unknown) => void;
/**
 * Abstract network provider interface.
 * Implementations should wrap libp2p with PubSub.
 */
export interface NetworkProvider {
    /** Start the networking layer */
    start(): Promise<void>;
    /** Stop the networking layer */
    stop(): Promise<void>;
    /** Get current sync status */
    getStatus(): SyncStatus;
    /** Subscribe to network events */
    on(event: string, handler: NetworkEventHandler): void;
    /** Broadcast a new listing to peers */
    broadcastListing(listing: Listing): Promise<void>;
    /** Broadcast a new review to peers */
    broadcastReview(review: Review): Promise<void>;
    /** Request full sync from peers */
    requestSync(): Promise<void>;
}
/**
 * Local-only network provider for testing and single-node development.
 * Implements the network interface without actual P2P connectivity.
 */
export declare class LocalNetworkProvider implements NetworkProvider {
    private config;
    private handlers;
    private status;
    constructor(config?: DMPConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    getStatus(): SyncStatus;
    on(event: string, handler: NetworkEventHandler): void;
    broadcastListing(listing: Listing): Promise<void>;
    broadcastReview(review: Review): Promise<void>;
    requestSync(): Promise<void>;
    private emit;
    /** Update counts (used by the DMP node) */
    updateCounts(listings: number, reviews: number): void;
}
//# sourceMappingURL=index.d.ts.map