import { Injectable } from '@angular/core';
import { 
  PersistenceAdapter, 
  LocalStoragePersistenceAdapter, 
  IndexedDBPersistenceAdapter 
} from '../adapters/persistence.adapter';
import { environment } from '@environments/environment';

export interface RecentFileRecord {
  id: string;
  name: string;
  path: string | null;
  lastOpenedAt: number;
  isPinned: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PersistenceService implements PersistenceAdapter {
  private adapter: PersistenceAdapter;
  private readonly autosaveAdapter = new IndexedDBPersistenceAdapter();

  constructor() {
    this.adapter = environment.runtime === 'desktop' 
      ? new LocalStoragePersistenceAdapter() 
      : new IndexedDBPersistenceAdapter();
  }

  getSetting<T>(key: string): Promise<T | null> {
    return this.adapter.getSetting(key);
  }

  setSetting<T>(key: string, value: T): Promise<void> {
    return this.adapter.setSetting(key, value);
  }

  getRecentFiles(): Promise<string[]> {
    return this.adapter.getRecentFiles();
  }

  addRecentFile(filePath: string): Promise<void> {
    return this.adapter.addRecentFile(filePath);
  }

  async listRecentFileRecords(): Promise<RecentFileRecord[]> {
    const records = await this.getSetting<RecentFileRecord[]>('recentFileRecords');
    return Array.isArray(records)
      ? records.filter(record =>
        !!record &&
        typeof record === 'object' &&
        typeof record.id === 'string' &&
        typeof record.name === 'string' &&
        (record.path === null || typeof record.path === 'string') &&
        Number.isFinite(record.lastOpenedAt) &&
        typeof record.isPinned === 'boolean'
      ).sort((left, right) =>
        Number(right.isPinned) - Number(left.isPinned) || right.lastOpenedAt - left.lastOpenedAt
      )
      : [];
  }

  async recordRecentFile(record: Omit<RecentFileRecord, 'isPinned'>): Promise<void> {
    const records = await this.listRecentFileRecords();
    const existing = records.find(item => item.id === record.id);
    const next: RecentFileRecord = { ...record, isPinned: existing?.isPinned ?? false };
    const others = records.filter(item => item.id !== record.id);
    const pinned = others.filter(item => item.isPinned);
    const unpinned = others.filter(item => !item.isPinned);
    unpinned.unshift(next);
    const limited = [...pinned, ...unpinned.slice(0, 10)].sort((left, right) =>
      Number(right.isPinned) - Number(left.isPinned) || right.lastOpenedAt - left.lastOpenedAt
    );
    await this.setSetting('recentFileRecords', limited);
  }

  async setRecentFilePinned(id: string, isPinned: boolean): Promise<void> {
    const records = await this.listRecentFileRecords();
    const target = records.find(record => record.id === id);
    if (!target) throw new Error(`Recent PDF not found: ${id}`);
    target.isPinned = isPinned;
    await this.setSetting('recentFileRecords', records.sort((left, right) =>
      Number(right.isPinned) - Number(left.isPinned) || right.lastOpenedAt - left.lastOpenedAt
    ));
  }

  async removeRecentFileRecord(id: string): Promise<void> {
    const records = await this.listRecentFileRecords();
    await this.setSetting('recentFileRecords', records.filter(record => record.id !== id));
  }

  getAutosaveData(documentId: string): Promise<ArrayBuffer | null> {
    return this.autosaveAdapter.getAutosaveData(documentId);
  }

  saveAutosave(documentId: string, data: ArrayBuffer): Promise<void> {
    return this.autosaveAdapter.saveAutosave(documentId, data);
  }

  clearAutosave(documentId: string): Promise<void> {
    return this.autosaveAdapter.clearAutosave(documentId);
  }
}
