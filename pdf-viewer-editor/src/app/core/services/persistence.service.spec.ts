import { PersistenceService, RecentFileRecord } from './persistence.service';
import { IndexedDBPersistenceAdapter } from '../adapters/persistence.adapter';

describe('PersistenceService recent-file records', () => {
  let service: PersistenceService;
  let settings: Map<string, unknown>;

  beforeEach(() => {
    settings = new Map();
    service = new PersistenceService();
    spyOn(service, 'getSetting').and.callFake(async <T>(key: string): Promise<T | null> =>
      (settings.get(key) as T | undefined) ?? null
    );
    spyOn(service, 'setSetting').and.callFake(async <T>(key: string, value: T): Promise<void> => {
      settings.set(key, value);
    });
  });

  it('retains pins while moving reopened files to the front and limiting unpinned entries', async () => {
    const pinned: RecentFileRecord = {
      id: 'pinned',
      name: 'pinned.pdf',
      path: 'pinned.pdf',
      lastOpenedAt: 1,
      isPinned: true,
    };
    const records: RecentFileRecord[] = Array.from({ length: 11 }, (_, index) => ({
      id: `doc-${index}`,
      name: `doc-${index}.pdf`,
      path: `doc-${index}.pdf`,
      lastOpenedAt: index + 2,
      isPinned: false,
    }));
    settings.set('recentFileRecords', [pinned, ...records]);

    await service.recordRecentFile({
      id: 'doc-3',
      name: 'doc-3.pdf',
      path: 'doc-3.pdf',
      lastOpenedAt: 20,
    });

    const result = await service.listRecentFileRecords();
    expect(result[0]).toEqual(pinned);
    expect(result[1].id).toBe('doc-3');
    expect(result.filter(record => !record.isPinned).length).toBe(10);
    expect(result.some(record => record.id === 'doc-0')).toBeFalse();
  });

  it('ignores malformed persisted recent-file entries', async () => {
    settings.set('recentFileRecords', [null, { id: 'missing-fields' }, {
      id: 'valid',
      name: 'valid.pdf',
      path: null,
      lastOpenedAt: 1,
      isPinned: false,
    }]);

    expect(await service.listRecentFileRecords()).toEqual([{
      id: 'valid',
      name: 'valid.pdf',
      path: null,
      lastOpenedAt: 1,
      isPinned: false,
    }]);
  });

  it('returns an empty list when the recent-file setting is not an array', async () => {
    settings.set('recentFileRecords', { malformed: true });
    expect(await service.listRecentFileRecords()).toEqual([]);
  });

  it('pins, unpins, and removes recent records and reports missing pin targets', async () => {
    const records: RecentFileRecord[] = [
      { id: 'older', name: 'older.pdf', path: null, lastOpenedAt: 1, isPinned: false },
      { id: 'newer', name: 'newer.pdf', path: null, lastOpenedAt: 2, isPinned: false },
    ];
    settings.set('recentFileRecords', records);

    await service.setRecentFilePinned('older', true);
    expect((settings.get('recentFileRecords') as RecentFileRecord[])[0].id).toBe('older');
    await service.setRecentFilePinned('older', false);
    expect((settings.get('recentFileRecords') as RecentFileRecord[])[0].id).toBe('newer');
    await expectAsync(service.setRecentFilePinned('missing', true)).toBeRejectedWithError(
      'Recent PDF not found: missing'
    );

    await service.removeRecentFileRecord('newer');
    expect(await service.listRecentFileRecords()).toEqual([
      { id: 'older', name: 'older.pdf', path: null, lastOpenedAt: 1, isPinned: false },
    ]);
  });

  it('delegates autosave reads, writes, and deletes to IndexedDB persistence', async () => {
    const bytes = new Uint8Array([2, 4, 6]).buffer;
    const getAutosaveData = spyOn(IndexedDBPersistenceAdapter.prototype, 'getAutosaveData').and.resolveTo(bytes);
    const saveAutosave = spyOn(IndexedDBPersistenceAdapter.prototype, 'saveAutosave').and.resolveTo();
    const clearAutosave = spyOn(IndexedDBPersistenceAdapter.prototype, 'clearAutosave').and.resolveTo();

    expect(await service.getAutosaveData('doc-1')).toBe(bytes);
    await service.saveAutosave('doc-1', bytes);
    await service.clearAutosave('doc-1');

    expect(getAutosaveData).toHaveBeenCalledWith('doc-1');
    expect(saveAutosave).toHaveBeenCalledWith('doc-1', bytes);
    expect(clearAutosave).toHaveBeenCalledWith('doc-1');
  });
});
