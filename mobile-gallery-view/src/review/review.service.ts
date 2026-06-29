import {
  CandidateItem,
  CleanupDecision,
  ContactProfile,
  DuplicateCluster,
  MediaItem,
} from "../domain";

export interface ComparePair {
  left: MediaItem;
  right: MediaItem;
  reason: string;
}

export class ReviewService {
  buildCandidates(items: MediaItem, duplicateClusters: DuplicateCluster[]): CandidateItem[];
  buildCandidates(items: MediaItem[], duplicateClusters: DuplicateCluster[]): CandidateItem[];
  buildCandidates(items: MediaItem[] | MediaItem, duplicateClusters: DuplicateCluster[]): CandidateItem[] {
    const list = Array.isArray(items) ? items : [items];
    const duplicateIds = new Set(duplicateClusters.flatMap((cluster) => cluster.mediaIds));

    return list
      .filter((item) => item.categoryFlags.length > 0 || duplicateIds.has(item.id))
      .map((item) => {
        const reasons = [...item.categoryFlags];
        if (duplicateIds.has(item.id)) {
          reasons.push("duplicate");
        }
        const confidence = Math.min(0.99, 0.5 + reasons.length * 0.12);
        return {
          mediaId: item.id,
          reasons,
          confidence,
          flags: reasons,
        };
      });
  }

  buildComparePairs(items: MediaItem[], duplicateClusters: DuplicateCluster[]): ComparePair[] {
    const map = new Map(items.map((item) => [item.id, item]));
    const pairs: ComparePair[] = [];

    for (const cluster of duplicateClusters) {
      for (let i = 0; i < cluster.mediaIds.length - 1; i += 1) {
        const left = map.get(cluster.mediaIds[i]);
        const right = map.get(cluster.mediaIds[i + 1]);
        if (left && right) {
          pairs.push({ left, right, reason: cluster.reason });
        }
      }
    }

    return pairs;
  }

  createDecision(mediaId: string, decision: "keep" | "delete", reasons: string[], confidence: number): CleanupDecision {
    return {
      mediaId,
      decision,
      reasons,
      confidence,
      reviewedByUser: true,
      timestamp: new Date().toISOString(),
    };
  }

  groupFirstSort(contacts: ContactProfile[]): ContactProfile[] {
    const withGroup = contacts.filter((c) => Boolean(c.groupId));
    const withoutGroup = contacts.filter((c) => !c.groupId);
    return [...withGroup, ...withoutGroup].sort((a, b) => b.totalMediaSize - a.totalMediaSize);
  }
}
