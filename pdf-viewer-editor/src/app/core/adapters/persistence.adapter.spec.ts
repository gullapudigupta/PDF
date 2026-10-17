import { IndexedDBPersistenceAdapter, LocalStoragePersistenceAdapter } from './persistence.adapter';

describe('LocalStoragePersistenceAdapter', () => {
  let adapter: LocalStoragePersistenceAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStoragePersistenceAdapter();
  });

  describe('IndexedDBPersistenceAdapter', () => {
    it('preserves falsy settings and persists recent files', async () => {
      const adapter = new IndexedDBPersistenceAdapter();
      const dbName = `persistence-adapter-test-${Date.now()}-${Math.random()}`;
      Object.defineProperty(adapter, 'dbName', { value: dbName });

      await adapter.setSetting('feature-enabled', false);
      expect(await adapter.getSetting('feature-enabled')).toBeFalse();
      expect(await adapter.getRecentFiles()).toEqual([]);

      await adapter.addRecentFile('one.pdf');
      await adapter.addRecentFile('two.pdf');
      await adapter.addRecentFile('one.pdf');
      expect(await adapter.getRecentFiles()).toEqual(['one.pdf', 'two.pdf']);
    });

    it('stores, recovers, and clears autosave bytes', async () => {
      const adapter = new IndexedDBPersistenceAdapter();
      const documentId = `autosave-test-${Date.now()}`;
      const bytes = new Uint8Array([3, 5, 8, 13]).buffer;

      await adapter.saveAutosave(documentId, bytes);
      expect(await adapter.getAutosaveData(documentId)).toEqual(bytes);
      await adapter.clearAutosave(documentId);
      expect(await adapter.getAutosaveData(documentId)).toBeNull();
    });
  });

  it('stores and reads settings', async () => {
    await adapter.setSetting('theme', { mode: 'dark' });
    const setting = await adapter.getSetting<{ mode: string }>('theme');

    expect(setting).toEqual({ mode: 'dark' });
  });

  it('returns empty defaults for missing local settings, recents, and autosaves', async () => {
    expect(await adapter.getSetting('missing')).toBeNull();
    expect(await adapter.getRecentFiles()).toEqual([]);
    expect(await adapter.getAutosaveData('missing')).toBeNull();
  });

  it('maintains recent files uniqueness and max length', async () => {
    for (let i = 0; i < 12; i += 1) {
      await adapter.addRecentFile(`file-${i}.pdf`);
    }

    await adapter.addRecentFile('file-5.pdf');

    const recent = await adapter.getRecentFiles();
    expect(recent.length).toBe(10);
    expect(recent[0]).toBe('file-5.pdf');
    expect(recent.filter((f) => f === 'file-5.pdf').length).toBe(1);
  });

  it('saves, reads, and clears autosave bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    await adapter.saveAutosave('doc-1', bytes);
    const loaded = await adapter.getAutosaveData('doc-1');
    expect(loaded).toEqual(bytes);

    await adapter.clearAutosave('doc-1');
    const afterClear = await adapter.getAutosaveData('doc-1');
    expect(afterClear).toBeNull();
  });
});
