/**
 * DMP Protocol - Cryptographic Operations
 *
 * ECDSA SECP256k1 key generation, signing, and verification.
 * Uses the secp256k1 native module for performance.
 */
import type { KeyPair, Listing, Review } from '../models/types';
/**
 * Generates a new ECDSA SECP256k1 key pair.
 */
export declare function generateKeyPair(): KeyPair;
/**
 * Derives the uncompressed public key from a private key.
 */
export declare function derivePublicKey(privateKeyHex: string): string;
/**
 * Sorts object keys recursively for deterministic serialization.
 */
export declare function sortKeys(obj: Record<string, unknown>): Record<string, unknown>;
/**
 * Creates a SHA-256 hash of the canonical JSON representation.
 * The object is sorted by keys and stringified before hashing.
 */
export declare function hashObject(obj: Record<string, unknown>): Buffer;
/**
 * Signs data with an ECDSA SECP256k1 private key.
 * Returns the DER-encoded signature as hex.
 */
export declare function sign(hash: Buffer, privateKeyHex: string): string;
/**
 * Verifies an ECDSA SECP256k1 signature.
 */
export declare function verify(hash: Buffer, signatureHex: string, publicKeyHex: string): boolean;
/**
 * Signs a listing object. Returns the signature hex.
 * The listing must not contain 'id' or 'signature' fields when signing.
 */
export declare function signListing(listing: Omit<Listing, 'id' | 'signature'>, privateKeyHex: string): string;
/**
 * Verifies a listing's signature.
 * Removes 'signature' from the listing, hashes the rest, and verifies.
 */
export declare function verifyListing(listing: Listing): boolean;
/**
 * Signs a review object. Returns the signature hex.
 */
export declare function signReview(review: Omit<Review, 'id' | 'signature'>, privateKeyHex: string): string;
/**
 * Verifies a review's signature.
 */
export declare function verifyReview(review: Review): boolean;
/**
 * Performs Proof-of-Work: finds a nonce such that SHA-256(data + nonce)
 * has the required number of leading zero bits.
 */
export declare function proofOfWork(data: string, difficulty: number): {
    nonce: number;
    hash: string;
};
/**
 * Verifies a Proof-of-Work result.
 */
export declare function verifyProofOfWork(data: string, nonce: number, difficulty: number): boolean;
//# sourceMappingURL=index.d.ts.map