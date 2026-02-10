"use strict";
/**
 * DMP Protocol - Distributed Marketplace Protocol
 *
 * A censorship-resistant, peer-to-peer protocol for creating,
 * distributing, and browsing decentralized marketplace listings.
 *
 * @version 1.0.0
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DMPNode = exports.BrowsingService = exports.ReviewService = exports.ListingService = exports.SyncMessageType = exports.LocalNetworkProvider = exports.MemoryDatabaseProvider = exports.MemoryStorageProvider = exports.checkSizeLimit = exports.sanitizeDescription = exports.validateReview = exports.validateListing = exports.verifyProofOfWork = exports.proofOfWork = exports.verifyReview = exports.signReview = exports.verifyListing = exports.signListing = exports.verify = exports.sign = exports.hashObject = exports.sortKeys = exports.derivePublicKey = exports.generateKeyPair = void 0;
// Core types
__exportStar(require("./models/types"), exports);
// Cryptographic operations
var crypto_1 = require("./crypto");
Object.defineProperty(exports, "generateKeyPair", { enumerable: true, get: function () { return crypto_1.generateKeyPair; } });
Object.defineProperty(exports, "derivePublicKey", { enumerable: true, get: function () { return crypto_1.derivePublicKey; } });
Object.defineProperty(exports, "sortKeys", { enumerable: true, get: function () { return crypto_1.sortKeys; } });
Object.defineProperty(exports, "hashObject", { enumerable: true, get: function () { return crypto_1.hashObject; } });
Object.defineProperty(exports, "sign", { enumerable: true, get: function () { return crypto_1.sign; } });
Object.defineProperty(exports, "verify", { enumerable: true, get: function () { return crypto_1.verify; } });
Object.defineProperty(exports, "signListing", { enumerable: true, get: function () { return crypto_1.signListing; } });
Object.defineProperty(exports, "verifyListing", { enumerable: true, get: function () { return crypto_1.verifyListing; } });
Object.defineProperty(exports, "signReview", { enumerable: true, get: function () { return crypto_1.signReview; } });
Object.defineProperty(exports, "verifyReview", { enumerable: true, get: function () { return crypto_1.verifyReview; } });
Object.defineProperty(exports, "proofOfWork", { enumerable: true, get: function () { return crypto_1.proofOfWork; } });
Object.defineProperty(exports, "verifyProofOfWork", { enumerable: true, get: function () { return crypto_1.verifyProofOfWork; } });
// Validation
var validation_1 = require("./validation");
Object.defineProperty(exports, "validateListing", { enumerable: true, get: function () { return validation_1.validateListing; } });
Object.defineProperty(exports, "validateReview", { enumerable: true, get: function () { return validation_1.validateReview; } });
Object.defineProperty(exports, "sanitizeDescription", { enumerable: true, get: function () { return validation_1.sanitizeDescription; } });
Object.defineProperty(exports, "checkSizeLimit", { enumerable: true, get: function () { return validation_1.checkSizeLimit; } });
// Storage layer
var storage_1 = require("./storage");
Object.defineProperty(exports, "MemoryStorageProvider", { enumerable: true, get: function () { return storage_1.MemoryStorageProvider; } });
// Database layer
var db_1 = require("./db");
Object.defineProperty(exports, "MemoryDatabaseProvider", { enumerable: true, get: function () { return db_1.MemoryDatabaseProvider; } });
// Network layer
var network_1 = require("./network");
Object.defineProperty(exports, "LocalNetworkProvider", { enumerable: true, get: function () { return network_1.LocalNetworkProvider; } });
Object.defineProperty(exports, "SyncMessageType", { enumerable: true, get: function () { return network_1.SyncMessageType; } });
// Services
var services_1 = require("./services");
Object.defineProperty(exports, "ListingService", { enumerable: true, get: function () { return services_1.ListingService; } });
Object.defineProperty(exports, "ReviewService", { enumerable: true, get: function () { return services_1.ReviewService; } });
Object.defineProperty(exports, "BrowsingService", { enumerable: true, get: function () { return services_1.BrowsingService; } });
Object.defineProperty(exports, "DMPNode", { enumerable: true, get: function () { return services_1.DMPNode; } });
//# sourceMappingURL=index.js.map