import { Injectable } from '@angular/core';
import { 
  PersistenceAdapter, 
  LocalStoragePersistenceAdapter, 
  IndexedDBPersistenceAdapter 
} from '../adapters/persistence.adapter';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PersistenceService implements PersistenceAdapter {
  private adapter: PersistenceAdapter;

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

  getAutosaveData(documentId: string): Promise<ArrayBuffer | null> {
    return this.adapter.getAutosaveData(documentId);
  }

  saveAutosave(documentId: string, data: ArrayBuffer): Promise<void> {
    return this.adapter.saveAutosave(documentId, data);
  }

  clearAutosave(documentId: string): Promise<void> {
    return this.adapter.clearAutosave(documentId);
  }
}
