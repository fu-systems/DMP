/**
 * DMP Protocol - Storage Layer
 *
 * Provides content-addressed storage abstraction over IPFS.
 * Implements Section 1.4 (Storage Layer) of the specification.
 */

import * as crypto from 'crypto';

/**
 * Abstract storage provider interface.
 * Implementations should wrap IPFS or compatible content-addressed storage.
 */
export interface StorageProvider {
  /** Add data and return its CID */
  add(data: unknown): Promise<string>;
  /** Retrieve data by CID */
  get(cid: string): Promise<unknown | null>;
  /** Pin a CID to ensure availability */
  pin(cid: string): Promise<void>;
  /** Unpin a CID */
  unpin(cid: string): Promise<void>;
  /** Check if a CID is pinned locally */
  isPinned(cid: string): Promise<boolean>;
}

/**
 * In-memory storage provider for testing and development.
 * Generates deterministic CIDs using SHA-256 hashes formatted as base58.
 */
export class MemoryStorageProvider implements StorageProvider {
  private store = new Map<string, string>();
  private pinned = new Set<string>();

  async add(data: unknown): Promise<string> {
    const json = JSON.stringify(data);
    const cid = this.generateCid(json);
    this.store.set(cid, json);
    // Auto-pin new content
    this.pinned.add(cid);
    return cid;
  }

  async get(cid: string): Promise<unknown | null> {
    const json = this.store.get(cid);
    if (!json) return null;
    return JSON.parse(json);
  }

  async pin(cid: string): Promise<void> {
    if (!this.store.has(cid)) {
      throw new Error(`CID not found: ${cid}`);
    }
    this.pinned.add(cid);
  }

  async unpin(cid: string): Promise<void> {
    this.pinned.delete(cid);
  }

  async isPinned(cid: string): Promise<boolean> {
    return this.pinned.has(cid);
  }

  /**
   * Generates a CID-like identifier from content.
   * In production, this would be a proper IPFS CID.
   * For dev/test, we use "Qm" prefix + base58-encoded SHA-256.
   */
  private generateCid(content: string): string {
    const hash = crypto.createHash('sha256').update(content).digest();
    const base58 = this.toBase58(hash);
    // Pad or truncate to match the 46-char CID format (Qm + 44 chars)
    const padded = base58.padEnd(44, '1').slice(0, 44);
    return `Qm${padded}`;
  }

  private toBase58(buffer: Buffer): string {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = BigInt('0x' + buffer.toString('hex'));
    let result = '';
    while (num > 0n) {
      const remainder = Number(num % 58n);
      num = num / 58n;
      result = ALPHABET[remainder] + result;
    }
    return result || '1';
  }
}
