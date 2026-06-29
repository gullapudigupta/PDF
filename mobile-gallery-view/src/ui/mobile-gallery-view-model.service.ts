import { CandidateItem, ContactProfile, MediaItem } from "../domain";
import { toMb } from "../utils";

export interface SummaryCard {
  key: "total" | "candidates" | "savings";
  label: string;
  value: string;
}

export interface ContactRow {
  id: string;
  name: string;
  groupId?: string;
  totalSizeMb: number;
  mediaCount: number;
}

export interface MobileGalleryViewModel {
  summaryCards: SummaryCard[];
  groupRows: ContactRow[];
  contactRows: ContactRow[];
  filterChips: string[];
  decisionPanel: {
    candidateCount: number;
    topReasons: string[];
  };
}

export class MobileGalleryViewModelService {
  build(
    contacts: ContactProfile[],
    mediaItems: MediaItem[],
    candidates: CandidateItem[],
    potentialSavingsBytes: number
  ): MobileGalleryViewModel {
    const summaryCards: SummaryCard[] = [
      { key: "total", label: "Total Media", value: String(mediaItems.length) },
      { key: "candidates", label: "Junk Candidates", value: String(candidates.length) },
      { key: "savings", label: "Potential Savings", value: `${toMb(potentialSavingsBytes)} MB` },
    ];

    const groupRows: ContactRow[] = contacts
      .filter((item) => Boolean(item.groupId))
      .map((item) => this.toRow(item));

    const contactRows: ContactRow[] = contacts
      .filter((item) => !item.groupId)
      .map((item) => this.toRow(item));

    const reasonCounts = new Map<string, number>();
    for (const candidate of candidates) {
      for (const reason of candidate.reasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      }
    }

    const topReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason]) => reason);

    return {
      summaryCards,
      groupRows,
      contactRows,
      filterChips: ["duplicate", "blurred", "low-quality", "low-face-visibility", "screenshots"],
      decisionPanel: {
        candidateCount: candidates.length,
        topReasons,
      },
    };
  }

  private toRow(contact: ContactProfile): ContactRow {
    return {
      id: contact.id,
      name: contact.displayName,
      groupId: contact.groupId,
      totalSizeMb: toMb(contact.totalMediaSize),
      mediaCount: contact.linkedMediaIds.length,
    };
  }
}
