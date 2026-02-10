/**
 * DMP Protocol - Distributed Marketplace Protocol
 *
 * A censorship-resistant, peer-to-peer protocol for creating,
 * distributing, and browsing decentralized marketplace listings.
 *
 * @version 1.0.0
 */

// Core types
export * from './models/types';

// Cryptographic operations
export {
  generateKeyPair,
  derivePublicKey,
  sortKeys,
  hashObject,
  sign,
  verify,
  signListing,
  verifyListing,
  signReview,
  verifyReview,
  proofOfWork,
  verifyProofOfWork,
} from './crypto';

// Validation
export {
  validateListing,
  validateReview,
  sanitizeDescription,
  checkSizeLimit,
  type ValidationResult,
} from './validation';

// Storage layer
export { type StorageProvider, MemoryStorageProvider } from './storage';

// Database layer
export { type DatabaseProvider, MemoryDatabaseProvider } from './db';

// Network layer
export {
  type NetworkProvider,
  LocalNetworkProvider,
  SyncMessageType,
  type SyncMessage,
  type DBManifest,
} from './network';

// Services
export {
  ListingService,
  ReviewService,
  BrowsingService,
  DMPNode,
  type CreateListingParams,
  type CreateReviewParams,
  type BrowseResult,
  type DMPNodeOptions,
} from './services';
