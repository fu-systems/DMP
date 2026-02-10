"use strict";
/**
 * DMP Protocol - Core Type Definitions
 *
 * All data structures as defined in the DMP Protocol Specification v1.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
/** Default configuration */
exports.DEFAULT_CONFIG = {
    bootstrapAddrs: [
        '/dnsaddr/bootstrap.dmp.org',
    ],
    syncTopic: '/dmp/sync',
    maxListingsPerDay: 5,
    powDifficulty: 0,
    ephemeralTTLHours: 48,
    autoSeedHours: 24,
    syncWindowDays: 30,
    dbPath: './dmp-data',
};
//# sourceMappingURL=types.js.map