import { IndexedDBPersistenceAdapter, LocalStoragePersistenceAdapter } from './persistence.adapter';

describe('LocalStoragePersistenceAdapter', () => {
  let adapter: LocalStoragePersistenceAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStoragePersistenceAdapter();
  });

  describe('IndexedDBPersistenceAdapter', () => {
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
