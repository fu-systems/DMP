/**
 * DMP Protocol - P2P Networking Layer
 *
 * Provides abstractions for libp2p-based peer-to-peer networking,
 * PubSub messaging, and synchronization.
 * Implements Sections 3.1 (Network Init & Sync) and 1.4 (Distribution Layer).
 */

import type { Listing, Review, SyncStatus, DMPConfig } from '../models/types';
import { DEFAULT_CONFIG } from '../models/types';

/** Message types for P2P sync */
export enum SyncMessageType {
  /** Announce a new listing */
  NEW_LISTING = 'NEW_LISTING',
  /** Announce a new review */
  NEW_REVIEW = 'NEW_REVIEW',
  /** Request DB manifest for initial sync */
  REQUEST_MANIFEST = 'REQUEST_MANIFEST',
  /** Respond with DB manifest */
  MANIFEST_RESPONSE = 'MANIFEST_RESPONSE',
  /** Request specific entries by CID */
  REQUEST_ENTRIES = 'REQUEST_ENTRIES',
  /** Respond with requested entries */
  ENTRIES_RESPONSE = 'ENTRIES_RESPONSE',
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
export class LocalNetworkProvider implements NetworkProvider {
  private handlers = new Map<string, NetworkEventHandler[]>();
  private status: SyncStatus = {
    peerCount: 0,
    listingCount: 0,
    reviewCount: 0,
    lastSync: null,
    isSyncing: false,
  };

  constructor(private config: DMPConfig = DEFAULT_CONFIG) {}

  async start(): Promise<void> {
    this.status.lastSync = new Date().toISOString();
    this.emit('started', {});
  }

  async stop(): Promise<void> {
    this.emit('stopped', {});
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  on(event: string, handler: NetworkEventHandler): void {
    const existing = this.handlers.get(event) || [];
    existing.push(handler);
    this.handlers.set(event, existing);
  }

  async broadcastListing(listing: Listing): Promise<void> {
    this.status.listingCount++;
    this.emit('listing:new', listing);
  }

  async broadcastReview(review: Review): Promise<void> {
    this.status.reviewCount++;
    this.emit('review:new', review);
  }

  async requestSync(): Promise<void> {
    this.status.isSyncing = true;
    this.status.lastSync = new Date().toISOString();
    this.status.isSyncing = false;
    this.emit('sync:complete', {});
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.handlers.get(event) || [];
    for (const handler of handlers) {
      handler(event, data);
    }
  }

  /** Update counts (used by the DMP node) */
  updateCounts(listings: number, reviews: number): void {
    this.status.listingCount = listings;
    this.status.reviewCount = reviews;
  }
}
