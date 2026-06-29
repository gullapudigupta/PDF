import { MediaItem, ThresholdConfig } from "../domain";
import { DuplicateEngine } from "./duplicate-engine";
import { QualityEngine } from "./quality-engine";

export class AnalysisPipelineService {
  private readonly duplicate: DuplicateEngine;
  private readonly quality: QualityEngine;

  constructor(thresholds: ThresholdConfig) {
    this.duplicate = new DuplicateEngine(thresholds);
    this.quality = new QualityEngine(thresholds);
  }

  run(items: MediaItem[]): { analyzed: MediaItem[]; duplicateClusters: ReturnType<DuplicateEngine["findDuplicateClusters"]> } {
    const analyzed = items.map((item) => {
      const blurScore = this.quality.scoreBlur(item);
      const qualityScore = this.quality.scoreLowQuality(item);
      const faceVisibilityScore = this.quality.scoreFaceVisibility(item);
      const withScores = { ...item, blurScore, qualityScore, faceVisibilityScore };
      return { ...withScores, categoryFlags: this.quality.classify(withScores) };
    });

    const duplicateClusters = this.duplicate.findDuplicateClusters(analyzed);
    return { analyzed, duplicateClusters };
  }
}
