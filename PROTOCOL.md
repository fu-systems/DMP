# Distributed Marketplace Protocol (DMP) Specification

**Version**: 1.0.0
**Date**: 2026-02-09

## 1. Introduction

### 1.1 Overview

The Distributed Marketplace Protocol (DMP) is a censorship-resistant, peer-to-peer (P2P) protocol designed for creating, distributing, and browsing decentralized marketplace listings. It operates without central authorities, leveraging distributed storage and networking to ensure resilience against takedowns, censorship, or single points of failure.

The protocol supports two operational modes:

- **Persistent Mode**: Intended for long-term, immutable offerings such as software distribution. Listings in this mode are chained for version updates, ensuring a tamper-proof history.
- **Ephemeral Mode**: Designed for short-lived general listings (e.g., goods, services, jobs). These listings have a fixed 48-hour lifespan based on their timestamp and expiration fields, after which they are filtered out by clients unless re-posted by the seller.

### 1.2 Core Principles

- **Decentralization**: All data is stored and replicated across participant nodes using IPFS for content addressing and a distributed database layer.
- **Censorship Resistance**: Data persistence achieved through P2P replication; no entity can unilaterally remove content.
- **Security and Trust**: Cryptographic identities (ECDSA SECP256k1 key pairs) enable seller control over updates and decentralized reputation via signed reviews.
- **Efficiency**: Lightweight JSON structures, efficient syncing, and optional pruning for expired data.
- **Privacy**: Pseudonymous identities; optional anonymity enhancements.

### 1.3 Architecture

```
┌──────────────────────────────────────────────┐
│                 Client Layer                  │
│        (UI, State Management, Queries)        │
├──────────────────────────────────────────────┤
│               Service Layer                   │
│    (ListingService, ReviewService, Browse)     │
├──────────────────────────────────────────────┤
│              Identity Layer                   │
│         (ECDSA SECP256k1 Key Pairs)           │
├────────────┬───────────────┬─────────────────┤
│  Storage   │   Database    │    Network       │
│  (IPFS)    │  (OrbitDB)    │   (libp2p)       │
│  CIDs      │  Docstores    │   PubSub/DHT     │
└────────────┴───────────────┴─────────────────┘
```

## 2. Data Structures

All data is JSON-based with size limits (2KB per listing). Schemas are enforced via JSON Schema validation.

### 2.1 Listing Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | IPFS CID (base58 multihash) |
| `mode` | enum | Yes | `"persistent"` or `"ephemeral"` |
| `title` | string | Yes | Max 100 characters |
| `description` | string | No | Sanitized HTML, max 2048 chars |
| `seller.id` | string | Yes | ECDSA public key (130 hex chars) |
| `seller.cert` | string | No | Base64-encoded X.509 cert |
| `torrent.magnet` | string | No | Magnet URI |
| `torrent.fileHash` | string | No | SHA-256 hash (64 hex chars) |
| `webpage` | string | No | External URL |
| `categories` | array | No | Max 5 category strings |
| `version` | string | No | Semantic version (e.g., `1.0.0`) |
| `timestamp` | string | Yes | ISO 8601 UTC |
| `expiration` | string | Ephemeral | ISO 8601 UTC (required for ephemeral) |
| `previousId` | string | No | Previous CID for persistent chains |
| `originalId` | string | No | Original CID for ephemeral re-posts |
| `signature` | string | Yes | ECDSA signature (DER, hex) |

### 2.2 Review Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | IPFS CID |
| `sellerId` | string | Yes | Seller's public key |
| `listingId` | string | No | Related listing CID |
| `score` | number | Yes | 1-5 rating |
| `comment` | string | No | Max 500 characters |
| `reviewer.id` | string | Yes | Reviewer's public key |
| `timestamp` | string | Yes | ISO 8601 UTC |
| `signature` | string | Yes | ECDSA signature (DER, hex) |

## 3. Protocols and Algorithms

### 3.1 Listing Creation

1. Generate ECDSA SECP256k1 key pair (if new seller)
2. Build JSON with mode, timestamp, expiration (ephemeral: +48h)
3. Set `previousId`/`originalId` for updates/re-posts
4. Sort keys recursively, stringify to canonical JSON
5. SHA-256 hash the canonical JSON
6. Sign hash with private key (DER format)
7. Add signed JSON to IPFS → get CID → set `id`
8. Validate against JSON Schema
9. Store in distributed database

### 3.2 Signature Verification

```
function verifyListing(listing):
  sig = listing.signature
  remove 'signature' and 'id' from listing
  sortedStr = JSON.stringify(sortKeys(listing))
  hash = SHA256(sortedStr)
  pubKey = ECDSA.fromHex(listing.seller.id)
  return pubKey.verify(hash, sig)
```

### 3.3 Chain Validation (Persistent Updates)

Traverse `previousId` links; ensure all signatures are valid and all entries share the same `seller.id`.

### 3.4 Reputation Calculation

- **Simple average**: `sum(scores) / count` over verified reviews within 180 days
- **Weighted**: Score weighted by reviewer's own reputation (recursive, max depth 3)

### 3.5 Anti-Spam

- Rate limiting: Max 5 listings per day per identity
- Optional Proof-of-Work on listing creation
- Expiration pruning for ephemeral listings

## 4. Security

### 4.1 Threat Mitigations

- **Censorship**: High replication factor; optional Tor/I2P integration
- **Spam/Sybil**: PoW, rate limiting, reputation thresholds
- **Impersonation**: Signature verification on all content
- **XSS**: HTML sanitization with allowlisted tags
- **Data Integrity**: Content-addressed storage (CIDs), SHA-256 file hashes

## 5. JSON Schemas

Full JSON Schemas for validation are available in the `schemas/` directory:

- `schemas/listing.schema.json`
- `schemas/review.schema.json`
