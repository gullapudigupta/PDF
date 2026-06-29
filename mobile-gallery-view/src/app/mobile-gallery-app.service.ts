import { PlatformAdapter } from "../adapters/platform-adapter";
import { validateRuntimeAdapters } from "../adapters/runtime-validator";
import { CatalogService, FolderInferenceService } from "../catalog/catalog.service";
import { CleanupService } from "../cleanup/cleanup.service";
import { ContactImportService } from "../contact/contact-import.service";
import {
  CleanupDecision,
  DEFAULT_THRESHOLDS,
  FolderScanInput,
  RuntimeTarget,
} from "../domain";
import { LocalStoreService } from "../persistence/local-store.service";
import { AnalysisPipelineService } from "../quality/analysis-pipeline.service";
import { ReviewService } from "../review/review.service";
import { AuditLogService } from "../telemetry/audit-log.service";
import { MobileGalleryViewModel, MobileGalleryViewModelService } from "../ui/mobile-gallery-view-model.service";

export interface AppRunOptions {
  runtimeTarget: RuntimeTarget;
  scan: FolderScanInput;
  contactImportFilePath?: string;
}

export interface AppRunResult {
  runtimeValidation: Awaited<ReturnType<typeof validateRuntimeAdapters>>;
  viewModel: MobileGalleryViewModel;
  dryRun: ReturnType<CleanupService["dryRun"]>;
  undoTicket: Awaited<ReturnType<CleanupService["confirmDelete"]>>;
}

export class MobileGalleryAppService {
  private readonly store = new LocalStoreService();
  private readonly audit = new AuditLogService();

  constructor(private readonly adapters: Record<RuntimeTarget, PlatformAdapter>) {}

  async run(options: AppRunOptions): Promise<AppRunResult> {
    const activeAdapter = this.adapters[options.runtimeTarget];
    if (!activeAdapter) {
      throw new Error(`Missing runtime adapter: ${options.runtimeTarget}`);
    }

    const catalog = new CatalogService(activeAdapter, new FolderInferenceService());
    const contactImporter = new ContactImportService(activeAdapter);
    const analysis = new AnalysisPipelineService(DEFAULT_THRESHOLDS);
    const review = new ReviewService();
    const cleanup = new CleanupService(activeAdapter);
    const ui = new MobileGalleryViewModelService();

    const media = await catalog.scan(options.scan);
    this.store.saveManifest({
      id: `scan-${Date.now()}`,
      createdAt: activeAdapter.nowIso(),
      rootPaths: options.scan.rootPaths,
      mediaCount: media.length,
    });

    const importedContacts = options.contactImportFilePath
      ? await contactImporter.importContacts(options.contactImportFilePath)
      : null;

    const contacts = contactImporter.mapContacts(media, importedContacts);
    this.store.saveMedia(media);
    this.store.saveContacts(contacts);

    const analyzed = analysis.run(media);
    const candidates = review.buildCandidates(analyzed.analyzed, analyzed.duplicateClusters);

    const decisions: CleanupDecision[] = candidates.map((candidate) =>
      review.createDecision(candidate.mediaId, "delete", candidate.reasons, candidate.confidence)
    );

    this.store.saveDecisions(decisions);
    const dryRun = cleanup.dryRun(analyzed.analyzed, decisions);
    this.audit.record("dry-run", dryRun as unknown as Record<string, unknown>);

    const viewModel = ui.build(
      review.groupFirstSort(contacts),
      analyzed.analyzed,
      candidates,
      dryRun.totalBytesMarked
    );

    const undoTicket = await cleanup.confirmDelete(analyzed.analyzed, decisions);
    this.audit.record("confirmed-delete", { undoTicket });

    const removedFolders = await cleanup.cleanupEmptyFolders(options.scan.rootPaths);
    this.audit.record("empty-folder-cleanup", { removedFolders });

    const runtimeValidation = await validateRuntimeAdapters(Object.values(this.adapters), options.scan.rootPaths[0] ?? "");

    return {
      runtimeValidation,
      viewModel,
      dryRun,
      undoTicket,
    };
  }
}
