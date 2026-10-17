import { PersistenceService, RecentFileRecord } from './persistence.service';

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
});
