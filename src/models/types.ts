/**
 * DMP Protocol - Core Type Definitions
 *
 * All data structures as defined in the DMP Protocol Specification v1.0.
 */

/** Listing operational modes */
export type ListingMode = 'persistent' | 'ephemeral';

/** Seller identity */
export interface Seller {
  /** ECDSA public key in uncompressed hex (130 chars) */
  id: string;
  /** Optional Base64-encoded X.509 certificate */
  cert?: string;
}

/** Torrent distribution info */
export interface TorrentInfo {
  /** Magnet URI for BitTorrent download */
  magnet: string;
  /** SHA-256 hash of the distributed file */
  fileHash: string;
}

/** Listing object - represents a marketplace page */
export interface Listing {
  /** IPFS CID - content identifier */
  id: string;
  /** Operational mode: persistent (long-term) or ephemeral (48h) */
  mode: ListingMode;
  /** Listing title (max 100 chars) */
  title: string;
  /** Sanitized HTML description (max 2048 chars) */
  description?: string;
  /** Seller identity */
  seller: Seller;
  /** Optional torrent distribution info */
  torrent?: TorrentInfo;
  /** External webpage URL for payment/details */
  webpage?: string;
  /** Categories (max 5) */
  categories?: string[];
  /** Semantic version for persistent listings */
  version?: string;
  /** ISO 8601 UTC timestamp of creation */
  timestamp: string;
  /** ISO 8601 UTC expiration (required for ephemeral) */
  expiration?: string;
  /** Previous CID for persistent update chains */
  previousId?: string;
  /** Original CID for ephemeral re-posts */
  originalId?: string;
  /** ECDSA signature in hex */
  signature: string;
}

/** Unsigned listing (before signing) */
export type UnsignedListing = Omit<Listing, 'id' | 'signature'>;

/** Reviewer identity */
export interface Reviewer {
  /** ECDSA public key in uncompressed hex (130 chars) */
  id: string;
}

/** Review object - for seller reputation */
export interface Review {
  /** IPFS CID */
  id: string;
  /** Seller's public key being reviewed */
  sellerId: string;
  /** Listing CID this review relates to (optional) */
  listingId?: string;
  /** Rating score (1-5) */
  score: number;
  /** Review comment (max 500 chars) */
  comment?: string;
  /** Reviewer identity */
  reviewer: Reviewer;
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  /** ECDSA signature in hex */
  signature: string;
}

/** Unsigned review (before signing) */
export type UnsignedReview = Omit<Review, 'id' | 'signature'>;

/** ECDSA key pair for seller/reviewer identity */
export interface KeyPair {
  /** Private key as hex string */
  privateKey: string;
  /** Uncompressed public key as hex string (130 chars) */
  publicKey: string;
}

/** Reputation summary for a seller */
export interface ReputationSummary {
  /** Seller public key */
  sellerId: string;
  /** Average score */
  averageScore: number;
  /** Total number of reviews */
  totalReviews: number;
  /** Weighted score (if calculated with reviewer reputation) */
  weightedScore?: number;
}

/** Query filters for browsing listings */
export interface ListingQuery {
  /** Filter by mode */
  mode?: ListingMode;
  /** Filter by seller ID */
  sellerId?: string;
  /** Filter by categories */
  categories?: string[];
  /** Only show non-expired listings */
  activeOnly?: boolean;
  /** Full-text search term */
  searchTerm?: string;
  /** Minimum reputation threshold for seller */
  minReputation?: number;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** Query filters for reviews */
export interface ReviewQuery {
  /** Filter by seller */
  sellerId?: string;
  /** Filter by listing */
  listingId?: string;
  /** Filter by reviewer */
  reviewerId?: string;
  /** Only reviews within this many days */
  recentDays?: number;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** Sync status for P2P networking */
export interface SyncStatus {
  /** Number of connected peers */
  peerCount: number;
  /** Total listings in local DB */
  listingCount: number;
  /** Total reviews in local DB */
  reviewCount: number;
  /** Last sync timestamp */
  lastSync: string | null;
  /** Whether currently syncing */
  isSyncing: boolean;
}

/** Configuration for DMP node */
export interface DMPConfig {
  /** Bootstrap multiaddrs for libp2p */
  bootstrapAddrs: string[];
  /** PubSub topic for sync */
  syncTopic: string;
  /** Maximum listings per day per seller (anti-spam) */
  maxListingsPerDay: number;
  /** PoW difficulty (number of leading zeros) - 0 to disable */
  powDifficulty: number;
  /** Ephemeral listing default TTL in hours */
  ephemeralTTLHours: number;
  /** Auto-seed duration in hours */
  autoSeedHours: number;
  /** Delta sync window in days */
  syncWindowDays: number;
  /** Local database path */
  dbPath: string;
}

/** Default configuration */
export const DEFAULT_CONFIG: DMPConfig = {
  bootstrapAddrs: [
    '/dnsaddr/bootstrap.dmp.org',
  ],
  syncTopic: '/dmp/sync',
  maxListingsPerDay: 5,
  powDifficulty: 0,
  ephemeralTTLHours: 48,
  autoSeedHours: 24,
  syncWindowDays: 30,
  dbPath: './dmp-data',
};
