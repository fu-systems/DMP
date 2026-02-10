/**
 * DMP Protocol - Storage Layer
 *
 * Provides content-addressed storage abstraction over IPFS.
 * Implements Section 1.4 (Storage Layer) of the specification.
 */
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
export declare class MemoryStorageProvider implements StorageProvider {
    private store;
    private pinned;
    add(data: unknown): Promise<string>;
    get(cid: string): Promise<unknown | null>;
    pin(cid: string): Promise<void>;
    unpin(cid: string): Promise<void>;
    isPinned(cid: string): Promise<boolean>;
    /**
     * Generates a CID-like identifier from content.
     * In production, this would be a proper IPFS CID.
     * For dev/test, we use "Qm" prefix + base58-encoded SHA-256.
     */
    private generateCid;
    private toBase58;
}
//# sourceMappingURL=index.d.ts.map