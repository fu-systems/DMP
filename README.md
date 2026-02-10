# DMP - Distributed Marketplace Protocol

A censorship-resistant, peer-to-peer protocol for creating, distributing, and browsing decentralized marketplace listings. No central authorities, no single points of failure.

## Features

- **Two listing modes**: Persistent (software distribution with version chains) and Ephemeral (48-hour classified ads)
- **Cryptographic identity**: ECDSA SECP256k1 key pairs for seller authentication and tamper-proof signatures
- **Decentralized reputation**: Signed reviews with weighted scoring based on reviewer reputation
- **Content-addressed storage**: IPFS-compatible CIDs for immutable listing data
- **JSON Schema validation**: Strict schema enforcement with HTML sanitization against XSS
- **Anti-spam**: Rate limiting and optional Proof-of-Work
- **Provider architecture**: Pluggable storage, database, and network backends

## Quick Start

```bash
npm install
npm run build
```

### Create a Node

```typescript
import { DMPNode } from 'dmp-protocol';

const node = new DMPNode();
await node.start();

// Generate a seller identity
const seller = node.generateIdentity();

// Create an ephemeral listing (48h TTL)
const listing = await node.createListing({
  mode: 'ephemeral',
  title: 'Mountain Bike for Sale',
  description: '<p>Great condition, barely used. $250.</p>',
  categories: ['marketplace/bikes'],
  webpage: 'https://example.com/pay',
  privateKey: seller.privateKey,
});

console.log(`Listed: ${listing.id}`);
```

### Persistent Listings with Version Chains

```typescript
const v1 = await node.createListing({
  mode: 'persistent',
  title: 'My App v1.0',
  version: '1.0.0',
  torrent: {
    magnet: 'magnet:?xt=urn:btih:...',
    fileHash: 'abc123...', // SHA-256
  },
  privateKey: seller.privateKey,
});

// Update with a new version (creates a chain)
const v2 = await node.updateListing(v1.id, {
  title: 'My App v2.0',
  version: '2.0.0',
  torrent: { magnet: 'magnet:?xt=urn:btih:...', fileHash: 'def456...' },
  privateKey: seller.privateKey,
});

// Validate the full chain
const chain = await node.listings.validateChain(v2.id);
// chain.valid === true, chain.chain === [v1, v2]
```

### Reviews and Reputation

```typescript
const buyer = node.generateIdentity();

await node.submitReview({
  sellerId: seller.publicKey,
  score: 5,
  comment: 'Fast delivery!',
  privateKey: buyer.privateKey,
});

const rep = await node.reviews.calculateReputation(seller.publicKey);
// rep.averageScore === 5, rep.totalReviews === 1
```

### Browsing and Search

```typescript
// Browse active ephemeral listings
const ephemeral = await node.browsing.browseEphemeral();

// Search across all listings
const results = await node.browsing.search('bike');

// Filter by category
const electronics = await node.browsing.browseByCategory(['electronics']);

// Browse persistent listings by seller
const sellerApps = await node.browsing.browsePersistentBySeller(seller.publicKey);

// Filter by minimum seller reputation
const trusted = await node.browsing.browseByReputation(4.0);
```

### Re-posting Expired Listings

```typescript
const repost = await node.repostListing(listing.id, {
  title: 'Mountain Bike - Still Available!',
  privateKey: seller.privateKey,
});
// repost.originalId === listing.id
```

## Architecture

```
┌──────────────────────────────────────────────┐
│                 DMPNode                       │
│        (Orchestrator / Entry Point)           │
├──────────────────────────────────────────────┤
│               Service Layer                   │
│  ListingService  ReviewService  BrowsingService│
├──────────────────────────────────────────────┤
│              Identity Layer                   │
│         ECDSA SECP256k1 Key Pairs             │
├────────────┬───────────────┬─────────────────┤
│  Storage   │   Database    │    Network       │
│  Provider  │   Provider    │    Provider      │
│  (IPFS)    │  (OrbitDB)    │   (libp2p)       │
└────────────┴───────────────┴─────────────────┘
```

All three infrastructure layers use a **provider interface** pattern. Built-in memory implementations are included for development and testing. Swap in production backends (IPFS, OrbitDB, libp2p) by passing them to `DMPNode`:

```typescript
const node = new DMPNode({
  storage: new IPFSStorageProvider(ipfsInstance),
  database: new OrbitDBProvider(orbitdb),
  network: new Libp2pNetworkProvider(libp2p),
});
```

## Project Structure

```
src/
├── models/types.ts          # TypeScript interfaces and config
├── crypto/index.ts          # ECDSA signing, verification, PoW
├── validation/index.ts      # JSON Schema validation, HTML sanitization
├── storage/index.ts         # Content-addressed storage (IPFS interface)
├── db/index.ts              # Database querying and persistence
├── network/index.ts         # P2P networking and PubSub sync
├── services/
│   ├── listing-service.ts   # Create, update, repost, chain validation
│   ├── review-service.ts    # Reviews, reputation calculation
│   ├── browsing-service.ts  # Search, filter, prune
│   └── dmp-node.ts          # Main node orchestrator
└── index.ts                 # Barrel exports

schemas/
├── listing.schema.json      # Listing JSON Schema
└── review.schema.json       # Review JSON Schema

tests/
├── crypto.test.ts           # Key gen, signing, verification, PoW
├── validation.test.ts       # Schema validation, sanitization
├── storage.test.ts          # CID generation, pinning
├── db.test.ts               # CRUD, queries, filtering, pruning
├── services.test.ts         # Service-level integration
└── dmp-node.test.ts         # End-to-end node integration
```

## Testing

```bash
npm test                # Run all 109 tests
npm run test:coverage   # Run with coverage report
```

## Protocol Specification

See [PROTOCOL.md](./PROTOCOL.md) for the full protocol specification covering data structures, algorithms, security model, and threat mitigations.

## License

MIT
