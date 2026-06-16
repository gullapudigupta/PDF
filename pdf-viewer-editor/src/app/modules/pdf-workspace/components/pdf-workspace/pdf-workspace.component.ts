import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { RuntimeService } from '@core/services/runtime.service';
import { PdfDocumentService, LoadedPdfDocument } from '../../services/pdf-document.service';
import { PdfRenderService } from '../../services/pdf-render.service';

@Component({
  selector: 'app-pdf-workspace',
  template: `
    <div class="workspace-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <h1>PDF Viewer & Editor</h1>
          <button (click)="openFile()">Open</button>
          <button [disabled]="!document" (click)="saveFile()">Save As</button>
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

        <canvas #viewerCanvas *ngIf="document && !loading"></canvas>
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

      canvas {
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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

  document: LoadedPdfDocument | null = null;
  loading = false;
  error: string | null = null;
  searchQuery = '';
  searchMessage = '';

  currentPage = 1;
  totalPages = 0;
  zoom = 1;
  rotation = 0;

  constructor(
    private runtimeService: RuntimeService,
    private pdfDocumentService: PdfDocumentService,
    private pdfRenderService: PdfRenderService,
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

    await this.runtimeService.saveFileDialog(this.document.name, this.document.bytes.buffer);
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
  }
}
