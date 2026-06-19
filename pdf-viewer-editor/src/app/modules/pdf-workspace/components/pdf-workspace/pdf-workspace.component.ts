import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { RuntimeService } from '@core/services/runtime.service';
import { PdfDocumentService, LoadedPdfDocument } from '../../services/pdf-document.service';
import { PdfRenderService } from '../../services/pdf-render.service';
import { HistoryService } from '../../services/history.service';
import { recordEditCommand, redoEditCommand, undoEditCommand } from '../../store/workspace.actions';

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type EditableObjectType = 'text' | 'image' | 'link';

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
}

@Component({
  selector: 'app-pdf-workspace',
  standalone: false,
  template: `
    <div class="workspace-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <h1>PDF Viewer & Editor</h1>
          <button (click)="openFile()">Open</button>
          <button [disabled]="!document" (click)="saveFile()">Save As</button>
          <button [disabled]="!document || loading" (click)="addTextObject()">Add Text</button>
          <button [disabled]="!document || loading" (click)="addImageObject()">Add Image</button>
          <button [disabled]="!document || loading" (click)="addLinkObject()">Add Link</button>
          <button [disabled]="!selectedObjectId" (click)="editSelection()">Edit</button>
          <button [disabled]="!selectedObjectId" (click)="deleteSelection()">Delete</button>
          <button [disabled]="!canUndo" (click)="undoEdit()">Undo</button>
          <button [disabled]="!canRedo" (click)="redoEdit()">Redo</button>
          <button [disabled]="!selectedObjectId" (click)="cutSelection()">Cut</button>
          <button [disabled]="!selectedObjectId" (click)="copySelection()">Copy</button>
          <button [disabled]="!clipboardObject" (click)="pasteClipboard()">Paste</button>
        </div>

        <div class="toolbar-right">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="searchInDocument()"
            placeholder="Search text"
          />
          <button [disabled]="!document || loading" (click)="searchInDocument()">Search</button>
        </div>
      </div>

      <div class="viewer-controls" *ngIf="document">
        <button (click)="previousPage()" [disabled]="currentPage <= 1 || loading">?</button>
        <span>Page {{ currentPage }} / {{ totalPages }}</span>
        <button (click)="nextPage()" [disabled]="currentPage >= totalPages || loading">?</button>

        <button (click)="zoomOut()" [disabled]="loading">-</button>
        <span>{{ (zoom * 100).toFixed(0) }}%</span>
        <button (click)="zoomIn()" [disabled]="loading">+</button>

        <button (click)="rotateLeft()" [disabled]="loading">?</button>
        <button (click)="rotateRight()" [disabled]="loading">?</button>
      </div>

      <div class="content" #viewerHost>
        <div class="status" *ngIf="loading">Loading PDF...</div>
        <div class="status error" *ngIf="!loading && error">{{ error }}</div>
        <div class="status" *ngIf="!loading && !document && !error">Open a PDF to start.</div>

        <div class="page-stage" *ngIf="document && !loading" #stageHost>
          <canvas #viewerCanvas></canvas>

          <div class="overlay-layer" [style.width.px]="overlayWidth" [style.height.px]="overlayHeight">
            <div
              *ngFor="let object of overlayObjects"
              class="overlay-object"
              [class.selected]="object.id === selectedObjectId"
              [style.left.px]="object.x"
              [style.top.px]="object.y"
              [style.width.px]="object.width"
              [style.height.px]="object.height"
              [class.overlay-text]="object.type === 'text'"
              [class.overlay-image]="object.type === 'image'"
              [class.overlay-link]="object.type === 'link'"
              (mousedown)="startMove($event, object.id)"
            >
              <div class="overlay-label">{{ object.label }}</div>
              <div *ngIf="object.type === 'text'" class="overlay-text-content">{{ object.text }}</div>
              <img
                *ngIf="object.type === 'image' && object.imageSrc"
                class="overlay-image-content"
                [src]="object.imageSrc"
                alt="Overlay image"
                draggable="false"
              />
              <a
                *ngIf="object.type === 'link'"
                class="overlay-link-content"
                [href]="object.url || '#'"
                target="_blank"
                rel="noreferrer"
                (click)="$event.stopPropagation()"
              >
                {{ object.text || object.url }}
              </a>

              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle nw"
                type="button"
                aria-label="Resize northwest"
                (mousedown)="startResize($event, object.id, 'nw')"
              ></button>
              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle ne"
                type="button"
                aria-label="Resize northeast"
                (mousedown)="startResize($event, object.id, 'ne')"
              ></button>
              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle sw"
                type="button"
                aria-label="Resize southwest"
                (mousedown)="startResize($event, object.id, 'sw')"
              ></button>
              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle se"
                type="button"
                aria-label="Resize southeast"
                (mousedown)="startResize($event, object.id, 'se')"
              ></button>
            </div>
          </div>
        </div>
      </div>

      <div class="search-result" *ngIf="searchMessage">{{ searchMessage }}</div>
    </div>
  `,
  styles: [
    `
      .workspace-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        background: #f5f5f5;
        border-bottom: 1px solid #ddd;
      }

      .toolbar-left,
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .toolbar h1 {
        margin-right: 8px;
        font-size: 18px;
        font-weight: 600;
      }

      button {
        padding: 6px 12px;
        border: 1px solid #c9c9c9;
        border-radius: 4px;
        background: white;
        cursor: pointer;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      input {
        padding: 6px 8px;
        border: 1px solid #c9c9c9;
        border-radius: 4px;
      }

      .viewer-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-bottom: 1px solid #e1e1e1;
        background: #fafafa;
      }

      .content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
        background: #e0e0e0;
        padding: 16px;
      }

      .page-stage {
        position: relative;
        display: inline-block;
      }

      canvas {
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        display: block;
      }

      .overlay-layer {
        position: absolute;
        left: 0;
        top: 0;
        pointer-events: none;
      }

      .overlay-object {
        position: absolute;
        border: 2px solid #5b8def;
        background: rgba(91, 141, 239, 0.12);
        pointer-events: auto;
        user-select: none;
        box-sizing: border-box;
        overflow: hidden;
      }

      .overlay-object.selected {
        border-color: #2059d0;
        background: rgba(32, 89, 208, 0.16);
      }

      .overlay-label {
        font-size: 12px;
        color: #17397e;
        padding: 2px 4px;
      }

      .overlay-text-content {
        padding: 4px;
        font-size: 13px;
        line-height: 1.35;
      }

      .overlay-image-content {
        width: 100%;
        height: calc(100% - 20px);
        object-fit: contain;
        display: block;
        pointer-events: none;
      }

      .overlay-link-content {
        display: block;
        padding: 4px;
        color: #0f57d4;
        text-decoration: underline;
        font-size: 13px;
      }

      .resize-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        border: 1px solid #0e2b66;
        background: white;
        border-radius: 50%;
        padding: 0;
      }

      .resize-handle.nw {
        left: -6px;
        top: -6px;
        cursor: nwse-resize;
      }

      .resize-handle.ne {
        right: -6px;
        top: -6px;
        cursor: nesw-resize;
      }

      .resize-handle.sw {
        left: -6px;
        bottom: -6px;
        cursor: nesw-resize;
      }

      .resize-handle.se {
        right: -6px;
        bottom: -6px;
        cursor: nwse-resize;
      }

      .status {
        padding: 12px;
        background: white;
        border-radius: 4px;
      }

      .error {
        color: #b00020;
      }

      .search-result {
        padding: 8px 16px;
        border-top: 1px solid #ddd;
        background: #f9f9f9;
      }
    `,
  ],
})
export class PdfWorkspaceComponent {
  @ViewChild('viewerCanvas') viewerCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewerHost') viewerHost?: ElementRef<HTMLDivElement>;
  @ViewChild('stageHost') stageHost?: ElementRef<HTMLDivElement>;

  document: LoadedPdfDocument | null = null;
  loading = false;
  error: string | null = null;
  searchQuery = '';
  searchMessage = '';

  currentPage = 1;
  totalPages = 0;
  zoom = 1;
  rotation = 0;

  overlayObjects: EditableObject[] = [];
  selectedObjectId: string | null = null;
  clipboardObject: EditableObject | null = null;
  overlayWidth = 0;
  overlayHeight = 0;
  canUndo = false;
  canRedo = false;

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

  constructor(
    private store: Store,
    private runtimeService: RuntimeService,
    private pdfDocumentService: PdfDocumentService,
    private pdfRenderService: PdfRenderService,
    private historyService: HistoryService<EditableObject[]>,
    private cdr: ChangeDetectorRef
  ) {}

  async openFile(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      this.searchMessage = '';

      const result = await this.runtimeService.openFileDialog();
      if (result.canceled || !result.file) {
        this.loading = false;
        return;
      }

      this.document = await this.pdfDocumentService.loadFromFile(result.file);
      this.totalPages = this.document.totalPages;
      this.currentPage = 1;
      this.zoom = 1;
      this.rotation = 0;
      this.overlayObjects = [];
      this.selectedObjectId = null;
      this.clipboardObject = null;
      this.historyService.clear();
      this.syncHistoryState();
      this.loading = false;
      this.cdr.detectChanges();

      await this.renderCurrentPage();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to open PDF';
      this.loading = false;
    }
  }

  async saveFile(): Promise<void> {
    if (!this.document) {
      return;
    }

    const saveBuffer = new ArrayBuffer(this.document.bytes.byteLength);
    new Uint8Array(saveBuffer).set(this.document.bytes);

    await this.runtimeService.saveFileDialog(this.document.name, saveBuffer);
  }

  async previousPage(): Promise<void> {
    if (this.currentPage <= 1 || this.loading) {
      return;
    }

    this.currentPage -= 1;
    await this.renderCurrentPage();
  }

  async nextPage(): Promise<void> {
    if (this.currentPage >= this.totalPages || this.loading) {
      return;
    }

    this.currentPage += 1;
    await this.renderCurrentPage();
  }

  async zoomIn(): Promise<void> {
    this.zoom = Math.min(3, this.zoom + 0.1);
    await this.renderCurrentPage();
  }

  async zoomOut(): Promise<void> {
    this.zoom = Math.max(0.5, this.zoom - 0.1);
    await this.renderCurrentPage();
  }

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
      this.searchMessage = '';
      return;
    }

    const query = this.searchQuery.trim().toLowerCase();

    for (let page = 1; page <= this.document.totalPages; page++) {
      const text = (await this.pdfDocumentService.extractText(page)).toLowerCase();
      if (text.includes(query)) {
        this.currentPage = page;
        await this.renderCurrentPage();
        this.searchMessage = `Found on page ${page}`;
        return;
      }
    }

    this.searchMessage = 'No match found';
  }

  @HostListener('window:resize')
  async onResize(): Promise<void> {
    if (this.document && !this.loading) {
      await this.renderCurrentPage();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragState) {
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
    this.dragState = null;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === 'backspace' || key === 'delete') {
      this.deleteSelection();
      event.preventDefault();
      return;
    }

    if (!event.ctrlKey && !event.metaKey) {
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

  addOverlayObject(): void {
    this.addTextObject();
  }

  addTextObject(): void {
    const text = window.prompt('Enter text for the new text box:', 'Sample text') ?? 'Sample text';
    const object = this.createBaseObject({
      type: 'text',
      label: 'Text Box',
      width: 220,
      height: 90,
      text,
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
    const url = window.prompt('Enter link URL:', 'https://example.com') ?? '';
    if (!url.trim()) {
      return;
    }

    const text = window.prompt('Enter link label:', 'Open link') ?? 'Open link';
    const object = this.createBaseObject({
      type: 'link',
      label: 'Link',
      width: 220,
      height: 70,
      text,
      url: url.trim(),
    });

    this.captureHistory('insert-link');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
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

    const nextUrl = window.prompt('Edit link URL:', selected.url ?? '');
    if (nextUrl === null || !nextUrl.trim()) {
      return;
    }
    const nextText = window.prompt('Edit link label:', selected.text ?? selected.label);
    if (nextText === null) {
      return;
    }

    this.captureHistory('edit-link');
    this.updateObject(selected.id, {
      url: nextUrl.trim(),
      text: nextText,
      label: 'Link',
    });
  }

  deleteSelection(): void {
    if (!this.selectedObjectId) {
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

  undoEdit(): void {
    const previous = this.historyService.undo(this.cloneOverlayObjects(this.overlayObjects));
    if (!previous) {
      this.syncHistoryState();
      return;
    }

    this.overlayObjects = previous;
    this.selectedObjectId = null;
    this.store.dispatch(undoEditCommand());
    this.syncHistoryState();
  }

  redoEdit(): void {
    const next = this.historyService.redo(this.cloneOverlayObjects(this.overlayObjects));
    if (!next) {
      this.syncHistoryState();
      return;
    }

    this.overlayObjects = next;
    this.selectedObjectId = null;
    this.store.dispatch(redoEditCommand());
    this.syncHistoryState();
  }

  private async renderCurrentPage(): Promise<void> {
    if (!this.document) {
      return;
    }

    const canvas = this.viewerCanvas?.nativeElement;
    const host = this.viewerHost?.nativeElement;

    if (!canvas || !host) {
      return;
    }

    await this.pdfRenderService.renderPageToCanvas(this.document.bytes, this.currentPage, canvas, {
      fitWidth: Math.max(100, host.clientWidth - 32),
      fitHeight: Math.max(100, host.clientHeight - 32),
      zoom: this.zoom,
      rotation: this.rotation,
    });

    this.syncOverlayBounds(canvas);
  }

  private syncOverlayBounds(canvas: HTMLCanvasElement): void {
    this.overlayWidth = canvas.clientWidth || canvas.width || 0;
    this.overlayHeight = canvas.clientHeight || canvas.height || 0;
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
  }

  private cloneOverlayObjects(objects: EditableObject[]): EditableObject[] {
    return objects.map((item) => ({ ...item }));
  }

  private syncHistoryState(): void {
    this.canUndo = this.historyService.canUndo();
    this.canRedo = this.historyService.canRedo();
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
