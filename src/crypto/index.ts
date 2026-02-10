/**
 * DMP Protocol - Cryptographic Operations
 *
 * ECDSA SECP256k1 key generation, signing, and verification.
 * Uses the secp256k1 native module for performance.
 */

import * as crypto from 'crypto';
import * as secp256k1 from 'secp256k1';
import type { KeyPair, Listing, Review } from '../models/types';

/**
 * Generates a new ECDSA SECP256k1 key pair.
 */
export function generateKeyPair(): KeyPair {
  let privateKeyBytes: Uint8Array;
  do {
    privateKeyBytes = crypto.randomBytes(32);
  } while (!secp256k1.privateKeyVerify(privateKeyBytes));

  const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes, false);

  return {
    privateKey: Buffer.from(privateKeyBytes).toString('hex'),
    publicKey: Buffer.from(publicKeyBytes).toString('hex'),
  };
}

/**
 * Derives the uncompressed public key from a private key.
 */
export function derivePublicKey(privateKeyHex: string): string {
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes, false);
  return Buffer.from(publicKeyBytes).toString('hex');
}

/**
 * Sorts object keys recursively for deterministic serialization.
 */
export function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      sorted[key] = sortKeys(val as Record<string, unknown>);
    } else {
      sorted[key] = val;
    }
  }
  return sorted;
}

/**
 * Creates a SHA-256 hash of the canonical JSON representation.
 * The object is sorted by keys and stringified before hashing.
 */
export function hashObject(obj: Record<string, unknown>): Buffer {
  const sorted = sortKeys(obj);
  const json = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(json).digest();
}

/**
 * Signs data with an ECDSA SECP256k1 private key.
 * Returns the DER-encoded signature as hex.
 */
export function sign(hash: Buffer, privateKeyHex: string): string {
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  const sigObj = secp256k1.ecdsaSign(new Uint8Array(hash), new Uint8Array(privateKeyBytes));
  const derSig = secp256k1.signatureExport(sigObj.signature);
  return Buffer.from(derSig).toString('hex');
}

/**
 * Verifies an ECDSA SECP256k1 signature.
 */
export function verify(hash: Buffer, signatureHex: string, publicKeyHex: string): boolean {
  try {
    const sigDer = Buffer.from(signatureHex, 'hex');
    const sigNormalized = secp256k1.signatureImport(new Uint8Array(sigDer));
    const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
    return secp256k1.ecdsaVerify(sigNormalized, new Uint8Array(hash), new Uint8Array(publicKeyBytes));
  } catch {
    return false;
  }
}

/**
 * Signs a listing object. Returns the signature hex.
 * The listing must not contain 'id' or 'signature' fields when signing.
 */
export function signListing(
  listing: Omit<Listing, 'id' | 'signature'>,
  privateKeyHex: string
): string {
  const obj = { ...listing } as Record<string, unknown>;
  delete obj['id'];
  delete obj['signature'];
  const hash = hashObject(obj);
  return sign(hash, privateKeyHex);
}

/**
 * Verifies a listing's signature.
 * Removes 'signature' from the listing, hashes the rest, and verifies.
 */
export function verifyListing(listing: Listing): boolean {
  const obj = { ...listing } as Record<string, unknown>;
  const signatureHex = obj['signature'] as string;
  delete obj['signature'];
  delete obj['id'];
  const hash = hashObject(obj);
  return verify(hash, signatureHex, listing.seller.id);
}

/**
 * Signs a review object. Returns the signature hex.
 */
export function signReview(
  review: Omit<Review, 'id' | 'signature'>,
  privateKeyHex: string
): string {
  const obj = { ...review } as Record<string, unknown>;
  delete obj['id'];
  delete obj['signature'];
  const hash = hashObject(obj);
  return sign(hash, privateKeyHex);
}

/**
 * Verifies a review's signature.
 */
export function verifyReview(review: Review): boolean {
  const obj = { ...review } as Record<string, unknown>;
  const signatureHex = obj['signature'] as string;
  delete obj['signature'];
  delete obj['id'];
  const hash = hashObject(obj);
  return verify(hash, signatureHex, review.reviewer.id);
}

/**
 * Performs Proof-of-Work: finds a nonce such that SHA-256(data + nonce)
 * has the required number of leading zero bits.
 */
export function proofOfWork(data: string, difficulty: number): { nonce: number; hash: string } {
  const prefix = '0'.repeat(difficulty);
  let nonce = 0;

  while (true) {
    const attempt = data + nonce.toString();
    const hash = crypto.createHash('sha256').update(attempt).digest('hex');
    if (hash.startsWith(prefix)) {
      return { nonce, hash };
    }
    nonce++;
  }
}

/**
 * Verifies a Proof-of-Work result.
 */
export function verifyProofOfWork(data: string, nonce: number, difficulty: number): boolean {
  const prefix = '0'.repeat(difficulty);
  const attempt = data + nonce.toString();
  const hash = crypto.createHash('sha256').update(attempt).digest('hex');
  return hash.startsWith(prefix);
}
