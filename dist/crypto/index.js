"use strict";
/**
 * DMP Protocol - Cryptographic Operations
 *
 * ECDSA SECP256k1 key generation, signing, and verification.
 * Uses the secp256k1 native module for performance.
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
exports.generateKeyPair = generateKeyPair;
exports.derivePublicKey = derivePublicKey;
exports.sortKeys = sortKeys;
exports.hashObject = hashObject;
exports.sign = sign;
exports.verify = verify;
exports.signListing = signListing;
exports.verifyListing = verifyListing;
exports.signReview = signReview;
exports.verifyReview = verifyReview;
exports.proofOfWork = proofOfWork;
exports.verifyProofOfWork = verifyProofOfWork;
const crypto = __importStar(require("crypto"));
const secp256k1 = __importStar(require("secp256k1"));
/**
 * Generates a new ECDSA SECP256k1 key pair.
 */
function generateKeyPair() {
    let privateKeyBytes;
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
function derivePublicKey(privateKeyHex) {
    const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
    const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes, false);
    return Buffer.from(publicKeyBytes).toString('hex');
}
/**
 * Sorts object keys recursively for deterministic serialization.
 */
function sortKeys(obj) {
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
        const val = obj[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            sorted[key] = sortKeys(val);
        }
        else {
            sorted[key] = val;
        }
    }
    return sorted;
}
/**
 * Creates a SHA-256 hash of the canonical JSON representation.
 * The object is sorted by keys and stringified before hashing.
 */
function hashObject(obj) {
    const sorted = sortKeys(obj);
    const json = JSON.stringify(sorted);
    return crypto.createHash('sha256').update(json).digest();
}
/**
 * Signs data with an ECDSA SECP256k1 private key.
 * Returns the DER-encoded signature as hex.
 */
function sign(hash, privateKeyHex) {
    const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
    const sigObj = secp256k1.ecdsaSign(new Uint8Array(hash), new Uint8Array(privateKeyBytes));
    const derSig = secp256k1.signatureExport(sigObj.signature);
    return Buffer.from(derSig).toString('hex');
}
/**
 * Verifies an ECDSA SECP256k1 signature.
 */
function verify(hash, signatureHex, publicKeyHex) {
    try {
        const sigDer = Buffer.from(signatureHex, 'hex');
        const sigNormalized = secp256k1.signatureImport(new Uint8Array(sigDer));
        const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
        return secp256k1.ecdsaVerify(sigNormalized, new Uint8Array(hash), new Uint8Array(publicKeyBytes));
    }
    catch {
        return false;
    }
}
/**
 * Signs a listing object. Returns the signature hex.
 * The listing must not contain 'id' or 'signature' fields when signing.
 */
function signListing(listing, privateKeyHex) {
    const obj = { ...listing };
    delete obj['id'];
    delete obj['signature'];
    const hash = hashObject(obj);
    return sign(hash, privateKeyHex);
}
/**
 * Verifies a listing's signature.
 * Removes 'signature' from the listing, hashes the rest, and verifies.
 */
function verifyListing(listing) {
    const obj = { ...listing };
    const signatureHex = obj['signature'];
    delete obj['signature'];
    delete obj['id'];
    const hash = hashObject(obj);
    return verify(hash, signatureHex, listing.seller.id);
}
/**
 * Signs a review object. Returns the signature hex.
 */
function signReview(review, privateKeyHex) {
    const obj = { ...review };
    delete obj['id'];
    delete obj['signature'];
    const hash = hashObject(obj);
    return sign(hash, privateKeyHex);
}
/**
 * Verifies a review's signature.
 */
function verifyReview(review) {
    const obj = { ...review };
    const signatureHex = obj['signature'];
    delete obj['signature'];
    delete obj['id'];
    const hash = hashObject(obj);
    return verify(hash, signatureHex, review.reviewer.id);
}
/**
 * Performs Proof-of-Work: finds a nonce such that SHA-256(data + nonce)
 * has the required number of leading zero bits.
 */
function proofOfWork(data, difficulty) {
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
function verifyProofOfWork(data, nonce, difficulty) {
    const prefix = '0'.repeat(difficulty);
    const attempt = data + nonce.toString();
    const hash = crypto.createHash('sha256').update(attempt).digest('hex');
    return hash.startsWith(prefix);
}
//# sourceMappingURL=index.js.map