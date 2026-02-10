"use strict";
/**
 * DMP Protocol - Storage Layer
 *
 * Provides content-addressed storage abstraction over IPFS.
 * Implements Section 1.4 (Storage Layer) of the specification.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStorageProvider = void 0;
const crypto = __importStar(require("crypto"));
/**
 * In-memory storage provider for testing and development.
 * Generates deterministic CIDs using SHA-256 hashes formatted as base58.
 */
class MemoryStorageProvider {
    store = new Map();
    pinned = new Set();
    async add(data) {
        const json = JSON.stringify(data);
        const cid = this.generateCid(json);
        this.store.set(cid, json);
        // Auto-pin new content
        this.pinned.add(cid);
        return cid;
    }
    async get(cid) {
        const json = this.store.get(cid);
        if (!json)
            return null;
        return JSON.parse(json);
    }
    async pin(cid) {
        if (!this.store.has(cid)) {
            throw new Error(`CID not found: ${cid}`);
        }
        this.pinned.add(cid);
    }
    async unpin(cid) {
        this.pinned.delete(cid);
    }
    async isPinned(cid) {
        return this.pinned.has(cid);
    }
    /**
     * Generates a CID-like identifier from content.
     * In production, this would be a proper IPFS CID.
     * For dev/test, we use "Qm" prefix + base58-encoded SHA-256.
     */
    generateCid(content) {
        const hash = crypto.createHash('sha256').update(content).digest();
        const base58 = this.toBase58(hash);
        // Pad or truncate to match the 46-char CID format (Qm + 44 chars)
        const padded = base58.padEnd(44, '1').slice(0, 44);
        return `Qm${padded}`;
    }
    toBase58(buffer) {
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
exports.MemoryStorageProvider = MemoryStorageProvider;
//# sourceMappingURL=index.js.map