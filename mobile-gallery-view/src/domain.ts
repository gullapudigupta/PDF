export type RuntimeTarget = "web" | "mobile" | "extension";

export type FolderType =
  | "whatsapp"
  | "screenshots"
  | "camera"
  | "downloads"
  | "other";

export interface MediaItem {
  id: string;
  path: string;
  folderType: FolderType;
  sourceApp: string;
  width: number;
  height: number;
  fileSize: number;
  hashExact: string;
  hashPerceptual: string;
  faceCount: number;
  faceVisibilityScore: number;
  blurScore: number;
  qualityScore: number;
  categoryFlags: string[];
}

export interface ContactProfile {
  id: string;
  displayName: string;
  sourceType: "imported" | "generated";
  groupId?: string;
  linkedMediaIds: string[];
  totalMediaSize: number;
}

export interface CleanupDecision {
  mediaId: string;
  decision: "keep" | "delete";
  reasons: string[];
  confidence: number;
  reviewedByUser: boolean;
  timestamp: string;
}

export interface CandidateItem {
  mediaId: string;
  reasons: string[];
  confidence: number;
  flags: string[];
}

export interface DuplicateCluster {
  clusterId: string;
  mediaIds: string[];
  confidence: number;
  reason: string;
}

export interface CleanupSummary {
  totalCandidates: number;
  totalBytesMarked: number;
  estimatedSavingsMb: number;
  emptyFoldersToRemove: string[];
}

export interface FolderScanInput {
  rootPaths: string[];
}

export interface ContactImportRecord {
  contactId: string;
  displayName: string;
  groupId?: string;
}

export interface ThresholdConfig {
  blurMinScore: number;
  lowQualityMinScore: number;
  lowFaceVisibilityThreshold: number;
  duplicatePerceptualDistance: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  blurMinScore: 0.4,
  lowQualityMinScore: 0.45,
  lowFaceVisibilityThreshold: 0.4,
  duplicatePerceptualDistance: 8,
};
