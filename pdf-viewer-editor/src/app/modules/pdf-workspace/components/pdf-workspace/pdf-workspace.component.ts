import { AfterViewChecked, ChangeDetectorRef, Component, ComponentRef, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, QueryList, SimpleChanges, TemplateRef, ViewChild, ViewChildren, ViewContainerRef, inject } from '@angular/core';import { Store } from '@ngrx/store';
import { RuntimeService } from '@core/services/runtime.service';
import type { SignedPdfResult } from '../pdf-signatures/pdf-sign-dialog.component';
import { OpenedPdfFile } from '@core/adapters/runtime.adapter';
import { PasswordResponses } from 'pdfjs-dist';
import { PdfDocumentService, LoadedPdfDocument, PdfPasswordCancelledError } from '../../services/pdf-document.service';
import { PdfRenderService } from '../../services/pdf-render.service';
import { HistoryService } from '../../services/history.service';
import { AnnotationService } from '../../services/annotation.service';
import { PdfPageOperationsService } from '../../services/pdf-page-operations.service';
import { PdfEditSerializationService } from '../../services/pdf-edit-serialization.service';
import { PdfFormField, PdfFormFieldPlacement, PdfFormService } from '../../services/pdf-form.service';
import { PdfMetadata, PdfProtectionOptions, PdfSecurityService } from '../../services/pdf-security.service';
import { PdfPageExportService, PdfPageImageFormat } from '../../services/pdf-page-export.service';
import { AiChatComponent } from '../ai-chat/ai-chat.component';
import { ActionStatus, ActionStatusKind } from '../action-status/action-status.component';
import { PersistenceService, RecentFileRecord } from '@core/services/persistence.service';
import { Annotation, AnnotationType } from '../../models/annotation.model';
import { recordEditCommand, redoEditCommand, undoEditCommand } from '../../store/workspace.actions';

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type EditableObjectType = 'text' | 'image' | 'link';
type ViewingMode = 'single' | 'continuous' | 'facing';
type WorkspaceTheme = 'light' | 'dark';
type ToolbarGroup = 'editing' | 'search' | 'navigation' | 'annotations';
export type ZoomMode = 'custom' | 'fit-page' | 'fit-width';
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export interface SearchHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkspaceOpenRequest {
  multiple: boolean;
  recent?: RecentFileRecord;
}

interface ToolbarVisibility {
  editing: boolean;
  search: boolean;
  navigation: boolean;
  annotations: boolean;
}

interface EditableObject {
  id: string;
  type: EditableObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  text?: string;
  imageSrc?: string;
  url?: string;
  pageNumber?: number;
  fontSize?: number;
  bold?: boolean;
}

interface SearchResult {
  page: number;
  count: number;
  excerpt: string;
}

interface PdfBookmark {
  title: string;
  page: number | null;
  depth: number;
}

interface CropRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FormWidget {
  id: string;
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown';
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  options: string[];
  option: string;
  date: boolean;
  readOnly: boolean;
  required: boolean;
}

interface FormVisibilityRule {
  targetFieldName: string;
  sourceFieldName: string;
  equalsValue: string;
}

interface SignatureAsset {
  id: string;
  name: string;
  kind: 'signature' | 'initials';
  data: string;
}

@Component({
  selector: 'app-pdf-workspace',
  standalone: false,
  templateUrl: './pdf-workspace.component.html',
  styleUrls: ['./pdf-workspace.component.css'],
})
export class PdfWorkspaceComponent implements AfterViewChecked, OnChanges, OnDestroy, OnInit {
  @Input() tabManaged = false;
  @Input() workspaceId = '';
  @Input() commandTemplate: TemplateRef<unknown> | null = null;
  @Input() active = true;
  @Input() initialFile: OpenedPdfFile | null = null;
  @Output() openRequested = new EventEmitter<WorkspaceOpenRequest>();
  @Output() closeRequested = new EventEmitter<void>();

  get toolsPanelId(): string { return this.workspaceId ? `${this.workspaceId}-tools` : 'workspace-tools'; }
  get chatPanelId(): string { return this.workspaceId ? `${this.workspaceId}-chat` : 'workspace-chat'; }
  @ViewChild('viewerCanvas') viewerCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('toolsToggle') toolsToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('chatToggle') chatToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('toolsPanel') toolsPanel?: ElementRef<HTMLElement>;
  @ViewChild('chatPanel') chatPanel?: ElementRef<HTMLElement>;
  @ViewChild(AiChatComponent) aiChat?: AiChatComponent;
  @ViewChild('viewerHost') viewerHost?: ElementRef<HTMLDivElement>;
  @ViewChild('stageHost') stageHost?: ElementRef<HTMLDivElement>;
  @ViewChild('annotationLayer') annotationLayer?: ElementRef<HTMLDivElement>;
  @ViewChild('multiPageView') multiPageView?: ElementRef<HTMLDivElement>;
  @ViewChildren('modePageCanvas') modePageCanvases?: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChild('signatureCanvas') signatureCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('signatureHost', { read: ViewContainerRef, static: true }) signatureHost?: ViewContainerRef;
  private signatureWindow: ComponentRef<unknown> | null = null;
  signatureLoading = false;

  compactLayout = window.innerWidth < 1024;
  toolsOpen = !this.compactLayout;
  chatOpen = !this.compactLayout;
  private panelLayoutFrame: number | null = null;

  document: LoadedPdfDocument | null = null;
  loading = false;
  error: string | null = null;
  searchQuery = '';
  searchMessage = '';
  searchCaseSensitive = false;
  searchRegexMode = false;
  searching = false;
  searchResults: SearchResult[] = [];
  currentSearchResultIndex = 0;
  searchHighlights: SearchHighlight[] = [];
  searchHitIndex = 0;
  private pendingSearchHit: 'first' | 'last' = 'first';
  private wheelZoomBusy = false;
  visibleThumbnailPages: number[] = [];
  thumbnailItemHeight = 140;
  readonly thumbnailRenderStates = new Map<number, 'loading' | 'ready' | 'error'>();
  readonly thumbnailSources = new Map<number, string>();
  thumbnailError: string | null = null;
  bookmarks: PdfBookmark[] = [];
  bookmarksLoading = false;
  bookmarkError: string | null = null;
  formWidgets: FormWidget[] = [];
  formFields: PdfFormField[] = [];
  formAuthoringType: PdfFormFieldPlacement['type'] | null = null;
  selectedFormFieldName: string | null = null;
  formVisibilityRules: FormVisibilityRule[] = [];
  signatureDialogOpen = false;
  signatureKind: SignatureAsset['kind'] = 'signature';
  signatureMode: 'draw' | 'type' | 'upload' = 'draw';
  signatureText = '';
  signatureAssets: SignatureAsset[] = [];
  signatureError: string | null = null;
  passwordPrompt = false;
  passwordPromptMessage = '';
  pdfPasswordInput = '';
  metadataDialogOpen = false;
  metadata: PdfMetadata = { title: '', author: '', subject: '', keywords: '' };
  protectionDialogOpen = false;
  dialogError: string | null = null;
  actionStatus: ActionStatus | null = null;
  actionBusy = false;
  private actionStatusTimer: ReturnType<typeof setTimeout> | null = null;
  pageExportFormat: PdfPageImageFormat = 'png';
  recentFiles: RecentFileRecord[] = [];
  toolbarVisibility: ToolbarVisibility = {
    editing: true,
    search: true,
    navigation: true,
    annotations: true,
  };
  selectedPages: number[] = [];
  cropMode = false;
  cropDraft: CropRectangle | null = null;
  cropSelection: CropRectangle | null = null;

  currentPage = 1;
  totalPages = 0;
  zoom = 1;
  zoomMode: ZoomMode = 'fit-page';
  readonly zoomPresets = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
  rotation = 0;
  viewingMode: ViewingMode = 'single';
  theme: WorkspaceTheme = 'light';
  darkPageRendering = false;
  private preferredViewingMode: ViewingMode = 'single';
  private preferredTheme: WorkspaceTheme = 'light';
  private preferredDarkPageRendering = false;

  overlayObjects: EditableObject[] = [];
  selectedObjectId: string | null = null;
  clipboardObject: EditableObject | null = null;
  overlayWidth = 0;
  overlayHeight = 0;
  pagePixelsPerPoint = 1;
  textFontSize = 12;
  textBold = false;
  canUndo = false;
  canRedo = false;
  annotations: Annotation[] = [];
  annotationTool: 'highlight' | 'comment' | 'draw' | null = null;
  annotationFilter = 'all';
  annotationSearch = '';
  annotationColor = '#ffeb3b';
  annotationOpacity = 0.45;
  annotationDraft: { type: AnnotationType; rect: { x: number; y: number; width: number; height: number }; content: string; startX: number; startY: number; points: string[] } | null = null;

  private dragState:
    | {
        mode: 'move' | 'resize';
        objectId: string;
        startX: number;
        startY: number;
        original: EditableObject;
        handle?: ResizeHandle;
      }
    | null = null;
  private searchIndex: { documentId: string; pages: string[] } | null = null;
  private readonly thumbnailRenderScheduled = new Set<number>();
  private readonly pageTransformUndo: Uint8Array[] = [];
  private readonly pageTransformRedo: Uint8Array[] = [];
  private renderedModeKey = '';
  private viewStateSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private cropStartX = 0;
  private cropStartY = 0;
  private signatureDataUrl = '';
  private signatureHasMarks = false;
  private drawingSignature = false;
  private cropResizeState: { handle: 'nw' | 'ne' | 'sw' | 'se'; original: CropRectangle; startX: number; startY: number } | null = null;
  private draggedPage: number | null = null;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedFilePath: string | null = null;
  private passwordResolver: ((password: string | null) => void) | null = null;

  private readonly hostElement: ElementRef<HTMLElement> = inject(ElementRef);

  constructor(
    private store: Store,
    private runtimeService: RuntimeService,
    private pdfDocumentService: PdfDocumentService,
    private pdfRenderService: PdfRenderService,
    private historyService: HistoryService<EditableObject[]>,
    private annotationService: AnnotationService,
    private pageOperationsService: PdfPageOperationsService,
    private editSerializationService: PdfEditSerializationService,
    private pdfFormService: PdfFormService,
    private pdfSecurityService: PdfSecurityService,
    private pdfPageExportService: PdfPageExportService,
    private persistenceService: PersistenceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.refreshRecentFiles();
    void this.loadWorkspacePreferences();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialFile'] && this.initialFile) {
      void this.openFile(this.initialFile.file, this.initialFile.filePath);
    }
    if (changes['active'] && this.active) this.schedulePanelRender();
    if (changes['active'] && !this.active && (this.aiChat?.busy || this.aiChat?.extracting)) this.aiChat.cancel();
  }

  ngAfterViewChecked(): void {
    if (!this.active) return;
    this.renderVisibleThumbnails();
    void this.renderModePagesIfNeeded();
  }

  ngOnDestroy(): void {
    this.closeSignatureWindow();
    if (this.actionStatusTimer) clearTimeout(this.actionStatusTimer);
    if (this.panelLayoutFrame !== null) cancelAnimationFrame(this.panelLayoutFrame);
    if (this.viewStateSaveTimer) clearTimeout(this.viewStateSaveTimer);
    this.cancelPasswordPrompt();
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
      void this.autosaveNow();
    }
    this.pdfDocumentService.closeCurrent();
  }

  async openFile(file?: File, filePath?: string): Promise<void> {
    if (!file && this.tabManaged) {
      this.openRequested.emit({ multiple: false });
      return;
    }
    try {
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
        if (!(await this.autosaveNow())) return;
      }
      this.loading = true;
      this.error = null;
      this.searchMessage = '';
      this.searchIndex = null;

      const result = file ? { canceled: false, file, filePath } : await this.runtimeService.openFileDialog();
      if (result.canceled || !result.file) {
        this.loading = false;
        return;
      }

      this.document = await this.pdfDocumentService.loadFromFile(
        result.file,
        reason => this.requestPdfPassword(reason)
      );
      await this.activateLoadedDocument(this.document, result.filePath);
      await this.persistRecentDocument(result.filePath ?? null);
    } catch (err) {
      this.error = err instanceof PdfPasswordCancelledError
        ? null
        : err instanceof Error ? err.message : 'Failed to open PDF';
      this.loading = false;
    } finally {
      this.cdr.markForCheck();
    }
  }

  async openRecentFile(recent: RecentFileRecord): Promise<void> {
    if (this.tabManaged) {
      this.openRequested.emit({ multiple: false, recent });
      return;
    }
    if (!this.runtimeService.isDesktop() || !recent.path) {
      await this.openFile();
      return;
    }
    try {
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
        if (!(await this.autosaveNow())) return;
      }
      this.loading = true;
      this.error = null;
      const data = await this.runtimeService.readFile(recent.path);
      this.document = await this.pdfDocumentService.loadFromBytes(
        new Uint8Array(data),
        recent.name,
        recent.id,
        reason => this.requestPdfPassword(reason)
      );
      await this.activateLoadedDocument(this.document, recent.path);
      await this.persistRecentDocument(recent.path);
    } catch (error) {
      this.error = error instanceof PdfPasswordCancelledError
        ? null
        : `Unable to reopen ${recent.name}: ${error instanceof Error ? error.message : String(error)}`;
      this.loading = false;
    }
  }

  async toggleRecentPin(recent: RecentFileRecord): Promise<void> {
    try {
      await this.persistenceService.setRecentFilePinned(recent.id, !recent.isPinned);
      await this.refreshRecentFiles();
    } catch (error) {
      this.error = `Unable to update pinned PDF: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async removeRecentFile(recent: RecentFileRecord): Promise<void> {
    try {
      await this.persistenceService.removeRecentFileRecord(recent.id);
      await this.refreshRecentFiles();
    } catch (error) {
      this.error = `Unable to remove recent PDF: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async closeDocument(force = false): Promise<void> {
    if (this.tabManaged && !force) {
      this.closeRequested.emit();
      return;
    }
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
      if (!(await this.autosaveNow())) return;
    }
    this.pdfDocumentService.closeCurrent();
    this.document = null;
    this.totalPages = 0;
    this.currentPage = 1;
    this.overlayObjects = [];
    this.annotations = [];
    this.formWidgets = [];
    this.formFields = [];
    this.selectedObjectId = null;
    this.annotationTool = null;
    this.viewingMode = this.preferredViewingMode;
    this.renderedModeKey = '';
    this.thumbnailRenderStates.clear();
    this.thumbnailSources.clear();
    this.visibleThumbnailPages = [];
    this.cdr.detectChanges();
  }

  private async activateLoadedDocument(document: LoadedPdfDocument, filePath?: string): Promise<void> {
    if (!this.document) return;
    this.formWidgets = [];
    this.formFields = [];
    this.formVisibilityRules = [];
    this.savedFilePath = this.runtimeService.isDesktop() ? filePath ?? null : null;
    if (!document.isEncrypted) {
      const autosaveData = await this.persistenceService.getAutosaveData(document.id);
      if (autosaveData && !this.sameBytes(document.bytes, new Uint8Array(autosaveData))) {
        if (window.confirm(`Recover the autosaved version of ${document.name}?`)) {
          this.document = await this.pdfDocumentService.replaceCurrentDocumentBytes(new Uint8Array(autosaveData));
        } else {
          await this.persistenceService.clearAutosave(document.id);
        }
      } else if (autosaveData) {
        await this.persistenceService.clearAutosave(document.id);
      }
    }
    if (!this.document) return;
    this.totalPages = this.document.totalPages;
    this.thumbnailRenderStates.clear();
    this.thumbnailSources.clear();
    this.thumbnailRenderScheduled.clear();
    this.thumbnailError = null;
    this.visibleThumbnailPages = [];
    this.updateThumbnailWindow(0, 360);
    await this.loadBookmarks();
    const viewState = await this.persistenceService.getSetting<{
      page?: number;
      zoom?: number;
      zoomMode?: ZoomMode;
      viewingMode?: ViewingMode;
      theme?: WorkspaceTheme;
      darkPageRendering?: boolean;
    }>(
      `workspaceView:${document.id}`
    );
    this.currentPage = Number.isInteger(viewState?.page)
      ? Math.min(Math.max(viewState!.page!, 1), this.totalPages)
      : 1;
    const savedZoom = typeof viewState?.zoom === 'number' && Number.isFinite(viewState.zoom) ? viewState.zoom : null;
    this.zoomMode = viewState?.zoomMode === 'custom' && savedZoom !== null ? 'custom'
      : viewState?.zoomMode === 'fit-width' ? 'fit-width' : 'fit-page';
    this.zoom = this.zoomMode === 'custom' ? this.clampZoom(savedZoom!) : 1;
    this.searchHighlights = [];
    this.viewingMode = viewState?.viewingMode && ['single', 'continuous', 'facing'].includes(viewState.viewingMode)
      ? viewState.viewingMode
      : this.preferredViewingMode;
    this.theme = viewState?.theme === 'light' || viewState?.theme === 'dark'
      ? viewState.theme
      : this.preferredTheme;
    this.darkPageRendering = typeof viewState?.darkPageRendering === 'boolean'
      ? viewState.darkPageRendering
      : this.preferredDarkPageRendering;
    this.rotation = 0;
    this.renderedModeKey = '';
    this.overlayObjects = [];
    this.annotations = document.isEncrypted ? [] : this.annotationService.list(document.id);
    this.annotationTool = null;
    this.annotationDraft = null;
    this.selectedObjectId = null;
    this.clipboardObject = null;
    this.historyService.clear();
    this.syncHistoryState();
    this.loading = false;
    this.cdr.detectChanges();

    await this.renderCurrentPage();
  }

  private async persistRecentDocument(path: string | null): Promise<void> {
    if (!this.document) return;
    try {
      await this.persistenceService.recordRecentFile({
        id: this.document.id,
        name: this.document.name,
        path,
        lastOpenedAt: Date.now(),
      });
      await this.refreshRecentFiles();
    } catch (error) {
      this.error = `PDF opened, but recent-file history could not be saved: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async refreshRecentFiles(): Promise<void> {
    try {
      this.recentFiles = await this.persistenceService.listRecentFileRecords();
    } catch (error) {
      this.error = `Unable to load recent PDFs: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  get viewingPages(): number[] {
    if (this.viewingMode === 'continuous') {
      if (!this.totalPages) return [];
      const first = Math.max(1, this.currentPage - 2);
      const last = Math.min(this.totalPages, this.currentPage + 2);
      return Array.from({ length: last - first + 1 }, (_, index) => first + index);
    }
    if (this.viewingMode === 'facing') {
      const firstPage = this.getFacingStart(this.currentPage);
      return [firstPage, firstPage + 1].filter(page => page <= this.totalPages);
    }
    return [this.currentPage];
  }

  get modeCanvasPages(): number[] {
    if (this.viewingMode === 'continuous') {
      return this.viewingPages.filter(page => Math.abs(page - this.currentPage) <= 2);
    }
    return this.viewingPages;
  }

  get estimatedPageHeight(): number {
    const availableWidth = Math.max(240, (this.multiPageView?.nativeElement.clientWidth ?? 960) - 32);
    const pageWidth = this.viewingMode === 'facing' ? Math.max(120, (availableWidth - 16) / 2) : availableWidth;
    return Math.ceil(pageWidth * 1.3);
  }

  get continuousTopSpacerHeight(): number {
    const firstPage = this.viewingPages[0] ?? 1;
    return Math.max(0, (firstPage - 1) * this.continuousPageStride - 20);
  }

  get continuousBottomSpacerHeight(): number {
    const pages = this.viewingPages;
    const lastPage = pages[pages.length - 1] ?? 0;
    return Math.max(0, (this.totalPages - lastPage) * this.continuousPageStride - 20);
  }

  private get continuousPageStride(): number {
    return this.estimatedPageHeight + 42;
  }

  shouldRenderModePage(page: number): boolean {
    return this.viewingMode === 'continuous'
      ? Math.abs(page - this.currentPage) <= 2
      : this.viewingMode === 'facing' && this.viewingPages.includes(page);
  }

  get atFirstViewingSpread(): boolean {
    return this.viewingMode === 'facing' ? this.getFacingStart(this.currentPage) <= 1 : this.currentPage <= 1;
  }

  get atLastViewingSpread(): boolean {
    return this.viewingMode === 'facing'
      ? this.getFacingStart(this.currentPage) + 1 >= this.totalPages
      : this.currentPage >= this.totalPages;
  }

  private getFacingStart(page: number): number {
    return page % 2 === 0 ? page - 1 : page;
  }

  trackPageNumber(_index: number, page: number): number {
    return page;
  }

  async setViewingMode(mode: ViewingMode): Promise<void> {
    if (!['single', 'continuous', 'facing'].includes(mode) || mode === this.viewingMode) return;
    this.viewingMode = mode;
    this.preferredViewingMode = mode;
    this.renderedModeKey = '';
    await this.persistWorkspacePreferences();
    await this.persistWorkspaceViewState();
    this.cdr.detectChanges();
    if (mode === 'single') await this.renderCurrentPage();
    else this.scrollToModePage(this.currentPage);
  }

  async setTheme(theme: WorkspaceTheme): Promise<void> {
    if (theme !== 'light' && theme !== 'dark') return;
    this.theme = theme;
    this.preferredTheme = theme;
    await this.persistWorkspacePreferences();
    await this.persistWorkspaceViewState();
  }

  async setDarkPageRendering(enabled: boolean): Promise<void> {
    this.darkPageRendering = enabled;
    this.preferredDarkPageRendering = enabled;
    this.renderedModeKey = '';
    await this.persistWorkspacePreferences();
    await this.persistWorkspaceViewState();
  }

  onMultiPageScroll(event: Event): void {
    if (this.viewingMode !== 'continuous') return;
    const container = event.currentTarget as HTMLElement;
    const currentPage = Math.min(
      this.totalPages,
      Math.max(1, Math.floor(container.scrollTop / this.continuousPageStride) + 1)
    );
    if (currentPage === this.currentPage) return;
    this.currentPage = currentPage;
    this.scheduleWorkspaceViewStateSave();
  }

  private async loadWorkspacePreferences(): Promise<void> {
    try {
      const preferences = await this.persistenceService.getSetting<{
        theme?: WorkspaceTheme;
        darkPageRendering?: boolean;
        viewingMode?: ViewingMode;
        toolbarVisibility?: Partial<ToolbarVisibility>;
      }>(
        'workspacePreferences'
      );
      if (preferences?.theme === 'light' || preferences?.theme === 'dark') {
        this.preferredTheme = this.theme = preferences.theme;
      }
      if (typeof preferences?.darkPageRendering === 'boolean') {
        this.preferredDarkPageRendering = this.darkPageRendering = preferences.darkPageRendering;
      }
      if (preferences?.viewingMode && ['single', 'continuous', 'facing'].includes(preferences.viewingMode)) {
        this.preferredViewingMode = this.viewingMode = preferences.viewingMode;
      }
      if (preferences?.toolbarVisibility) {
        this.toolbarVisibility = {
          editing: typeof preferences.toolbarVisibility.editing === 'boolean'
            ? preferences.toolbarVisibility.editing : this.toolbarVisibility.editing,
          search: typeof preferences.toolbarVisibility.search === 'boolean'
            ? preferences.toolbarVisibility.search : this.toolbarVisibility.search,
          navigation: typeof preferences.toolbarVisibility.navigation === 'boolean'
            ? preferences.toolbarVisibility.navigation : this.toolbarVisibility.navigation,
          annotations: typeof preferences.toolbarVisibility.annotations === 'boolean'
            ? preferences.toolbarVisibility.annotations : this.toolbarVisibility.annotations,
        };
      }
    } catch (error) {
      this.error = `Unable to load viewer preferences: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async persistWorkspacePreferences(): Promise<void> {
    try {
      await this.persistenceService.setSetting('workspacePreferences', {
        theme: this.preferredTheme,
        darkPageRendering: this.preferredDarkPageRendering,
        viewingMode: this.preferredViewingMode,
        toolbarVisibility: { ...this.toolbarVisibility },
      });
    } catch (error) {
      this.error = `Unable to save viewer preferences: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async setToolbarVisibility(group: ToolbarGroup, visible: boolean): Promise<void> {
    this.toolbarVisibility = { ...this.toolbarVisibility, [group]: visible };
    await this.persistWorkspacePreferences();
  }

  private async persistWorkspaceViewState(): Promise<void> {
    if (!this.document) return;
    try {
      await this.persistenceService.setSetting(`workspaceView:${this.document.id}`, {
        page: this.currentPage,
        zoom: this.zoom,
        zoomMode: this.zoomMode,
        viewingMode: this.viewingMode,
        theme: this.theme,
        darkPageRendering: this.darkPageRendering,
      });
    } catch (error) {
      this.error = `Unable to save document view state: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private scheduleWorkspaceViewStateSave(): void {
    if (this.viewStateSaveTimer) clearTimeout(this.viewStateSaveTimer);
    this.viewStateSaveTimer = setTimeout(() => {
      this.viewStateSaveTimer = null;
      void this.persistWorkspaceViewState();
    }, 250);
  }

  setActionStatus(kind: ActionStatusKind, message: string): void {
    if (this.actionStatusTimer) {
      clearTimeout(this.actionStatusTimer);
      this.actionStatusTimer = null;
    }
    this.actionStatus = { kind, message };
    if (kind === 'success' || kind === 'info') {
      this.actionStatusTimer = setTimeout(() => {
        this.actionStatusTimer = null;
        this.actionStatus = null;
        this.cdr.markForCheck();
      }, 6000);
    }
    this.cdr.markForCheck();
  }

  dismissActionStatus(): void {
    if (this.actionStatusTimer) clearTimeout(this.actionStatusTimer);
    this.actionStatusTimer = null;
    this.actionStatus = null;
    this.cdr.markForCheck();
  }

  /**
   * Runs a user-triggered document action and reports each stage: progress while
   * running, success (work returns a message), cancellation (work returns null), or failure.
   */
  private async runAction(
    progress: string,
    failure: string,
    work: () => Promise<string | null>,
    cancelled = 'Action cancelled. No changes were saved.'
  ): Promise<boolean> {
    if (this.actionBusy) {
      this.setActionStatus('info', 'Please wait for the current action to finish.');
      return false;
    }
    this.actionBusy = true;
    this.setActionStatus('progress', progress);
    try {
      const result = await work();
      if (result === null) this.setActionStatus('info', cancelled);
      else this.setActionStatus('success', result);
      return result !== null;
    } catch (error) {
      this.setActionStatus('error', `${failure}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      this.actionBusy = false;
      this.cdr.markForCheck();
    }
  }

  private isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  }

  private pluralize(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
  }

  async saveFile(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    await this.saveCurrentPdf(false);
  }

  async saveFileAs(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    await this.saveCurrentPdf(true);
  }

  openMetadataDialog(): void {
    if (!this.document || this.document.isEncrypted) return;
    if (this.compactLayout) this.closePanels();
    this.error = null;
    this.dialogError = null;
    this.protectionDialogOpen = false;
    void this.pdfSecurityService.getMetadata(this.document.bytes).then(
      metadata => {
        this.metadata = metadata;
        this.metadataDialogOpen = true;
        this.cdr.markForCheck();
      },
      error => {
        this.error = `Unable to read PDF metadata: ${error instanceof Error ? error.message : String(error)}`;
        this.cdr.markForCheck();
      }
    );
  }

  closeMetadataDialog(): void {
    this.metadataDialogOpen = false;
    this.dialogError = null;
  }

  async saveMetadata(metadata: PdfMetadata = this.metadata): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    this.actionBusy = true;
    this.dialogError = null;
    try {
      const updatedBytes = await this.pdfSecurityService.updateMetadata(this.document.bytes, metadata);
      this.document = await this.pdfDocumentService.replaceCurrentDocumentBytes(updatedBytes);
      this.metadata = { ...metadata };
      this.metadataDialogOpen = false;
      await this.renderCurrentPage();
      this.scheduleAutosave();
      this.error = null;
      this.setActionStatus('success', 'Document properties updated. Save the PDF to keep them in the file.');
    } catch (error) {
      this.dialogError = `Unable to update PDF metadata: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.actionBusy = false;
      this.cdr.markForCheck();
    }
  }

  openProtectionDialog(): void {
    if (!this.document || this.document.isEncrypted) return;
    if (this.compactLayout) this.closePanels();
    this.error = null;
    this.dialogError = null;
    this.metadataDialogOpen = false;
    this.protectionDialogOpen = true;
  }

  closeProtectionDialog(): void {
    this.protectionDialogOpen = false;
    this.dialogError = null;
  }

  async protectCurrentPdf(options: PdfProtectionOptions): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    this.actionBusy = true;
    this.dialogError = null;
    this.setActionStatus('progress', 'Encrypting a protected copy of the PDF...');
    try {
      const bytes = await this.serializeCurrentDocument();
      const protectedBytes = await this.pdfSecurityService.protect(bytes, options);
      const name = `${this.document.name.replace(/\.pdf$/i, '')}-protected.pdf`;
      const result = await this.runtimeService.saveFileDialog(name, this.toArrayBuffer(protectedBytes));
      if (!result.canceled) {
        this.protectionDialogOpen = false;
        this.error = null;
        this.setActionStatus('success', `Protected copy saved as ${this.savedName(result, name)}. The open document is unchanged.`);
      } else {
        this.setActionStatus('info', 'Save cancelled. The protected copy was not saved.');
      }
    } catch (error) {
      this.dialogError = `Unable to protect PDF: ${error instanceof Error ? error.message : String(error)}`;
      this.setActionStatus('error', this.dialogError);
    } finally {
      this.actionBusy = false;
      this.cdr.markForCheck();
    }
  }

  /** Opens the certificate signing dialog. Its code and node-forge load only on first use. */
  async openSignDialog(): Promise<void> {
    if (!this.document || this.document.isEncrypted || this.signatureLoading) return;
    const document = this.document;
    await this.openSignatureWindow(async host => {
      const { PdfSignDialogComponent } = await import('../pdf-signatures/pdf-sign-dialog.component');
      const ref = host.createComponent(PdfSignDialogComponent);
      ref.setInput('fileName', document.name);
      ref.setInput('pageCount', document.totalPages);
      ref.setInput('currentPage', this.currentPage);
      ref.setInput('prepareDocument', () => this.serializeCurrentDocument());
      ref.instance.cancel.subscribe(() => this.closeSignatureWindow());
      ref.instance.signed.subscribe(result => void this.saveSignedCopy(document.name, result));
      return ref;
    });
  }

  /** Opens the signature verification panel for the PDF as it is currently loaded. */
  async openSignaturesPanel(): Promise<void> {
    if (!this.document || this.signatureLoading) return;
    const document = this.document;
    await this.openSignatureWindow(async host => {
      const { PdfSignaturesPanelComponent } = await import('../pdf-signatures/pdf-signatures-panel.component');
      const ref = host.createComponent(PdfSignaturesPanelComponent);
      ref.setInput('fileName', document.name);
      ref.setInput('pdfBytes', document.bytes);
      ref.instance.close.subscribe(() => this.closeSignatureWindow());
      return ref;
    });
  }

  closeSignatureWindow(): void {
    this.signatureWindow?.destroy();
    this.signatureWindow = null;
    this.cdr.markForCheck();
  }

  private async openSignatureWindow(create: (host: ViewContainerRef) => Promise<ComponentRef<unknown>>): Promise<void> {
    if (!this.signatureHost) return;
    if (this.compactLayout) this.closePanels();
    this.closeSignatureWindow();
    this.signatureLoading = true;
    this.cdr.markForCheck();
    try {
      this.signatureWindow = await create(this.signatureHost);
    } catch (error) {
      this.setActionStatus('error', `Unable to open digital signatures: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.signatureLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async saveSignedCopy(sourceName: string, result: SignedPdfResult): Promise<void> {
    this.closeSignatureWindow();
    const name = `${sourceName.replace(/\.pdf$/i, '')}-signed.pdf`;
    this.setActionStatus('progress', 'Saving the signed copy...');
    try {
      const saved = await this.savePdfBytes(name, result.bytes);
      if (saved.canceled) {
        this.setActionStatus('info', 'Save cancelled. The signed copy was not saved.');
        return;
      }
      const warning = result.warning ? ` ${result.warning}` : '';
      this.setActionStatus(result.warning ? 'info' : 'success',
        `Signed by ${result.signerName} and saved as ${this.savedName(saved, name)}. Open that file to check its signature; do not edit it, or the signature becomes invalid.${warning}`);
    } catch (error) {
      this.setActionStatus('error', `Unable to save the signed copy: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async exportCurrentPage(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    const document = this.document;
    const page = this.currentPage;
    const format = this.pageExportFormat.toUpperCase();
    await this.runAction(`Exporting page ${page} as ${format}...`, 'Unable to export page', async () => {
      const exported = await this.pdfPageExportService.exportPage(document.bytes, page, this.pageExportFormat);
      const baseName = document.name.replace(/\.pdf$/i, '');
      const name = `${baseName}-page-${page}.${exported.extension}`;
      const result = await this.runtimeService.saveFileDialog(name, exported.bytes, exported.mimeType);
      if (result?.canceled) return null;
      return `Page ${page} exported as ${this.savedName(result, name)}.`;
    }, 'Export cancelled. No file was saved.');
  }

  private savedName(result: { filePath?: string } | undefined, fallback: string): string {
    const path = result?.filePath;
    return path ? path.split(/[\\/]/).pop() || fallback : fallback;
  }

  private requestPdfPassword(reason: number): Promise<string | null> {
    if (this.compactLayout) this.closePanels();
    if (this.passwordResolver) this.passwordResolver(null);
    this.passwordPromptMessage = reason === PasswordResponses.INCORRECT_PASSWORD
      ? 'The password was incorrect. Try again.'
      : 'Enter the password to open this protected PDF.';
    this.pdfPasswordInput = '';
    this.passwordPrompt = true;
    this.cdr.detectChanges();
    return new Promise(resolve => {
      this.passwordResolver = resolve;
    });
  }

  submitPasswordPrompt(): void {
    const resolver = this.passwordResolver;
    if (!resolver) return;
    const password = this.pdfPasswordInput;
    this.passwordResolver = null;
    this.passwordPrompt = false;
    this.pdfPasswordInput = '';
    resolver(password);
  }

  cancelPasswordPrompt(): void {
    const resolver = this.passwordResolver;
    this.passwordResolver = null;
    this.passwordPrompt = false;
    this.pdfPasswordInput = '';
    resolver?.(null);
  }

  async autosaveNow(): Promise<boolean> {
    if (!this.document || this.document.isEncrypted) return true;
    try {
      const bytes = await this.serializeCurrentDocument();
      const data = this.toArrayBuffer(bytes);
      await this.persistenceService.saveAutosave(this.document.id, data);
      return true;
    } catch (error) {
      this.error = `Autosave failed: ${error instanceof Error ? error.message : String(error)}`;
      return false;
    }
  }

  private async saveCurrentPdf(saveAs: boolean): Promise<void> {
    if (!this.document) return;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    const documentId = this.document.id;
    const documentName = this.document.name;
    await this.runAction(saveAs ? 'Choose where to save a copy of the PDF...' : 'Saving PDF...', 'Save failed', async () => {
      const bytes = await this.serializeCurrentDocument();
      const data = this.toArrayBuffer(bytes);
      let savedName = documentName;
      if (!saveAs && this.savedFilePath && this.runtimeService.isDesktop()) {
        await this.runtimeService.writeFile(this.savedFilePath, data);
        savedName = this.savedName({ filePath: this.savedFilePath }, documentName);
      } else {
        const result = await this.runtimeService.saveFileDialog(documentName, data);
        if (result.canceled) return null;
        this.savedFilePath = this.runtimeService.isDesktop() ? result.filePath ?? null : null;
        savedName = this.savedName(result, documentName);
      }
      this.error = null;
      try {
        await this.persistenceService.clearAutosave(documentId);
      } catch (error) {
        return `Saved ${savedName}, but its recovery snapshot could not be cleared: ${error instanceof Error ? error.message : String(error)}`;
      }
      return `Saved ${savedName}.`;
    }, 'Save cancelled. Your changes are still open and unsaved.');
  }

  private async serializeCurrentDocument(): Promise<Uint8Array> {
    if (!this.document) throw new Error('No document loaded');
    if (this.document.isEncrypted) throw new Error('Password-protected PDFs are read-only in this workspace');
    return this.editSerializationService.flattenEdits(
      this.document.bytes,
      this.currentPage,
      this.overlayWidth,
      this.overlayHeight,
      this.overlayObjects,
      this.annotations
    );
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const data = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(data).set(bytes);
    return data;
  }

  private sameBytes(left: Uint8Array, right: Uint8Array): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  private scheduleAutosave(): void {
    if (!this.document || this.document.isEncrypted) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      void this.autosaveNow();
    }, 800);
  }

  async previousPage(): Promise<void> {
    if (this.atFirstViewingSpread || this.loading) {
      return;
    }

    this.currentPage = this.viewingMode === 'facing'
      ? Math.max(1, this.getFacingStart(this.currentPage) - 2)
      : this.currentPage - 1;
    await this.persistWorkspaceViewState();
    await this.renderCurrentPage();
  }

  async nextPage(): Promise<void> {
    if (this.atLastViewingSpread || this.loading) {
      return;
    }

    this.currentPage = this.viewingMode === 'facing'
      ? Math.min(this.totalPages, this.getFacingStart(this.currentPage) + 2)
      : this.currentPage + 1;
    await this.persistWorkspaceViewState();
    await this.renderCurrentPage();
  }

  onThumbnailScroll(event: Event): void {
    const viewport = event.currentTarget as HTMLElement;
    this.updateThumbnailWindow(viewport.scrollTop, viewport.clientHeight);
  }

  async goToPage(page: number): Promise<void> {
    if (!this.document || !Number.isInteger(page) || page < 1 || page > this.document.totalPages) return;
    this.currentPage = page;
    await this.persistWorkspaceViewState();
    await this.renderCurrentPage();
  }

  async loadBookmarks(): Promise<void> {
    if (!this.document) return;
    this.bookmarks = [];
    this.bookmarkError = null;
    const document = this.document;
    if (typeof document.proxy?.getOutline !== 'function') return;

    this.bookmarksLoading = true;
    try {
      const outline = await document.proxy.getOutline();
      const flatten = async (items: any[], depth: number): Promise<void> => {
        for (const item of items) {
          let page: number | null = null;
          const destination = typeof item.dest === 'string'
            ? await document.proxy.getDestination(item.dest)
            : item.dest;
          if (Array.isArray(destination) && destination[0] && typeof document.proxy.getPageIndex === 'function') {
            const pageIndex = await document.proxy.getPageIndex(destination[0]);
            if (Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < document.totalPages) page = pageIndex + 1;
          }
          this.bookmarks.push({ title: String(item.title ?? 'Untitled bookmark'), page, depth });
          if (Array.isArray(item.items) && item.items.length) await flatten(item.items, depth + 1);
        }
      };
      if (Array.isArray(outline)) await flatten(outline, 0);
    } catch (error) {
      this.bookmarks = [];
      this.bookmarkError = `Unable to load PDF bookmarks: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.bookmarksLoading = false;
    }
  }

  async navigateToBookmark(bookmark: PdfBookmark): Promise<void> {
    if (bookmark.page !== null) await this.goToPage(bookmark.page);
  }

  async deleteCurrentPage(): Promise<void> {
    if (!this.document || this.totalPages <= 1) return;
    const page = this.currentPage;
    if (!window.confirm(`Delete page ${page}? This cannot be undone, but the original file is unchanged until you save.`)) return;
    const document = this.document;
    await this.runAction(`Deleting page ${page}...`, 'Unable to delete page', async () => {
      const bytes = await this.pageOperationsService.deletePage(document.bytes, page);
      await this.refreshDocumentAfterPageOperation(bytes, Math.min(page, this.totalPages - 1));
      return `Page ${page} deleted. The document now has ${this.pluralize(this.totalPages, 'page')}.`;
    });
  }

  async insertPagesFromFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!this.document || !file) return;
    if (!this.isPdfFile(file)) {
      this.setActionStatus('error', `Unable to insert pages: ${file.name} is not a PDF file.`);
      return;
    }
    const document = this.document;
    const afterPage = this.currentPage;
    await this.runAction(`Inserting pages from ${file.name}...`, 'Unable to insert PDF pages', async () => {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const previousTotal = this.totalPages;
      const bytes = await this.pageOperationsService.insertPages(document.bytes, sourceBytes, afterPage);
      await this.refreshDocumentAfterPageOperation(bytes, afterPage + 1);
      const added = Math.max(0, this.totalPages - previousTotal);
      return `Inserted ${this.pluralize(added, 'page')} from ${file.name} after page ${afterPage}.`;
    });
  }

  async extractSelectedPages(): Promise<void> {
    if (!this.document) return;
    const selection = window.prompt(`Page range to extract (for example, 1-3,5). This PDF has ${this.pluralize(this.totalPages || this.document.totalPages, 'page')}:`);
    if (selection === null) {
      this.setActionStatus('info', 'Extract cancelled.');
      return;
    }
    if (!selection.trim()) {
      this.setActionStatus('error', 'Unable to extract pages: enter at least one page or range.');
      return;
    }
    const document = this.document;
    const name = `${document.name.replace(/\.pdf$/i, '')}-extracted.pdf`;
    await this.runAction(`Extracting pages ${selection.trim()}...`, 'Unable to extract pages', async () => {
      const bytes = await this.pageOperationsService.extractPages(document.bytes, selection);
      const result = await this.savePdfBytes(name, bytes);
      if (result.canceled) return null;
      return `Extracted pages ${selection.trim()} to ${this.savedName(result, name)}.`;
    }, 'Save cancelled. The extracted PDF was not saved.');
  }

  async mergePdfsFromFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!this.document || !files.length) return;
    const invalid = files.filter(file => !this.isPdfFile(file));
    if (invalid.length) {
      this.setActionStatus('error', `Unable to merge PDFs: ${invalid.map(file => file.name).join(', ')} ${invalid.length === 1 ? 'is not a PDF file' : 'are not PDF files'}.`);
      return;
    }
    const document = this.document;
    const name = `${document.name.replace(/\.pdf$/i, '')}-merged.pdf`;
    const total = files.length + 1;
    await this.runAction(`Merging ${total} PDFs (${document.name} first)...`, 'Unable to merge PDFs', async () => {
      const sources = await Promise.all(files.map(async file => new Uint8Array(await file.arrayBuffer())));
      const bytes = await this.pageOperationsService.mergePdfs([document.bytes, ...sources]);
      this.setActionStatus('progress', `Merged ${total} PDFs. Choose where to save ${name}...`);
      const result = await this.savePdfBytes(name, bytes);
      if (result.canceled) return null;
      return `Merged ${total} PDFs into ${this.savedName(result, name)}. The open document is unchanged.`;
    }, 'Save cancelled. The merged PDF was not saved.');
  }

  async splitSelectedPages(): Promise<void> {
    if (!this.document) return;
    const selection = window.prompt('Page ranges for separate PDFs (for example, 1-3,4-6):');
    if (selection === null) {
      this.setActionStatus('info', 'Split cancelled.');
      return;
    }
    if (!selection.trim()) {
      this.setActionStatus('error', 'Unable to split PDF: enter at least one page range.');
      return;
    }
    const document = this.document;
    await this.runAction('Splitting PDF...', 'Unable to split PDF', async () => {
      const parts = await this.pageOperationsService.splitByPageRanges(document.bytes, selection);
      const baseName = document.name.replace(/\.pdf$/i, '') || 'document';
      let saved = 0;
      for (let index = 0; index < parts.length; index++) {
        this.setActionStatus('progress', `Saving part ${index + 1} of ${parts.length}...`);
        const result = await this.savePdfBytes(`${baseName}-part-${index + 1}.pdf`, parts[index]);
        if (!result.canceled) saved++;
      }
      if (!saved) return null;
      return saved === parts.length
        ? `Split into ${this.pluralize(parts.length, 'PDF')} and saved all parts.`
        : `Split into ${this.pluralize(parts.length, 'PDF')}; saved ${saved}, skipped ${parts.length - saved}.`;
    }, 'Save cancelled. No split PDFs were saved.');
  }

  private async savePdfBytes(name: string, bytes: Uint8Array): Promise<{ canceled: boolean; filePath?: string }> {
    const result = await this.runtimeService.saveFileDialog(name, this.toArrayBuffer(bytes));
    return result ?? { canceled: false };
  }

  startPageDrag(event: DragEvent, page: number): void {
    this.draggedPage = page;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(page));
    }
  }

  allowPageDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  async dropPage(event: DragEvent, targetPage: number): Promise<void> {
    event.preventDefault();
    const sourcePage = this.draggedPage;
    this.draggedPage = null;
    if (!this.document || sourcePage === null || sourcePage === targetPage) return;
    const document = this.document;
    await this.runAction(`Moving page ${sourcePage} to position ${targetPage}...`, 'Unable to reorder pages', async () => {
      const bytes = await this.pageOperationsService.reorderPage(document.bytes, sourcePage, targetPage);
      await this.refreshDocumentAfterPageOperation(bytes, targetPage);
      return `Moved page ${sourcePage} to position ${targetPage}.`;
    });
  }

  togglePageSelection(page: number, selected: boolean): void {
    this.selectedPages = selected
      ? [...new Set([...this.selectedPages, page])]
      : this.selectedPages.filter(item => item !== page);
  }

  async rotateSelectedPages(rotation: 90 | 180 | 270): Promise<void> {
    if (!this.document) return;
    const pageNumbers = this.selectedPages.length ? this.selectedPages : [this.currentPage];
    const document = this.document;
    const label = pageNumbers.length === 1 ? `page ${pageNumbers[0]}` : `${pageNumbers.length} pages`;
    await this.runAction(`Rotating ${label} by ${rotation}°...`, 'Unable to rotate pages', async () => {
      const bytes = await this.pageOperationsService.rotatePages(document.bytes, pageNumbers, rotation);
      await this.recordPageTransformation(bytes, this.currentPage);
      return `Rotated ${label} by ${rotation}°. Press Ctrl+Z to undo.`;
    });
  }

  setCropMode(enabled: boolean): void {
    const wasCropping = this.cropMode || !!this.cropSelection;
    this.cropMode = enabled;
    this.cropDraft = null;
    this.cropSelection = null;
    if (enabled) {
      this.setAnnotationTool(null);
      this.formAuthoringType = null;
      this.setActionStatus('info', `Drag on page ${this.currentPage} to select the area to keep, then choose Apply Crop. Press Escape to cancel.`);
    } else if (wasCropping) {
      this.setActionStatus('info', 'Crop cancelled. The page was not changed.');
    }
  }

  startCrop(event: MouseEvent): void {
    if (!this.cropMode || this.cropSelection || !this.document || event.button !== 0) return;
    event.preventDefault();
    const point = this.annotationPoint(event);
    this.cropStartX = point.x;
    this.cropStartY = point.y;
    this.cropDraft = { x: point.x, y: point.y, width: 1, height: 1 };
  }

  moveCrop(event: MouseEvent): void {
    if (!this.cropMode) return;
    if (this.cropResizeState && this.cropSelection) {
      const point = this.annotationPoint(event);
      const { handle, original, startX, startY } = this.cropResizeState;
      const dx = point.x - startX;
      const dy = point.y - startY;
      const left = handle.includes('w') ? Math.min(original.x + original.width - 1, Math.max(0, original.x + dx)) : original.x;
      const top = handle.includes('n') ? Math.min(original.y + original.height - 1, Math.max(0, original.y + dy)) : original.y;
      const right = handle.includes('e') ? Math.max(original.x + 1, Math.min(this.overlayWidth, original.x + original.width + dx)) : original.x + original.width;
      const bottom = handle.includes('s') ? Math.max(original.y + 1, Math.min(this.overlayHeight, original.y + original.height + dy)) : original.y + original.height;
      this.cropSelection = { x: left, y: top, width: right - left, height: bottom - top };
      return;
    }
    if (!this.cropDraft) return;
    const point = this.annotationPoint(event);
    this.cropDraft = {
      x: Math.min(this.cropStartX, point.x),
      y: Math.min(this.cropStartY, point.y),
      width: Math.max(1, Math.abs(point.x - this.cropStartX)),
      height: Math.max(1, Math.abs(point.y - this.cropStartY)),
    };
  }

  finishCrop(): void {
    this.cropResizeState = null;
    if (!this.cropDraft) return;
    if (this.cropDraft.width >= 3 && this.cropDraft.height >= 3) this.cropSelection = { ...this.cropDraft };
    this.cropDraft = null;
  }

  startCropResize(event: MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se'): void {
    if (!this.cropMode || !this.cropSelection || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = this.annotationPoint(event);
    this.cropResizeState = { handle, original: { ...this.cropSelection }, startX: point.x, startY: point.y };
  }

  async applyCropSelection(): Promise<void> {
    if (!this.document || !this.cropSelection) return;
    const document = this.document;
    const page = this.currentPage;
    const selection = this.cropSelection;
    await this.runAction(`Cropping page ${page}...`, 'Unable to crop page', async () => {
      const bytes = await this.pageOperationsService.cropPage(
        document.bytes,
        page,
        this.overlayWidth,
        this.overlayHeight,
        selection
      );
      await this.recordPageTransformation(bytes, page);
      this.cropSelection = null;
      this.cropMode = false;
      return `Page ${page} cropped. Press Ctrl+Z to undo.`;
    });
  }

  private async recordPageTransformation(bytes: Uint8Array, selectedPage: number): Promise<void> {
    if (!this.document) return;
    this.pageTransformUndo.push(this.document.bytes.slice());
    this.pageTransformRedo.length = 0;
    await this.refreshDocumentAfterPageOperation(bytes, selectedPage);
    this.syncHistoryState();
  }

  private async refreshDocumentAfterPageOperation(bytes: Uint8Array, selectedPage: number): Promise<void> {
    const updated = await this.pdfDocumentService.replaceCurrentDocumentBytes(bytes);
    this.document = updated;
    this.totalPages = updated.totalPages;
    this.currentPage = Math.max(1, Math.min(selectedPage, updated.totalPages));
    this.selectedPages = [];
    const page = typeof updated.proxy?.getPage === 'function'
      ? await updated.proxy.getPage(this.currentPage)
      : null;
    if (Number.isFinite(page?.rotate)) this.rotation = page.rotate;
    this.error = null;
    this.thumbnailRenderStates.clear();
    this.thumbnailSources.clear();
    this.thumbnailRenderScheduled.clear();
    this.thumbnailError = null;
    this.searchIndex = null;
    this.searchResults = [];
    this.searchMessage = '';
    this.updateThumbnailWindow(0, 360);
    await this.loadBookmarks();
    this.cdr.detectChanges();
    await this.renderCurrentPage();
    this.scheduleAutosave();
  }

  updateThumbnailWindow(scrollTop: number, viewportHeight: number): void {
    if (!this.totalPages) {
      this.visibleThumbnailPages = [];
      this.trimThumbnailCache();
      return;
    }
    const first = Math.max(0, Math.floor(scrollTop / this.thumbnailItemHeight) - 2);
    const last = Math.min(
      this.totalPages,
      Math.ceil((scrollTop + Math.max(viewportHeight, this.thumbnailItemHeight)) / this.thumbnailItemHeight) + 2
    );
    this.visibleThumbnailPages = Array.from({ length: last - first }, (_, index) => first + index + 1);
    this.trimThumbnailCache();
  }

  private trimThumbnailCache(): void {
    const visiblePages = new Set(this.visibleThumbnailPages);
    for (const page of this.thumbnailSources.keys()) {
      if (!visiblePages.has(page)) this.thumbnailSources.delete(page);
    }
    for (const page of this.thumbnailRenderStates.keys()) {
      if (!visiblePages.has(page)) this.thumbnailRenderStates.delete(page);
    }
  }

  private renderVisibleThumbnails(): void {
    if (!this.document) return;
    const document = this.document;
    for (const page of this.visibleThumbnailPages) {
      if (this.thumbnailRenderStates.has(page) || this.thumbnailRenderScheduled.has(page)) continue;
      this.thumbnailRenderScheduled.add(page);
      queueMicrotask(() => {
        this.thumbnailRenderScheduled.delete(page);
        if (this.document?.id !== document.id
          || this.thumbnailRenderStates.has(page)
          || !this.visibleThumbnailPages.includes(page)) return;
        this.thumbnailRenderStates.set(page, 'loading');
        void this.renderThumbnail(document, page);
      });
    }
  }

  private async renderThumbnail(document: LoadedPdfDocument, page: number): Promise<void> {
    try {
      const canvas = globalThis.document.createElement('canvas');
      if (document.isEncrypted) {
        await this.pdfRenderService.renderLoadedPageToCanvas(document.proxy, page, canvas, { fitWidth: 120, fitHeight: 104 });
      } else {
        await this.pdfRenderService.renderPageToCanvas(document.bytes, page, canvas, { fitWidth: 120, fitHeight: 104 });
      }
      if (this.document?.id !== document.id || !this.visibleThumbnailPages.includes(page)) return;
      this.thumbnailSources.set(page, canvas.toDataURL());
      this.thumbnailRenderStates.set(page, 'ready');
      this.cdr.markForCheck();
    } catch (error) {
      if (this.document?.id !== document.id || !this.visibleThumbnailPages.includes(page)) return;
      this.thumbnailRenderStates.set(page, 'error');
      this.thumbnailError = `Unable to render thumbnail for page ${page}: ${error instanceof Error ? error.message : String(error)}`;
      this.cdr.markForCheck();
    }
  }

  private async renderModePagesIfNeeded(): Promise<void> {
    if (!this.document || this.loading || this.viewingMode === 'single') {
      this.renderedModeKey = '';
      return;
    }
    const pages = this.modeCanvasPages;
    const key = [
      this.document.id,
      this.viewingMode,
      pages.join(','),
      this.zoomMode,
      this.zoom,
      this.rotation,
      this.darkPageRendering,
    ].join(':');
    if (key === this.renderedModeKey) return;
    const canvases = this.modePageCanvases?.toArray() ?? [];
    if (canvases.length !== pages.length) return;

    this.renderedModeKey = key;
    const document = this.document;
    const host = this.multiPageView?.nativeElement;
    const availableWidth = Math.max(240, (host?.clientWidth ?? 960) - 32);
    const fitWidth = this.viewingMode === 'facing' ? Math.max(120, (availableWidth - 16) / 2) : availableWidth;
    try {
      for (let index = 0; index < pages.length; index += 1) {
        if (this.document?.id !== document.id) return;
        await this.pdfRenderService.renderLoadedPageToCanvas(
          document.proxy,
          pages[index],
          canvases[index].nativeElement,
          this.zoomMode === 'custom'
            ? { zoom: this.zoom, rotation: this.rotation }
            : { fitWidth, zoom: 1, rotation: this.rotation }
        );
      }
      this.scrollToModePage(this.currentPage);
    } catch (error) {
      this.error = `Unable to render ${this.viewingMode} pages: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private scrollToModePage(page: number): void {
    const target = this.multiPageView?.nativeElement.querySelector<HTMLElement>(`[data-view-page="${page}"]`);
    target?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  get zoomLabel(): string {
    const percent = `${Math.round(this.zoom * 100)}%`;
    if (this.zoomMode === 'fit-page') return `Fit page (${percent})`;
    if (this.zoomMode === 'fit-width') return `Fit width (${percent})`;
    return percent;
  }

  get zoomSelectValue(): string {
    if (this.zoomMode !== 'custom') return this.zoomMode;
    return this.zoomPresets.some(preset => Math.abs(preset - this.zoom) < 0.001) ? String(this.zoom) : 'custom';
  }

  async setZoomOption(value: string): Promise<void> {
    if (value === 'fit-page' || value === 'fit-width') {
      await this.setZoomMode(value);
      return;
    }
    const zoom = Number(value);
    if (Number.isFinite(zoom) && zoom > 0) await this.setZoom(zoom);
  }

  async setZoomMode(mode: 'fit-page' | 'fit-width'): Promise<void> {
    this.zoomMode = mode;
    this.renderedModeKey = '';
    await this.renderCurrentPage();
    await this.persistWorkspaceViewState();
  }

  async setZoom(value: number): Promise<void> {
    this.zoomMode = 'custom';
    this.zoom = this.clampZoom(value);
    this.renderedModeKey = '';
    await this.persistWorkspaceViewState();
    await this.renderCurrentPage();
  }

  async zoomIn(): Promise<void> {
    const next = this.zoomPresets.find(preset => preset > this.zoom + 0.001) ?? MAX_ZOOM;
    await this.setZoom(next);
  }

  async zoomOut(): Promise<void> {
    const next = [...this.zoomPresets].reverse().find(preset => preset < this.zoom - 0.001) ?? MIN_ZOOM;
    await this.setZoom(next);
  }

  private clampZoom(value: number): number {
    return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)) * 100) / 100;
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (!this.active || !this.document || !(event.ctrlKey || event.metaKey) || !event.deltaY) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.content')) return;
    event.preventDefault();
    if (this.wheelZoomBusy) return;
    this.wheelZoomBusy = true;
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    void this.setZoom(this.zoom * factor).finally(() => {
      this.wheelZoomBusy = false;
      this.cdr.markForCheck();
    });
  }

  focusSearch(): void {
    const inputs = Array.from(this.hostElement.nativeElement.querySelectorAll<HTMLInputElement>('input[data-search-input]'));
    let input = inputs.find(element => element.offsetParent !== null || element.getClientRects().length > 0);
    if (!input && !this.toolsOpen) {
      this.toolsOpen = true;
      this.cdr.detectChanges();
      input = Array.from(this.hostElement.nativeElement.querySelectorAll<HTMLInputElement>('input[data-search-input]'))
        .find(element => element.closest('.tools-panel'));
    }
    if (!input) {
      this.setActionStatus('info', 'Search is hidden. Turn on the Search toolbar in Tools > Toolbar to search this PDF.');
      return;
    }
    input.focus();
    input.select();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const query = this.searchQuery.trim();
    if (this.searchResults.length && query === this.lastSearchQuery) {
      void (event.shiftKey ? this.previousSearchResult() : this.nextSearchResult());
    } else {
      void this.searchInDocument();
    }
  }

  private lastSearchQuery = '';

  async rotateLeft(): Promise<void> {
    this.rotation = (this.rotation - 90 + 360) % 360;
    await this.renderCurrentPage();
  }

  async rotateRight(): Promise<void> {
    this.rotation = (this.rotation + 90) % 360;
    await this.renderCurrentPage();
  }

  async searchInDocument(): Promise<void> {
    if (!this.document || !this.searchQuery.trim()) {
      this.searchResults = [];
      this.currentSearchResultIndex = 0;
      this.searchMessage = '';
      return;
    }

    const query = this.searchQuery.trim();
    const pattern = this.searchRegexMode ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let matcher: RegExp;
    try {
      matcher = new RegExp(pattern, this.searchCaseSensitive ? 'g' : 'gi');
    } catch (error) {
      this.searchResults = [];
      this.searchMessage = `Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`;
      return;
    }

    this.searching = true;
    this.searchMessage = 'Indexing document text...';
    try {
      const document = this.document;
      if (this.searchIndex?.documentId !== document.id) {
        const pages: string[] = [];
        for (let page = 1; page <= document.totalPages; page++) {
          pages.push(await this.pdfDocumentService.extractText(page));
        }
        this.searchIndex = { documentId: document.id, pages };
      }

      const results: SearchResult[] = [];
      this.searchIndex.pages.forEach((text, index) => {
        matcher.lastIndex = 0;
        const firstMatch = matcher.exec(text);
        if (!firstMatch) return;

        let count = 0;
        const countMatcher = new RegExp(pattern, this.searchCaseSensitive ? 'g' : 'gi');
        let match: RegExpExecArray | null;
        while ((match = countMatcher.exec(text))) {
          count++;
          if (!match[0].length) countMatcher.lastIndex++;
        }
        const start = Math.max(0, firstMatch.index - 60);
        const end = Math.min(text.length, Math.max(start + 180, firstMatch.index + firstMatch[0].length + 60));
        results.push({
          page: index + 1,
          count,
          excerpt: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`,
        });
      });

      this.searchResults = results;
      this.currentSearchResultIndex = 0;
      this.lastSearchQuery = query;
      if (results.length) {
        const totalMatches = results.reduce((total, result) => total + result.count, 0);
        await this.navigateToSearchResult(0);
        this.searchMessage = `Found ${totalMatches} match${totalMatches === 1 ? '' : 'es'} on ${results.length} page${results.length === 1 ? '' : 's'}`;
      } else {
        this.searchMessage = 'No match found';
      }
    } catch (error) {
      this.searchResults = [];
      this.searchMessage = `Search failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.searching = false;
    }
  }

  async navigateToSearchResult(index: number, hit: 'first' | 'last' = 'first'): Promise<void> {
    if (index < 0 || index >= this.searchResults.length) return;
    this.currentSearchResultIndex = index;
    this.pendingSearchHit = hit;
    if (this.currentPage === this.searchResults[index].page && this.viewingMode === 'single') {
      await this.updateSearchHighlights();
      return;
    }
    this.currentPage = this.searchResults[index].page;
    await this.renderCurrentPage();
  }

  async previousSearchResult(): Promise<void> {
    if (!this.searchResults.length) return;
    if (this.searchHitIndex > 0 && this.currentPage === this.searchResults[this.currentSearchResultIndex]?.page) {
      this.searchHitIndex -= 1;
      this.scrollSearchHitIntoView();
      return;
    }
    const index = (this.currentSearchResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    await this.navigateToSearchResult(index, 'last');
  }

  async nextSearchResult(): Promise<void> {
    if (!this.searchResults.length) return;
    if (this.searchHitIndex < this.searchHighlights.length - 1 && this.currentPage === this.searchResults[this.currentSearchResultIndex]?.page) {
      this.searchHitIndex += 1;
      this.scrollSearchHitIntoView();
      return;
    }
    const index = (this.currentSearchResultIndex + 1) % this.searchResults.length;
    await this.navigateToSearchResult(index);
  }

  get searchPositionLabel(): string {
    const result = this.searchResults[this.currentSearchResultIndex];
    if (!result) return '';
    const hits = this.searchHighlights.length;
    const match = hits ? ` · match ${this.searchHitIndex + 1} of ${hits} on this page` : '';
    return `Page ${result.page} (${this.currentSearchResultIndex + 1} of ${this.searchResults.length} pages)${match}`;
  }

  private searchMatcher(): RegExp | null {
    const query = this.searchQuery.trim();
    if (!query || query !== this.lastSearchQuery) return null;
    try {
      const pattern = this.searchRegexMode ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(pattern, this.searchCaseSensitive ? 'g' : 'gi');
    } catch {
      return null;
    }
  }

  private async updateSearchHighlights(): Promise<void> {
    const pageResult = this.searchResults[this.currentSearchResultIndex];
    const matcher = this.searchMatcher();
    if (!this.document || !matcher || pageResult?.page !== this.currentPage || this.viewingMode !== 'single') {
      this.searchHighlights = [];
      this.searchHitIndex = 0;
      return;
    }
    try {
      const page = await this.document.proxy?.getPage?.(this.currentPage);
      if (!page || typeof page.getTextContent !== 'function' || typeof page.getViewport !== 'function') {
        this.searchHighlights = [];
        return;
      }
      const viewport = page.getViewport({ scale: 1, rotation: this.rotation });
      const scaleX = viewport.width > 0 ? this.overlayWidth / viewport.width : 1;
      const scaleY = viewport.height > 0 ? this.overlayHeight / viewport.height : 1;
      const content = await page.getTextContent();
      const items = (content.items as any[]).filter(item => typeof item.str === 'string' && Array.isArray(item.transform));
      let text = '';
      const spans = items.map(item => {
        const start = text.length;
        text += item.str + ' ';
        return { item, start, end: start + item.str.length };
      });
      const highlights: SearchHighlight[] = [];
      let match: RegExpExecArray | null;
      matcher.lastIndex = 0;
      while ((match = matcher.exec(text)) && highlights.length < 500) {
        if (!match[0].length) {
          matcher.lastIndex++;
          continue;
        }
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        for (const span of spans) {
          if (span.end <= matchStart || span.start >= matchEnd || span.end === span.start) continue;
          const [a, b, c, d, e, f] = span.item.transform as number[];
          const fontHeight = Math.hypot(c, d) || Math.hypot(a, b) || 10;
          const itemWidth = Number(span.item.width) || fontHeight * span.item.str.length * 0.5;
          const length = span.end - span.start;
          const from = (Math.max(matchStart, span.start) - span.start) / length;
          const to = (Math.min(matchEnd, span.end) - span.start) / length;
          const rect = viewport.convertToViewportRectangle([
            e + itemWidth * from, f - fontHeight * 0.2, e + itemWidth * to, f + fontHeight * 0.95,
          ]) as number[];
          highlights.push({
            x: Math.min(rect[0], rect[2]) * scaleX,
            y: Math.min(rect[1], rect[3]) * scaleY,
            width: Math.max(2, Math.abs(rect[2] - rect[0]) * scaleX),
            height: Math.max(4, Math.abs(rect[3] - rect[1]) * scaleY),
          });
        }
      }
      this.searchHighlights = highlights;
      this.searchHitIndex = this.pendingSearchHit === 'last' ? Math.max(0, highlights.length - 1) : 0;
      this.pendingSearchHit = 'first';
      this.cdr.markForCheck();
      this.scrollSearchHitIntoView();
    } catch {
      this.searchHighlights = [];
      this.searchHitIndex = 0;
    }
  }

  private scrollSearchHitIntoView(): void {
    this.cdr.markForCheck();
    requestAnimationFrame(() => {
      const hit = this.hostElement.nativeElement.querySelector<HTMLElement>('.search-hit.current');
      hit?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    });
  }

  searchResultParts(text: string): { text: string; match: boolean }[] {
    const flags = this.searchCaseSensitive ? 'g' : 'gi';
    try {
      const query = this.searchQuery.trim();
      const pattern = this.searchRegexMode ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matcher = new RegExp(pattern, flags);
      const parts: { text: string; match: boolean }[] = [];
      let previousIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = matcher.exec(text))) {
        if (match.index > previousIndex) parts.push({ text: text.slice(previousIndex, match.index), match: false });
        parts.push({ text: match[0], match: true });
        previousIndex = matcher.lastIndex;
        if (!match[0].length) matcher.lastIndex++;
      }
      if (previousIndex < text.length) parts.push({ text: text.slice(previousIndex), match: false });
      return parts.length ? parts : [{ text, match: false }];
    } catch {
      return [{ text, match: false }];
    }
  }

  togglePanel(panel: 'tools' | 'chat'): void {
    const open = panel === 'tools' ? !this.toolsOpen : !this.chatOpen;
    if (this.compactLayout && open) {
      this.toolsOpen = false;
      this.chatOpen = false;
    }
    if (panel === 'tools') this.toolsOpen = open;
    else this.chatOpen = open;
    if (!this.chatOpen && (this.aiChat?.busy || this.aiChat?.extracting)) this.aiChat.cancel();
    this.cdr.detectChanges();
    if (open) (panel === 'tools' ? this.toolsPanel : this.chatPanel)?.nativeElement.focus();
    else (panel === 'tools' ? this.toolsToggle : this.chatToggle)?.nativeElement.focus();
    this.schedulePanelRender();
  }

  closePanel(panel: 'tools' | 'chat'): void {
    if (panel === 'tools') this.toolsOpen = false;
    else {
      this.chatOpen = false;
      if (this.aiChat?.busy || this.aiChat?.extracting) this.aiChat.cancel();
    }
    (panel === 'tools' ? this.toolsToggle : this.chatToggle)?.nativeElement.focus();
    this.schedulePanelRender();
  }

  closePanels(): void {
    const panel = this.chatOpen ? 'chat' : 'tools';
    this.toolsOpen = false;
    this.chatOpen = false;
    if (this.aiChat?.busy || this.aiChat?.extracting) this.aiChat.cancel();
    (panel === 'chat' ? this.chatToggle : this.toolsToggle)?.nativeElement.focus();
  }

  private schedulePanelRender(): void {
    if (this.panelLayoutFrame !== null) cancelAnimationFrame(this.panelLayoutFrame);
    this.panelLayoutFrame = requestAnimationFrame(() => {
      this.panelLayoutFrame = null;
      void this.onResize();
    });
  }

  @HostListener('window:resize')
  async onResize(): Promise<void> {
    const compact = window.innerWidth < 1024;
    if (compact !== this.compactLayout) {
      this.compactLayout = compact;
      if (compact) this.closePanels();
    }
    if (this.active && this.document && !this.loading) {
      await this.renderCurrentPage();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.active || !this.dragState) {
      return;
    }

    const dx = event.clientX - this.dragState.startX;
    const dy = event.clientY - this.dragState.startY;

    const updated =
      this.dragState.mode === 'move'
        ? this.computeMovedObject(this.dragState.original, dx, dy)
        : this.computeResizedObject(this.dragState.original, dx, dy, this.dragState.handle as ResizeHandle);

    this.overlayObjects = this.overlayObjects.map((object) =>
      object.id === this.dragState?.objectId ? updated : object
    );
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (this.dragState) this.scheduleAutosave();
    this.dragState = null;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.active) return;
    const key = event.key.toLowerCase();

    if (key === 'escape') {
      if (this.passwordPrompt) this.cancelPasswordPrompt();
      else if (this.signatureDialogOpen) this.closeSignatureDialog();
      else if (this.metadataDialogOpen) this.closeMetadataDialog();
      else if (this.protectionDialogOpen) this.closeProtectionDialog();
      else if (this.compactLayout && (this.toolsOpen || this.chatOpen)) this.closePanels();
      else if (this.cropMode || this.cropSelection) this.setCropMode(false);
      else if (this.formAuthoringType) {
        this.setActionStatus('info', `Stopped adding the ${this.formFieldLabel(this.formAuthoringType)}. Nothing was added.`);
        this.formAuthoringType = null;
      }
      else {
        this.setAnnotationTool(null);
        this.selectedObjectId = null;
      }
      event.preventDefault();
      return;
    }

    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('app-ai-chat')) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && this.document) {
      if (key === 'f') {
        this.focusSearch();
        event.preventDefault();
        return;
      }
      if (!target?.closest('input, textarea, select, [contenteditable="true"]')) {
        if (key === '0') void this.setZoomMode('fit-page');
        else if (key === '+' || key === '=') void this.zoomIn();
        else if (key === '-') void this.zoomOut();
        if (key === '0' || key === '+' || key === '=' || key === '-') {
          event.preventDefault();
          return;
        }
      }
    }
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (key === 'backspace' || key === 'delete') {
      if (this.document && !this.document.isEncrypted && this.viewingMode === 'single' && this.selectedObjectId) {
        this.deleteSelection();
        event.preventDefault();
      }
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (this.document?.isEncrypted || this.viewingMode !== 'single') return;
    } else if (target?.closest('button, a, [role="button"]')) {
      return;
    }

    if (!event.ctrlKey && !event.metaKey) {
      if (!this.document || event.altKey) return;
      if (key === 'pageup' || key === 'arrowleft') {
        void this.previousPage();
      } else if (key === 'pagedown' || key === 'arrowright') {
        void this.nextPage();
      } else if (key === '+' || key === '=') {
        void this.zoomIn();
      } else if (key === '-') {
        void this.zoomOut();
      } else {
        return;
      }
      event.preventDefault();
      return;
    }

    if (key === 'c') {
      this.copySelection();
      event.preventDefault();
      return;
    }

    if (key === 'x') {
      this.cutSelection();
      event.preventDefault();
      return;
    }

    if (key === 'v') {
      this.pasteClipboard();
      event.preventDefault();
      return;
    }

    if (key === 'z' && !event.shiftKey) {
      this.undoEdit();
      event.preventDefault();
      return;
    }

    if (key === 'y' || (key === 'z' && event.shiftKey)) {
      this.redoEdit();
      event.preventDefault();
      return;
    }
  }

  get pageAnnotations(): Annotation[] {
    return this.document ? this.annotations.filter(annotation => annotation.page === this.currentPage) : [];
  }

  get visibleAnnotations(): Annotation[] {
    const query = this.annotationSearch.trim().toLocaleLowerCase();
    return this.annotations.filter(annotation =>
      (this.annotationFilter === 'all' || annotation.type === this.annotationFilter) &&
      (!query || (annotation.content ?? '').toLocaleLowerCase().includes(query) || annotation.type.includes(query))
    );
  }

  get selectedFormFieldRequired(): boolean {
    return this.formWidgets.find(widget => widget.name === this.selectedFormFieldName)?.required ?? false;
  }

  get hasSelectedFieldCondition(): boolean {
    return this.formVisibilityRules.some(rule => rule.targetFieldName === this.selectedFormFieldName);
  }

  get signatureReady(): boolean {
    if (this.signatureMode === 'type') return Boolean(this.signatureText.trim());
    if (this.signatureMode === 'upload') return Boolean(this.signatureDataUrl);
    return this.signatureHasMarks;
  }

  annotationColorFor(annotation: Annotation): string {
    return annotation.style.color;
  }

  setAnnotationTool(tool: 'highlight' | 'comment' | 'draw' | null): void {
    this.annotationTool = this.document?.isEncrypted ? null : tool;
    this.annotationDraft = null;
  }

  startAnnotation(event: MouseEvent): void {
    if (!this.document || this.document.isEncrypted || !this.annotationTool || event.button !== 0) return;
    event.preventDefault();
    const point = this.annotationPoint(event);
    const type: AnnotationType = this.annotationTool === 'comment' ? 'comment' : this.annotationTool;
    this.annotationDraft = {
      type,
      rect: { x: point.x, y: point.y, width: 1, height: 1 },
      content: '',
      startX: point.x,
      startY: point.y,
      points: [point.x + ',' + point.y],
    };
  }

  moveAnnotation(event: MouseEvent): void {
    if (!this.annotationDraft) return;
    const point = this.annotationPoint(event);
    const left = Math.min(this.annotationDraft.startX, point.x);
    const top = Math.min(this.annotationDraft.startY, point.y);
    this.annotationDraft.rect = {
      x: left,
      y: top,
      width: Math.max(1, Math.abs(point.x - this.annotationDraft.startX)),
      height: Math.max(1, Math.abs(point.y - this.annotationDraft.startY)),
    };
    if (this.annotationDraft.type === 'draw') {
      this.annotationDraft.points.push(point.x + ',' + point.y);
      this.annotationDraft.content = this.annotationDraft.points.join(' ');
    }
  }

  finishAnnotation(): void {
    const draft = this.annotationDraft;
    if (!draft || !this.document || this.document.isEncrypted) return;
    this.annotationDraft = null;
    if (draft.type === 'draw' ? draft.points.length < 2 : draft.rect.width < 3 || draft.rect.height < 3) return;
    let content = draft.content;
    if (draft.type === 'comment') {
      const entered = window.prompt('Enter a comment for this page region:');
      if (entered === null || !entered.trim()) return;
      content = entered.trim();
    }
    if (draft.type === 'draw') {
      content = draft.points.map(point => {
        const [x, y] = point.split(',').map(Number);
        return (x - draft.rect.x) + ',' + (y - draft.rect.y);
      }).join(' ');
    }
    this.annotationService.create({
      documentId: this.document.id,
      page: this.currentPage,
      type: draft.type,
      rect: draft.rect,
      viewport: { width: this.overlayWidth, height: this.overlayHeight },
      style: { color: this.annotationColor, opacity: Number(this.annotationOpacity), ...(draft.type === 'draw' ? { strokeWidth: 2 } : {}) },
      content,
    });
    this.refreshAnnotations();
  }

  editAnnotation(annotation: Annotation): void {
    if (!this.document || this.document.isEncrypted) return;
    const content = window.prompt('Edit annotation text:', annotation.content ?? '');
    if (content === null) return;
    this.annotationService.update(annotation.id, { content, style: { color: this.annotationColor, opacity: Number(this.annotationOpacity) } });
    this.refreshAnnotations();
  }

  deleteAnnotation(annotation: Annotation): void {
    if (!this.document || this.document.isEncrypted) return;
    this.annotationService.delete(annotation.id);
    this.refreshAnnotations();
  }

  async jumpToAnnotation(annotation: Annotation): Promise<void> {
    this.currentPage = annotation.page;
    await this.renderCurrentPage();
  }

  private annotationPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = this.annotationLayer?.nativeElement.getBoundingClientRect();
    const x = event.clientX - (bounds?.left ?? 0);
    const y = event.clientY - (bounds?.top ?? 0);
    return {
      x: Math.max(0, Math.min(this.overlayWidth, x)),
      y: Math.max(0, Math.min(this.overlayHeight, y)),
    };
  }

  private refreshAnnotations(): void {
    if (this.document) {
      this.annotations = this.annotationService.list(this.document.id);
      this.scheduleAutosave();
    }
  }

  addOverlayObject(): void {
    this.addTextObject();
  }

  get textStyleTarget(): string {
    return this.getSelectedTextObject() ? 'Applies to the selected text box' : 'Applies to the next text box you add';
  }

  get textFontSizeControl(): number {
    return this.getSelectedTextObject()?.fontSize ?? this.textFontSize;
  }

  get textBoldControl(): boolean {
    const selected = this.getSelectedTextObject();
    return selected ? !!selected.bold : this.textBold;
  }

  setTextFontSize(value: string | number): void {
    const size = Math.round(Number(value));
    if (!Number.isFinite(size) || size < 6 || size > 72) {
      this.setActionStatus('error', 'Text size must be between 6 and 72 points.');
      this.cdr.markForCheck();
      return;
    }
    const selected = this.getSelectedTextObject();
    if (selected) {
      if (selected.fontSize === size) return;
      this.captureHistory('format-text');
      this.updateObject(selected.id, { fontSize: size });
    } else {
      this.textFontSize = size;
    }
  }

  toggleTextBold(): void {
    const selected = this.getSelectedTextObject();
    if (selected) {
      this.captureHistory('format-text');
      this.updateObject(selected.id, { bold: !selected.bold, fontSize: selected.fontSize ?? this.textFontSize });
    } else {
      this.textBold = !this.textBold;
    }
  }

  private getSelectedTextObject(): EditableObject | null {
    const selected = this.getSelectedObject();
    return selected?.type === 'text' ? selected : null;
  }

  addTextObject(): void {
    const text = window.prompt('Enter text for the new text box:', 'Sample text') ?? 'Sample text';
    this.insertTextObject(text, 220, 90);
  }

  get canInsertText(): boolean {
    return !!this.document && !this.document.isEncrypted && !this.loading && this.viewingMode === 'single';
  }

  /** Inserts externally produced text (for example OCR output) as a normal editable text box. */
  addTextObjectWithText(text: string): string | null {
    const value = text.trim();
    if (!value) return 'There is no text to add.';
    if (!this.document) return 'Open a PDF first.';
    if (this.document.isEncrypted) return 'This PDF is password-protected and read-only.';
    if (this.viewingMode !== 'single') return 'Switch to Single page view to add text.';
    const lines = value.split('\n').length;
    const lineHeight = this.textFontSize * this.pagePixelsPerPoint * 1.35;
    const width = Math.max(180, Math.min(520, (this.overlayWidth || 600) * 0.8));
    const height = Math.max(60, Math.min((this.overlayHeight || 800) * 0.8, lines * lineHeight + 40));
    this.insertTextObject(value, width, height);
    this.setActionStatus('success', `Added the extracted text to page ${this.currentPage} as a text box. Drag it into place, then save the PDF.`);
    this.cdr.markForCheck();
    return null;
  }

  /** Renders the current page at OCR resolution (about 300 dpi, capped at 4000 px on the long side). */
  async renderCurrentPageForOcr(): Promise<{ canvas: HTMLCanvasElement; label: string } | null> {
    if (!this.document || this.loading) return null;
    const page = await this.document.proxy.getPage(this.currentPage);
    const base = page.getViewport({ scale: 1, rotation: this.rotation });
    const scale = Math.max(1, Math.min(300 / 72, 4000 / Math.max(base.width, base.height)));
    const canvas = document.createElement('canvas');
    await this.pdfRenderService.renderLoadedPageToCanvas(this.document.proxy, this.currentPage, canvas, { zoom: scale, rotation: this.rotation });
    return { canvas, label: `${this.document.name} – page ${this.currentPage}` };
  }

  private insertTextObject(text: string, width: number, height: number): void {
    const object = this.createBaseObject({
      type: 'text',
      label: 'Text Box',
      width,
      height,
      text,
      fontSize: this.textFontSize,
      bold: this.textBold,
    });

    this.captureHistory('add-text-box');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
  }

  addImageObject(): void {
    const imageSrc =
      window.prompt(
        'Enter image URL or data URL:',
        'https://dummyimage.com/240x120/ced8ef/17397e.png&text=Image'
      ) ?? '';
    if (!imageSrc.trim()) {
      return;
    }

    const object = this.createBaseObject({
      type: 'image',
      label: 'Image',
      width: 240,
      height: 140,
      imageSrc: imageSrc.trim(),
    });

    this.captureHistory('insert-image');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
  }

  addLinkObject(): void {
    const destinationInput = window.prompt('Enter an HTTP(S) URL or internal page (page:<number>):', 'https://example.com');
    if (destinationInput === null || !destinationInput.trim()) return;
    const destination = this.parseLinkDestination(destinationInput);
    if (!destination) {
      this.error = `Invalid link destination. Use an HTTP(S) URL or page:1 through page:${this.totalPages}.`;
      return;
    }

    const text = window.prompt('Enter link label:', 'Open link') ?? 'Open link';
    const object = this.createBaseObject({
      type: 'link',
      label: 'Link',
      width: 220,
      height: 70,
      text,
      ...destination,
    });

    this.captureHistory('insert-link');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
  }

  async openSignatureDialog(kind: SignatureAsset['kind']): Promise<void> {
    if (this.compactLayout) this.closePanels();
    this.signatureKind = kind;
    this.signatureMode = 'draw';
    this.signatureText = '';
    this.signatureDataUrl = '';
    this.signatureHasMarks = false;
    this.signatureError = null;
    this.signatureDialogOpen = true;
    try {
      const stored = await this.persistenceService.getSetting<SignatureAsset[]>('pdf-signature-assets');
      this.signatureAssets = Array.isArray(stored) ? stored.filter(asset =>
        typeof asset?.id === 'string' &&
        typeof asset?.name === 'string' &&
        (asset?.kind === 'signature' || asset?.kind === 'initials') &&
        typeof asset?.data === 'string' &&
        /^data:image\/(png|jpeg);base64,/i.test(asset.data)
      ) : [];
    } catch (error) {
      this.signatureError = `Unable to load saved signatures: ${error instanceof Error ? error.message : String(error)}`;
    }
    this.cdr.detectChanges();
    this.clearSignatureCanvas();
  }

  setSignatureMode(mode: 'draw' | 'type' | 'upload'): void {
    this.signatureMode = mode;
    this.signatureDataUrl = '';
    this.signatureHasMarks = false;
    this.signatureError = null;
    this.cdr.detectChanges();
    if (mode === 'draw') this.clearSignatureCanvas();
  }

  startSignatureStroke(event: PointerEvent): void {
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      this.signatureError = 'Signature drawing is unavailable because the canvas could not be initialized.';
      return;
    }
    event.preventDefault();
    const point = this.signatureCanvasPoint(event, canvas);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.strokeStyle = '#14264b';
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    this.drawingSignature = true;
  }

  continueSignatureStroke(event: PointerEvent): void {
    if (!this.drawingSignature) return;
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const point = this.signatureCanvasPoint(event, canvas);
    context.lineTo(point.x, point.y);
    context.stroke();
    this.signatureHasMarks = true;
  }

  finishSignatureStroke(): void {
    this.drawingSignature = false;
  }

  async loadSignatureFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.signatureError = 'Choose a PNG or JPEG image for the signature.';
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.signatureError = 'Signature images must be 10 MB or smaller.';
      input.value = '';
      return;
    }
    try {
      this.signatureDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('The selected image could not be read.'));
        reader.onerror = () => reject(reader.error ?? new Error('The selected image could not be read.'));
        reader.readAsDataURL(file);
      });
      this.signatureError = null;
    } catch (error) {
      this.signatureError = `Unable to read signature image: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async saveReusableSignature(): Promise<void> {
    try {
      const draft = this.currentSignatureAsset();
      if (!draft) {
        this.signatureError = 'Draw, type, or upload a signature before saving it for reuse.';
        return;
      }
      const name = window.prompt('Name this reusable item:', draft.kind === 'signature' ? 'My signature' : 'My initials');
      if (name === null || !name.trim()) return;
      const existing = this.signatureAssets.find(asset => asset.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase());
      const asset = { ...draft, id: existing?.id ?? `signature-${Date.now()}-${Math.round(Math.random() * 1e6)}`, name: name.trim() };
      const assets = [...this.signatureAssets.filter(item => item.id !== asset.id), asset];
      await this.persistenceService.setSetting('pdf-signature-assets', assets);
      this.signatureAssets = assets;
      this.signatureError = null;
    } catch (error) {
      this.signatureError = `Unable to save reusable signature: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  placeCurrentSignature(): void {
    try {
      const asset = this.currentSignatureAsset();
      if (!asset) {
        this.signatureError = 'Draw, type, or upload a signature before placing it.';
        return;
      }
      this.placeSignatureAsset(asset);
    } catch (error) {
      this.signatureError = `Unable to prepare signature: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  placeSignatureAsset(asset: SignatureAsset): void {
    const initials = asset.kind === 'initials';
    const object = this.createBaseObject({
      type: 'image',
      label: initials ? 'Initials' : 'Signature',
      width: initials ? 96 : 200,
      height: initials ? 56 : 72,
      imageSrc: asset.data,
    });
    this.captureHistory('place-signature');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
    this.closeSignatureDialog();
  }

  closeSignatureDialog(): void {
    this.signatureDialogOpen = false;
    this.drawingSignature = false;
  }

  private currentSignatureAsset(): SignatureAsset | null {
    let data: string;
    if (this.signatureMode === 'type') {
      const text = this.signatureText.trim();
      if (!text) return null;
      data = this.renderTypedSignature(text);
    } else if (this.signatureMode === 'upload') {
      data = this.signatureDataUrl;
    } else {
      const canvas = this.signatureCanvas?.nativeElement;
      if (!this.signatureHasMarks || !canvas) return null;
      data = canvas.toDataURL('image/png');
    }
    return data ? { id: 'draft', name: this.signatureKind, kind: this.signatureKind, data } : null;
  }

  private renderTypedSignature(text: string): string {
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = Math.min(1200, Math.max(240, text.length * 44 + 32));
    canvas.height = 120;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Signature rendering is unavailable because the canvas could not be initialized.');
    context.fillStyle = '#14264b';
    context.font = 'italic 48px cursive';
    context.textBaseline = 'middle';
    context.fillText(text, 16, 60, canvas.width - 32);
    return canvas.toDataURL('image/png');
  }

  private signatureCanvasPoint(event: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * canvas.width / Math.max(bounds.width, 1),
      y: (event.clientY - bounds.top) * canvas.height / Math.max(bounds.height, 1),
    };
  }

  private clearSignatureCanvas(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  editSelection(): void {
    const selected = this.getSelectedObject();
    if (!selected) {
      return;
    }

    if (selected.type === 'text') {
      const text = window.prompt('Edit text content:', selected.text ?? selected.label);
      if (text === null) {
        return;
      }
      this.captureHistory('edit-text-box');
      this.updateObject(selected.id, {
        text,
        label: 'Text Box',
      });
      return;
    }

    if (selected.type === 'image') {
      const imageSrc = window.prompt('Edit image URL/data URL:', selected.imageSrc ?? '');
      if (imageSrc === null || !imageSrc.trim()) {
        return;
      }
      this.captureHistory('edit-image');
      this.updateObject(selected.id, {
        imageSrc: imageSrc.trim(),
        label: 'Image',
      });
      return;
    }

    const currentDestination = selected.pageNumber ? `page:${selected.pageNumber}` : selected.url ?? '';
    const nextDestination = window.prompt('Edit destination URL or internal page (page:<number>):', currentDestination);
    if (nextDestination === null || !nextDestination.trim()) return;
    const destination = this.parseLinkDestination(nextDestination);
    if (!destination) {
      this.error = `Invalid link destination. Use an HTTP(S) URL or page:1 through page:${this.totalPages}.`;
      return;
    }
    const nextText = window.prompt('Edit link label:', selected.text ?? selected.label);
    if (nextText === null) {
      return;
    }

    this.captureHistory('edit-link');
    this.updateObject(selected.id, {
      url: destination.url,
      pageNumber: destination.pageNumber,
      text: nextText,
      label: 'Link',
    });
  }

  activateLink(event: MouseEvent, object: EditableObject): void {
    event.stopPropagation();
    if (!object.pageNumber) return;
    event.preventDefault();
    void this.goToPage(object.pageNumber);
  }

  private parseLinkDestination(input: string): { url?: string; pageNumber?: number } | null {
    const pageMatch = /^page:\s*(\d+)$/i.exec(input.trim());
    if (pageMatch) {
      const pageNumber = Number(pageMatch[1]);
      return Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= this.totalPages
        ? { pageNumber }
        : null;
    }
    try {
      const url = new URL(input.trim());
      return url.protocol === 'http:' || url.protocol === 'https:' ? { url: input.trim() } : null;
    } catch {
      return null;
    }
  }

  deleteSelection(): void {
    if (!this.selectedObjectId || this.document?.isEncrypted || this.viewingMode !== 'single') {
      return;
    }

    this.captureHistory('delete-object');
    this.overlayObjects = this.overlayObjects.filter((item) => item.id !== this.selectedObjectId);
    this.selectedObjectId = null;
  }

  private createBaseObject(initial: {
    type: EditableObjectType;
    label: string;
    width: number;
    height: number;
    text?: string;
    imageSrc?: string;
    url?: string;
    pageNumber?: number;
    fontSize?: number;
    bold?: boolean;
  }): EditableObject {
    const nextId = `obj-${Date.now()}-${this.overlayObjects.length}`;
    const base = this.clampObject({
      id: nextId,
      type: initial.type,
      x: Math.min(48 + this.overlayObjects.length * 12, Math.max(0, this.overlayWidth - 180)),
      y: Math.min(48 + this.overlayObjects.length * 12, Math.max(0, this.overlayHeight - 90)),
      width: initial.width,
      height: initial.height,
      label: initial.label,
      text: initial.text,
      imageSrc: initial.imageSrc,
      url: initial.url,
      pageNumber: initial.pageNumber,
      ...(initial.fontSize !== undefined ? { fontSize: initial.fontSize } : {}),
      ...(initial.bold !== undefined ? { bold: initial.bold } : {}),
    });

    return base;
  }

  startMove(event: MouseEvent, objectId: string): void {
    event.preventDefault();
    event.stopPropagation();

    const object = this.overlayObjects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }

    this.selectedObjectId = objectId;
    this.captureHistory('move-object');
    this.dragState = {
      mode: 'move',
      objectId,
      startX: event.clientX,
      startY: event.clientY,
      original: { ...object },
    };
  }

  startResize(event: MouseEvent, objectId: string, handle: ResizeHandle): void {
    event.preventDefault();
    event.stopPropagation();

    const object = this.overlayObjects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }

    this.selectedObjectId = objectId;
    this.captureHistory('resize-object');
    this.dragState = {
      mode: 'resize',
      objectId,
      startX: event.clientX,
      startY: event.clientY,
      original: { ...object },
      handle,
    };
  }

  copySelection(): void {
    if (!this.selectedObjectId) {
      return;
    }

    const selected = this.overlayObjects.find((item) => item.id === this.selectedObjectId);
    if (!selected) {
      return;
    }

    this.clipboardObject = { ...selected };
  }

  cutSelection(): void {
    if (!this.selectedObjectId) {
      return;
    }

    const selected = this.overlayObjects.find((item) => item.id === this.selectedObjectId);
    if (!selected) {
      return;
    }

    this.clipboardObject = { ...selected };
    this.captureHistory('cut-object');
    this.overlayObjects = this.overlayObjects.filter((item) => item.id !== this.selectedObjectId);
    this.selectedObjectId = null;
  }

  pasteClipboard(): void {
    if (!this.clipboardObject) {
      return;
    }

    const nextId = `obj-${Date.now()}-${this.overlayObjects.length}`;
    const pasted = this.clampObject({
      ...this.clipboardObject,
      id: nextId,
      x: this.clipboardObject.x + 20,
      y: this.clipboardObject.y + 20,
      label: `${this.clipboardObject.label} copy`,
    });

    this.captureHistory('paste-object');
    this.overlayObjects = [...this.overlayObjects, pasted];
    this.selectedObjectId = nextId;
  }

  async undoEdit(): Promise<void> {
    if (this.document?.isEncrypted || this.viewingMode !== 'single') return;
    if (this.document && this.pageTransformUndo.length) {
      const previousBytes = this.pageTransformUndo.pop()!;
      this.pageTransformRedo.push(this.document.bytes.slice());
      await this.refreshDocumentAfterPageOperation(previousBytes, this.currentPage);
      this.syncHistoryState();
      this.setActionStatus('info', 'Undid the last page change. Press Ctrl+Y to redo.');
      return;
    }
    const previous = this.historyService.undo(this.cloneOverlayObjects(this.overlayObjects));
    if (!previous) {
      this.syncHistoryState();
      return;
    }

    this.overlayObjects = previous;
    this.selectedObjectId = null;
    this.store.dispatch(undoEditCommand());
    this.syncHistoryState();
    this.scheduleAutosave();
  }

  async redoEdit(): Promise<void> {
    if (this.document?.isEncrypted || this.viewingMode !== 'single') return;
    if (this.document && this.pageTransformRedo.length) {
      const nextBytes = this.pageTransformRedo.pop()!;
      this.pageTransformUndo.push(this.document.bytes.slice());
      await this.refreshDocumentAfterPageOperation(nextBytes, this.currentPage);
      this.syncHistoryState();
      this.setActionStatus('info', 'Redid the last page change.');
      return;
    }
    const next = this.historyService.redo(this.cloneOverlayObjects(this.overlayObjects));
    if (!next) {
      this.syncHistoryState();
      return;
    }

    this.overlayObjects = next;
    this.selectedObjectId = null;
    this.store.dispatch(redoEditCommand());
    this.syncHistoryState();
    this.scheduleAutosave();
  }

  async updateFormField(widget: FormWidget, value: string): Promise<void> {
    if (!this.document || this.document.isEncrypted || widget.readOnly) return;
    try {
      const bytes = await this.pdfFormService.updateField(this.document.bytes, widget.name, value);
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to update form field "${widget.name}": ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async exportFormData(): Promise<void> {
    if (!this.document) return;
    const document = this.document;
    const name = `${document.name.replace(/\.pdf$/i, '')}-form-data.json`;
    await this.runAction('Exporting form data...', 'Unable to export form data', async () => {
      const serialized = await this.pdfFormService.exportFormData(document.bytes);
      const data = await new Blob([serialized], { type: 'application/json' }).arrayBuffer();
      const result = await this.runtimeService.saveFileDialog(name, data, 'application/json');
      if (result?.canceled) return null;
      return `Form data exported to ${this.savedName(result, name)}.`;
    }, 'Export cancelled. No form data file was saved.');
  }

  async importFormDataFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.document) return;
    input.value = '';
    if (file.size > 5 * 1024 * 1024) {
      this.setActionStatus('error', 'Unable to import form data: form data files must be 5 MB or smaller.');
      return;
    }
    const document = this.document;
    await this.runAction(`Importing form data from ${file.name}...`, 'Unable to import form data', async () => {
      const serialized = await file.text();
      const bytes = await this.pdfFormService.importFormData(document.bytes, serialized);
      const count = (JSON.parse(serialized) as { fields: unknown[] }).fields.length;
      if (!count) return null;
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
      return `Imported ${this.pluralize(count, 'form field value')} from ${file.name}. Save the PDF to keep them.`;
    }, `${file.name} contains no form field values. Nothing was changed.`);
  }

  beginFormFieldAuthoring(type: PdfFormFieldPlacement['type']): void {
    this.formAuthoringType = type;
    this.cropMode = false;
    this.cropSelection = null;
    this.cropDraft = null;
    this.setAnnotationTool(null);
    this.setActionStatus('info', `Click on page ${this.currentPage} where the ${this.formFieldLabel(type)} should go. Press Escape to cancel.`);
  }

  private formFieldLabel(type: PdfFormFieldPlacement['type']): string {
    return type === 'checkbox' ? 'checkbox' : type === 'dropdown' ? 'dropdown field' : 'text field';
  }

  selectFormField(widget: FormWidget): void {
    this.selectedFormFieldName = widget.name;
  }

  async startFormFieldPlacement(event: MouseEvent): Promise<void> {
    if (!this.document || !this.formAuthoringType || event.target !== this.annotationLayer?.nativeElement) return;
    event.preventDefault();
    const type = this.formAuthoringType;
    const label = this.formFieldLabel(type);
    const name = window.prompt(`Enter a name for the ${label}`);
    if (name === null || !name.trim()) {
      this.setActionStatus('info', `No name entered, so no ${label} was added. Click on the page to try again or press Escape to stop.`);
      return;
    }
    if (this.formWidgets.some(widget => widget.name === name.trim())) {
      this.setActionStatus('error', `Unable to add ${label}: a field named "${name.trim()}" already exists. Choose a different name.`);
      return;
    }
    let options: string[] | undefined;
    if (type === 'dropdown') {
      const enteredOptions = window.prompt('Enter dropdown options separated by commas', 'Option 1, Option 2');
      if (enteredOptions === null) {
        this.setActionStatus('info', 'Dropdown field cancelled. Nothing was added.');
        return;
      }
      options = enteredOptions.split(',').map(option => option.trim()).filter(Boolean);
    }
    const point = this.annotationPoint(event);
    const [width, height] = type === 'checkbox' ? [20, 20] : [140, 24];
    const rect = {
      x: Math.min(point.x, Math.max(0, this.overlayWidth - width)),
      y: Math.min(point.y, Math.max(0, this.overlayHeight - height)),
      width: Math.min(width, this.overlayWidth),
      height: Math.min(height, this.overlayHeight),
    };
    const document = this.document;
    const page = this.currentPage;
    await this.runAction(`Adding ${label} "${name.trim()}"...`, `Unable to add ${label}`, async () => {
      const bytes = await this.pdfFormService.createField(document.bytes, {
        name,
        type,
        pageNumber: page,
        viewportWidth: this.overlayWidth,
        viewportHeight: this.overlayHeight,
        rect,
        options,
      });
      this.formAuthoringType = null;
      await this.refreshDocumentAfterPageOperation(bytes, page);
      this.selectedFormFieldName = name.trim();
      return `Added ${label} "${name.trim()}" on page ${page}. Save the PDF to keep it.`;
    });
  }

  async toggleSelectedFieldRequired(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    try {
      const bytes = await this.pdfFormService.updateFieldDefinition(this.document.bytes, this.selectedFormFieldName, {
        required: !this.selectedFormFieldRequired,
      });
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to update required field setting: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async editSelectedFormField(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    const widget = this.formWidgets.find(item => item.name === this.selectedFormFieldName);
    if (!widget) return;
    if (widget.type === 'dropdown') {
      const enteredOptions = window.prompt('Edit dropdown options separated by commas', widget.options.join(', '));
      if (enteredOptions === null) return;
      const options = enteredOptions.split(',').map(option => option.trim()).filter(Boolean);
      try {
        const bytes = await this.pdfFormService.updateFieldDefinition(this.document.bytes, widget.name, { options });
        await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
      } catch (error) {
        this.error = `Unable to edit form field: ${error instanceof Error ? error.message : String(error)}`;
      }
      return;
    }
    if (widget.type === 'text') {
      const value = window.prompt('Edit field value', widget.value);
      if (value !== null) await this.updateFormField(widget, value);
    }
  }

  async deleteSelectedFormField(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    const name = this.selectedFormFieldName;
    if (!window.confirm(`Delete form field "${name}"?`)) return;
    try {
      const bytes = await this.pdfFormService.deleteField(this.document.bytes, name);
      this.formVisibilityRules = this.formVisibilityRules.filter(
        rule => rule.targetFieldName !== name && rule.sourceFieldName !== name
      );
      await this.persistFormVisibilityRules();
      this.selectedFormFieldName = null;
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to delete form field: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async setSelectedFieldCondition(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    const sourceFieldName = window.prompt('Show this field when which field has a value?');
    if (sourceFieldName === null) return;
    const source = this.formFields.find(field => field.name === sourceFieldName.trim());
    if (!source || source.name === this.selectedFormFieldName) {
      this.error = 'Choose a different existing form field as the visibility condition source.';
      return;
    }
    const equalsValue = window.prompt(`Show "${this.selectedFormFieldName}" when "${source.name}" equals:`);
    if (equalsValue === null) return;
    this.formVisibilityRules = [
      ...this.formVisibilityRules.filter(rule => rule.targetFieldName !== this.selectedFormFieldName),
      { targetFieldName: this.selectedFormFieldName, sourceFieldName: source.name, equalsValue },
    ];
    try {
      await this.persistFormVisibilityRules();
      await this.loadFormWidgets();
    } catch (error) {
      this.error = `Unable to save field visibility rule: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async clearSelectedFieldCondition(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    this.formVisibilityRules = this.formVisibilityRules.filter(rule => rule.targetFieldName !== this.selectedFormFieldName);
    try {
      await this.persistFormVisibilityRules();
      await this.loadFormWidgets();
    } catch (error) {
      this.error = `Unable to clear field visibility rule: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async loadFormWidgets(): Promise<void> {
    if (!this.document || typeof this.document.proxy?.getPage !== 'function') {
      this.formWidgets = [];
      this.formFields = [];
      return;
    }
    try {
      const fields = await this.pdfFormService.getFields(this.document.bytes);
      this.formFields = fields;
      const fieldsByName = new Map<string, PdfFormField>(fields.map(field => [field.name, field]));
      const storedRules = await this.persistenceService.getSetting<FormVisibilityRule[]>(this.formVisibilitySettingKey(this.document.id));
      this.formVisibilityRules = Array.isArray(storedRules) ? storedRules.filter(rule =>
        typeof rule?.targetFieldName === 'string' &&
        typeof rule?.sourceFieldName === 'string' &&
        typeof rule?.equalsValue === 'string' &&
        rule.targetFieldName !== rule.sourceFieldName &&
        fieldsByName.has(rule.targetFieldName) &&
        fieldsByName.has(rule.sourceFieldName)
      ) : [];
      const hiddenFields = new Set(this.formVisibilityRules
        .filter(rule => fieldsByName.get(rule.sourceFieldName)?.value !== rule.equalsValue)
        .map(rule => rule.targetFieldName));
      const page = await this.document.proxy.getPage(this.currentPage);
      if (typeof page.getAnnotations !== 'function' || typeof page.getViewport !== 'function') {
        this.formWidgets = [];
        return;
      }
      const viewport = page.getViewport({ scale: 1, rotation: this.rotation });
      const annotations = await page.getAnnotations({ intent: 'display' });
      const widgets: FormWidget[] = [];
      annotations.forEach((annotation: any, index: number) => {
        if (annotation.subtype !== 'Widget' || !Array.isArray(annotation.rect) || annotation.rect.length !== 4) return;
        const field = fieldsByName.get(annotation.fieldName);
        if (!field || field.type === 'unsupported' || hiddenFields.has(annotation.fieldName)) return;
        const fieldFlags = Number(annotation.fieldFlags) || 0;
        let type: FormWidget['type'];
        if (annotation.fieldType === 'Tx' && field.type === 'text') type = 'text';
        else if (annotation.fieldType === 'Ch' && field.type === 'dropdown') type = 'dropdown';
        else if (annotation.fieldType === 'Btn' && (fieldFlags & (1 << 15)) !== 0 && field.type === 'radio') type = 'radio';
        else if (annotation.fieldType === 'Btn' && field.type === 'checkbox') type = 'checkbox';
        else return;

        const rect = viewport.convertToViewportRectangle(annotation.rect) as number[];
        const x1 = Math.min(rect[0], rect[2]);
        const y1 = Math.min(rect[1], rect[3]);
        const scaleX = this.overlayWidth / viewport.width;
        const scaleY = this.overlayHeight / viewport.height;
        const option = String(annotation.buttonValue ?? annotation.exportValue ?? '');
        widgets.push({
          id: String(annotation.id ?? `${annotation.fieldName}-${index}`),
          name: annotation.fieldName,
          type,
          x: x1 * scaleX,
          y: y1 * scaleY,
          width: Math.abs(rect[2] - rect[0]) * scaleX,
          height: Math.abs(rect[3] - rect[1]) * scaleY,
          value: field.value,
          options: field.options,
          option: option || field.options[0] || '',
          date: type === 'text' && /date|dob|birth/i.test(annotation.fieldName),
          readOnly: this.document?.isEncrypted === true || annotation.isReadonly === true,
          required: field.required,
        });
      });
      this.formWidgets = widgets;
    } catch (error) {
      this.formWidgets = [];
      this.formFields = [];
      this.error = `Unable to load PDF form fields: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async persistFormVisibilityRules(): Promise<void> {
    if (!this.document) return;
    await this.persistenceService.setSetting(this.formVisibilitySettingKey(this.document.id), this.formVisibilityRules);
  }

  private formVisibilitySettingKey(documentId: string): string {
    return `pdf-form-visibility:${documentId}`;
  }

  private async renderCurrentPage(): Promise<void> {
    if (!this.document) {
      return;
    }
    if (this.viewingMode !== 'single') {
      this.scrollToModePage(this.currentPage);
      return;
    }

    const canvas = this.viewerCanvas?.nativeElement;
    const host = this.viewerHost?.nativeElement;

    if (!canvas || !host) {
      return;
    }

    const options = this.zoomMode === 'custom'
      ? { zoom: this.zoom, rotation: this.rotation }
      : {
        fitWidth: this.availableStageWidth(host),
        ...(this.zoomMode === 'fit-page' ? { fitHeight: Math.max(100, host.clientHeight - 32) } : {}),
        zoom: 1,
        rotation: this.rotation,
      };
    if (this.document.isEncrypted) {
      await this.pdfRenderService.renderLoadedPageToCanvas(this.document.proxy, this.currentPage, canvas, options);
    } else {
      await this.pdfRenderService.renderPageToCanvas(this.document.bytes, this.currentPage, canvas, options);
    }

    this.syncOverlayBounds(canvas);
    const measured = await this.updatePagePixelsPerPoint();
    if (measured && this.zoomMode !== 'custom') this.zoom = Math.round(this.pagePixelsPerPoint * 100) / 100;
    await this.loadFormWidgets();
    await this.updateSearchHighlights();
    this.cdr.markForCheck();
  }

  private availableStageWidth(host: HTMLElement): number {
    let width = host.clientWidth - 42;
    const sidebar = host.querySelector<HTMLElement>('.navigation-sidebar');
    if (sidebar && typeof getComputedStyle === 'function' && getComputedStyle(host).flexDirection !== 'column') {
      width -= sidebar.offsetWidth + 18;
    }
    return Math.max(100, width);
  }

  private async updatePagePixelsPerPoint(): Promise<boolean> {
    try {
      const page = await this.document?.proxy?.getPage(this.currentPage);
      const height = page?.getViewport?.({ scale: 1, rotation: this.rotation })?.height;
      const measured = height > 0 && this.overlayHeight > 0;
      this.pagePixelsPerPoint = measured ? this.overlayHeight / height : 1;
      return measured;
    } catch {
      this.pagePixelsPerPoint = 1;
      return false;
    }
  }

  private overlayBoundsPage: number | null = null;

  private syncOverlayBounds(canvas: HTMLCanvasElement): void {
    const previousWidth = this.overlayWidth;
    const previousHeight = this.overlayHeight;
    this.overlayWidth = canvas.clientWidth || canvas.width || 0;
    this.overlayHeight = canvas.clientHeight || canvas.height || 0;
    const samePage = this.overlayBoundsPage === this.currentPage;
    this.overlayBoundsPage = this.currentPage;
    if (samePage && previousWidth > 0 && previousHeight > 0 && this.overlayWidth > 0 && this.overlayHeight > 0
      && (Math.abs(previousWidth - this.overlayWidth) > 0.5 || Math.abs(previousHeight - this.overlayHeight) > 0.5)) {
      const sx = this.overlayWidth / previousWidth;
      const sy = this.overlayHeight / previousHeight;
      this.overlayObjects = this.overlayObjects.map(object => (object.pageNumber ?? this.currentPage) === this.currentPage
        ? { ...object, x: object.x * sx, y: object.y * sy, width: object.width * sx, height: object.height * sy }
        : object);
    }
    this.overlayObjects = this.overlayObjects.map((object) => this.clampObject(object));
  }

  private computeMovedObject(object: EditableObject, dx: number, dy: number): EditableObject {
    return this.clampObject({
      ...object,
      x: object.x + dx,
      y: object.y + dy,
    });
  }

  private computeResizedObject(object: EditableObject, dx: number, dy: number, handle: ResizeHandle): EditableObject {
    const minSize = 24;
    let { x, y, width, height } = object;

    if (handle.includes('e')) {
      width = Math.max(minSize, object.width + dx);
    }
    if (handle.includes('s')) {
      height = Math.max(minSize, object.height + dy);
    }
    if (handle.includes('w')) {
      const nextWidth = Math.max(minSize, object.width - dx);
      const diff = nextWidth - object.width;
      width = nextWidth;
      x = object.x - diff;
    }
    if (handle.includes('n')) {
      const nextHeight = Math.max(minSize, object.height - dy);
      const diff = nextHeight - object.height;
      height = nextHeight;
      y = object.y - diff;
    }

    return this.clampObject({ ...object, x, y, width, height });
  }

  private getSelectedObject(): EditableObject | null {
    if (!this.selectedObjectId) {
      return null;
    }

    return this.overlayObjects.find((item) => item.id === this.selectedObjectId) ?? null;
  }

  private updateObject(objectId: string, changes: Partial<EditableObject>): void {
    this.overlayObjects = this.overlayObjects.map((item) =>
      item.id === objectId ? this.clampObject({ ...item, ...changes }) : item
    );
  }

  private captureHistory(command: string): void {
    this.historyService.capture(this.cloneOverlayObjects(this.overlayObjects));
    this.store.dispatch(recordEditCommand({ command }));
    this.syncHistoryState();
    this.scheduleAutosave();
  }

  private cloneOverlayObjects(objects: EditableObject[]): EditableObject[] {
    return objects.map((item) => ({ ...item }));
  }

  private syncHistoryState(): void {
    this.canUndo = this.historyService.canUndo() || this.pageTransformUndo.length > 0;
    this.canRedo = this.historyService.canRedo() || this.pageTransformRedo.length > 0;
  }

  private clampObject(object: EditableObject): EditableObject {
    const minSize = 24;
    const widthLimit = this.overlayWidth > 0 ? this.overlayWidth : Number.MAX_SAFE_INTEGER;
    const heightLimit = this.overlayHeight > 0 ? this.overlayHeight : Number.MAX_SAFE_INTEGER;

    const width = Math.max(minSize, Math.min(object.width, widthLimit));
    const height = Math.max(minSize, Math.min(object.height, heightLimit));
    const x = Math.min(Math.max(0, object.x), Math.max(0, widthLimit - width));
    const y = Math.min(Math.max(0, object.y), Math.max(0, heightLimit - height));

    return {
      ...object,
      x,
      y,
      width,
      height,
    };
  }
}
