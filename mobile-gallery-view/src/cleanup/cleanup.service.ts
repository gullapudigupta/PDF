import { PlatformAdapter } from "../adapters/platform-adapter";
import { CleanupDecision, CleanupSummary, MediaItem } from "../domain";
import { toMb } from "../utils";

export interface UndoTicket {
  id: string;
  expiresAt: string;
  reversiblePaths: string[];
}

export class CleanupService {
  constructor(private readonly adapter: PlatformAdapter, private readonly undoWindowMs = 60_000) {}

  dryRun(items: MediaItem[], decisions: CleanupDecision[]): CleanupSummary {
    const deleteIds = new Set(decisions.filter((d) => d.decision === "delete").map((d) => d.mediaId));
    const candidates = items.filter((item) => deleteIds.has(item.id));

    const totalBytesMarked = candidates.reduce((acc, item) => acc + item.fileSize, 0);
    const folders = new Set(candidates.map((item) => item.path.split("/").slice(0, -1).join("/")));

    return {
      totalCandidates: candidates.length,
      totalBytesMarked,
      estimatedSavingsMb: toMb(totalBytesMarked),
      emptyFoldersToRemove: Array.from(folders),
    };
  }

  async confirmDelete(items: MediaItem[], decisions: CleanupDecision[]): Promise<UndoTicket> {
    const deleteIds = new Set(decisions.filter((d) => d.decision === "delete").map((d) => d.mediaId));
    const victims = items.filter((item) => deleteIds.has(item.id));

    for (const media of victims) {
      await this.adapter.deleteFile(media.path);
    }

    return {
      id: `undo-${Date.now()}`,
      expiresAt: new Date(Date.now() + this.undoWindowMs).toISOString(),
      reversiblePaths: victims.map((item) => item.path),
    };
  }

  async cleanupEmptyFolders(rootPaths: string[]): Promise<string[]> {
    const removed: string[] = [];
    for (const root of rootPaths) {
      const folders = await this.adapter.listFolders(root);
      for (const folder of folders) {
        const files = await this.adapter.listMediaFiles(folder);
        if (files.length === 0) {
          await this.adapter.removeFolder(folder);
          removed.push(folder);
        }
      }
    }
    return removed;
  }
}
