import { MediaItem, ThresholdConfig } from "../domain";
import { clamp } from "../utils";

export class QualityEngine {
  constructor(private readonly thresholds: ThresholdConfig) {}

  scoreBlur(item: MediaItem): number {
    const pixels = item.width * item.height;
    const detailDensity = pixels > 0 ? Math.min(1, pixels / (1920 * 1080)) : 0;
    const score = clamp(detailDensity * 0.7 + (item.fileSize / 2_000_000) * 0.3);
    return score;
  }

  scoreLowQuality(item: MediaItem): number {
    const resolutionScore = clamp((item.width * item.height) / (1280 * 720));
    const sizeScore = clamp(item.fileSize / 700_000);
    const compressionProxy = clamp(sizeScore / Math.max(resolutionScore, 0.05));
    return clamp(resolutionScore * 0.45 + sizeScore * 0.25 + compressionProxy * 0.3);
  }

  scoreFaceVisibility(item: MediaItem): number {
    if (item.faceCount === 0) {
      return 1;
    }
    const sizeRatio = clamp((item.width * item.height) / (1920 * 1080));
    const facePenalty = clamp(1 - item.faceCount * 0.1, 0.4, 1);
    return clamp(sizeRatio * 0.5 + facePenalty * 0.5);
  }

  classify(item: MediaItem): string[] {
    const flags: string[] = [];

    if (item.blurScore < this.thresholds.blurMinScore) {
      flags.push("blurred");
    }
    if (item.qualityScore < this.thresholds.lowQualityMinScore) {
      flags.push("low-quality");
    }
    if (item.faceCount > 0 && item.faceVisibilityScore < this.thresholds.lowFaceVisibilityThreshold) {
      flags.push("low-face-visibility");
    }
    if (item.folderType === "screenshots" || item.path.toLowerCase().includes("forwarded")) {
      flags.push("non-essential-forward");
    }

    return flags;
  }
}
