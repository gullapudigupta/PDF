import { DuplicateCluster, MediaItem, ThresholdConfig } from "../domain";
import { hammingDistance } from "../utils";

export class DuplicateEngine {
  constructor(private readonly thresholds: ThresholdConfig) {}

  findDuplicateClusters(items: MediaItem[]): DuplicateCluster[] {
    const exactClusters = this.clusterExact(items);
    const fuzzyClusters = this.clusterPerceptual(items);
    return [...exactClusters, ...fuzzyClusters];
  }

  private clusterExact(items: MediaItem[]): DuplicateCluster[] {
    const byHash = new Map<string, MediaItem[]>();
    for (const item of items) {
      const group = byHash.get(item.hashExact) ?? [];
      group.push(item);
      byHash.set(item.hashExact, group);
    }

    return Array.from(byHash.entries())
      .filter(([, group]) => group.length > 1)
      .map(([hash, group], index) => ({
        clusterId: `exact-${index + 1}`,
        mediaIds: group.map((item) => item.id),
        confidence: 0.99,
        reason: `Exact hash match ${hash.slice(0, 8)}`,
      }));
  }

  private clusterPerceptual(items: MediaItem[]): DuplicateCluster[] {
    const clusters: DuplicateCluster[] = [];
    const used = new Set<string>();

    for (const base of items) {
      if (used.has(base.id)) {
        continue;
      }

      const cluster = [base.id];
      for (const candidate of items) {
        if (candidate.id === base.id || used.has(candidate.id)) {
          continue;
        }
        const distance = hammingDistance(base.hashPerceptual, candidate.hashPerceptual);
        if (distance <= this.thresholds.duplicatePerceptualDistance) {
          cluster.push(candidate.id);
        }
      }

      if (cluster.length > 1) {
        for (const id of cluster) {
          used.add(id);
        }
        clusters.push({
          clusterId: `phash-${clusters.length + 1}`,
          mediaIds: cluster,
          confidence: 0.85,
          reason: "Perceptual similarity cluster",
        });
      }
    }

    return clusters;
  }
}
