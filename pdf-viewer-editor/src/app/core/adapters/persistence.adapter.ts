export interface PersistenceAdapter {
  getSetting<T>(key: string): Promise<T | null>;
  setSetting<T>(key: string, value: T): Promise<void>;
  getRecentFiles(): Promise<string[]>;
  addRecentFile(filePath: string): Promise<void>;
  getAutosaveData(documentId: string): Promise<ArrayBuffer | null>;
  saveAutosave(documentId: string, data: ArrayBuffer): Promise<void>;
  clearAutosave(documentId: string): Promise<void>;
}

export class LocalStoragePersistenceAdapter implements PersistenceAdapter {
  async getSetting<T>(key: string): Promise<T | null> {
    const value = localStorage.getItem(`setting_${key}`);
    return value ? JSON.parse(value) : null;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(`setting_${key}`, JSON.stringify(value));
  }

  async getRecentFiles(): Promise<string[]> {
    const value = localStorage.getItem('recent_files');
    return value ? JSON.parse(value) : [];
  }

  async addRecentFile(filePath: string): Promise<void> {
    const recentFiles = await this.getRecentFiles();
    const filtered = recentFiles.filter(f => f !== filePath);
    filtered.unshift(filePath);
    const limited = filtered.slice(0, 10);
    localStorage.setItem('recent_files', JSON.stringify(limited));
  }

  async getAutosaveData(documentId: string): Promise<ArrayBuffer | null> {
    const value = localStorage.getItem(`autosave_${documentId}`);
    if (!value) return null;
    
    const uint8Array = Uint8Array.from(atob(value), c => c.charCodeAt(0));
    return uint8Array.buffer;
  }

  async saveAutosave(documentId: string, data: ArrayBuffer): Promise<void> {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    localStorage.setItem(`autosave_${documentId}`, base64);
  }

  async clearAutosave(documentId: string): Promise<void> {
    localStorage.removeItem(`autosave_${documentId}`);
  }
}

export class IndexedDBPersistenceAdapter implements PersistenceAdapter {
  private dbName = 'pdf-viewer-editor';
  private dbVersion = 1;

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('recentFiles')) {
          db.createObjectStore('recentFiles', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('autosave')) {
          db.createObjectStore('autosave', { keyPath: 'documentId' });
        }
      };
    });
  }

  async getSetting<T>(key: string): Promise<T | null> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRecentFiles(): Promise<string[]> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['recentFiles'], 'readonly');
      const store = transaction.objectStore('recentFiles');
      const request = store.get('files');
      
      request.onsuccess = () => {
        resolve(request.result?.files || []);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async addRecentFile(filePath: string): Promise<void> {
    const recentFiles = await this.getRecentFiles();
    const filtered = recentFiles.filter(f => f !== filePath);
    filtered.unshift(filePath);
    const limited = filtered.slice(0, 10);
    
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['recentFiles'], 'readwrite');
      const store = transaction.objectStore('recentFiles');
      const request = store.put({ id: 'files', files: limited });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAutosaveData(documentId: string): Promise<ArrayBuffer | null> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['autosave'], 'readonly');
      const store = transaction.objectStore('autosave');
      const request = store.get(documentId);
      
      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async saveAutosave(documentId: string, data: ArrayBuffer): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['autosave'], 'readwrite');
      const store = transaction.objectStore('autosave');
      const request = store.put({ documentId, data });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAutosave(documentId: string): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['autosave'], 'readwrite');
      const store = transaction.objectStore('autosave');
      const request = store.delete(documentId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
