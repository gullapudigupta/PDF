import { RuntimeTarget } from "../domain";

export interface MediaFileMetadata {
  path: string;
  width: number;
  height: number;
  fileSize: number;
  hashExact: string;
  hashPerceptual: string;
  faceCount: number;
  compressionRatio: number;
}

export interface PlatformAdapter {
  target: RuntimeTarget;
  listMediaFiles(rootPath: string): Promise<MediaFileMetadata[]>;
  readTextFile(path: string): Promise<string>;
  readBinaryFile(path: string): Promise<Uint8Array>;
  deleteFile(path: string): Promise<void>;
  listFolders(rootPath: string): Promise<string[]>;
  removeFolder(path: string): Promise<void>;
  nowIso(): string;
}

export class InMemoryAdapter implements PlatformAdapter {
  public readonly target: RuntimeTarget;
  private readonly mediaByRoot: Record<string, MediaFileMetadata[]>;
  private readonly textFiles: Record<string, string>;
  private readonly deletedFiles = new Set<string>();

  constructor(
    target: RuntimeTarget,
    mediaByRoot: Record<string, MediaFileMetadata[]>,
    textFiles: Record<string, string>
  ) {
    this.target = target;
    this.mediaByRoot = mediaByRoot;
    this.textFiles = textFiles;
  }

  async listMediaFiles(rootPath: string): Promise<MediaFileMetadata[]> {
    return (this.mediaByRoot[rootPath] ?? []).filter((item) => !this.deletedFiles.has(item.path));
  }

  async readTextFile(path: string): Promise<string> {
    const content = this.textFiles[path];
    if (!content) {
      throw new Error(`Missing text file: ${path}`);
    }
    return content;
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    const text = await this.readTextFile(path);
    return new TextEncoder().encode(text);
  }

  async deleteFile(path: string): Promise<void> {
    this.deletedFiles.add(path);
  }

  async listFolders(rootPath: string): Promise<string[]> {
    const items = this.mediaByRoot[rootPath] ?? [];
    const folders = new Set<string>();
    for (const item of items) {
      const parts = item.path.split("/");
      parts.pop();
      folders.add(parts.join("/"));
    }
    return Array.from(folders);
  }

  async removeFolder(_path: string): Promise<void> {
    return;
  }

  nowIso(): string {
    return new Date().toISOString();
  }
}
