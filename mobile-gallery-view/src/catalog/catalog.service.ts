import { MediaItem, FolderScanInput, FolderType } from "../domain";
import { PlatformAdapter } from "../adapters/platform-adapter";

export class FolderInferenceService {
  infer(path: string): { folderType: FolderType; sourceApp: string } {
    const normalized = path.toLowerCase();
    if (normalized.includes("whatsapp")) {
      return { folderType: "whatsapp", sourceApp: "WhatsApp" };
    }
    if (normalized.includes("screenshot")) {
      return { folderType: "screenshots", sourceApp: "Screenshots" };
    }
    if (normalized.includes("camera") || normalized.includes("dcim")) {
      return { folderType: "camera", sourceApp: "Camera" };
    }
    if (normalized.includes("download")) {
      return { folderType: "downloads", sourceApp: "Downloads" };
    }
    return { folderType: "other", sourceApp: "Unknown" };
  }
}

export class CatalogService {
  constructor(
    private readonly adapter: PlatformAdapter,
    private readonly inferenceService: FolderInferenceService
  ) {}

  async scan(input: FolderScanInput): Promise<MediaItem[]> {
    const items: MediaItem[] = [];
    for (const rootPath of input.rootPaths) {
      const mediaFiles = await this.adapter.listMediaFiles(rootPath);
      for (const file of mediaFiles) {
        const inferred = this.inferenceService.infer(file.path);
        items.push({
          id: file.path,
          path: file.path,
          folderType: inferred.folderType,
          sourceApp: inferred.sourceApp,
          width: file.width,
          height: file.height,
          fileSize: file.fileSize,
          hashExact: file.hashExact,
          hashPerceptual: file.hashPerceptual,
          faceCount: file.faceCount,
          faceVisibilityScore: 1,
          blurScore: 1,
          qualityScore: 1,
          categoryFlags: [],
        });
      }
    }
    return items;
  }
}
