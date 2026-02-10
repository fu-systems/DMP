/**
 * Tests for DMP Protocol - Storage Layer
 */

import { MemoryStorageProvider } from '../src/storage';

describe('MemoryStorageProvider', () => {
  let storage: MemoryStorageProvider;

  beforeEach(() => {
    storage = new MemoryStorageProvider();
  });

  describe('add and get', () => {
    it('should store and retrieve data', async () => {
      const data = { test: 'value', number: 42 };
      const cid = await storage.add(data);
      expect(cid).toMatch(/^Qm/);
      expect(cid).toHaveLength(46);

      const retrieved = await storage.get(cid);
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent CID', async () => {
      const result = await storage.get('QmNonExistentCID1234567890123456789012345');
      expect(result).toBeNull();
    });

    it('should generate deterministic CIDs for same content', async () => {
      const data = { deterministic: true };
      const cid1 = await storage.add(data);
      const cid2 = await storage.add(data);
      expect(cid1).toEqual(cid2);
    });

    it('should generate different CIDs for different content', async () => {
      const cid1 = await storage.add({ a: 1 });
      const cid2 = await storage.add({ b: 2 });
      expect(cid1).not.toEqual(cid2);
    });
  });

  describe('pinning', () => {
    it('should auto-pin new content', async () => {
      const cid = await storage.add({ data: 'test' });
      expect(await storage.isPinned(cid)).toBe(true);
    });

    it('should allow unpinning', async () => {
      const cid = await storage.add({ data: 'test' });
      await storage.unpin(cid);
      expect(await storage.isPinned(cid)).toBe(false);
    });

    it('should allow re-pinning', async () => {
      const cid = await storage.add({ data: 'test' });
      await storage.unpin(cid);
      await storage.pin(cid);
      expect(await storage.isPinned(cid)).toBe(true);
    });

    it('should throw when pinning non-existent CID', async () => {
      await expect(
        storage.pin('QmNonExistentCID1234567890123456789012345')
      ).rejects.toThrow('CID not found');
    });
  });
});
