import { CleanupDecision, ContactProfile, MediaItem } from "../domain";

export interface ScanManifest {
  id: string;
  createdAt: string;
  rootPaths: string[];
  mediaCount: number;
}

export class LocalStoreService {
  private manifests = new Map<string, ScanManifest>();
  private media = new Map<string, MediaItem>();
  private contacts = new Map<string, ContactProfile>();
  private decisions = new Map<string, CleanupDecision>();

  saveManifest(manifest: ScanManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  saveMedia(items: MediaItem[]): void {
    for (const item of items) {
      this.media.set(item.id, item);
    }
  }

  saveContacts(items: ContactProfile[]): void {
    for (const item of items) {
      this.contacts.set(item.id, item);
    }
  }

  saveDecisions(items: CleanupDecision[]): void {
    for (const item of items) {
      this.decisions.set(item.mediaId, item);
    }
  }

  getAllMedia(): MediaItem[] {
    return Array.from(this.media.values());
  }
}
