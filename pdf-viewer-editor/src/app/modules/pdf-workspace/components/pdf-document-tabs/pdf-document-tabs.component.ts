import { ChangeDetectorRef, Component, ComponentRef, ElementRef, OnDestroy, QueryList, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
import { PageSizes, PDFDocument } from 'pdf-lib';
import { OpenedPdfFile } from '@core/adapters/runtime.adapter';
import { RuntimeService } from '@core/services/runtime.service';
import { PdfDocumentTabComponent } from './pdf-document-tab.component';
import { WorkspaceOpenRequest } from '../pdf-workspace/pdf-workspace.component';
import type { OcrWindowComponent } from '../ocr/ocr-window.component';

interface DocumentTab {
  id: string;
  file: OpenedPdfFile | null;
}

@Component({
  selector: 'app-pdf-document-tabs',
  standalone: false,
  template: `
    <ng-template #documentCommands>
    <div class="document-bar">
      <details #fileMenu class="file-menu">
        <summary>Open PDF</summary>
        <div class="file-menu-actions">
          <button type="button" (click)="fileMenu.open = false; openDocuments({ multiple: false })" [disabled]="selecting">Open PDF</button>
          <button type="button" (click)="fileMenu.open = false; openDocuments({ multiple: true })" [disabled]="selecting">Open multiple PDFs</button>
        </div>
      </details>
      <button type="button" class="new-pdf" (click)="createBlankDocument()" [disabled]="selecting"
        title="Create a blank A4 PDF in a new tab">New PDF</button>
      <button type="button" class="new-pdf resume" (click)="resumeBuilderOpen = true"
        title="Build a professional resume from 4 ATS-friendly templates with AI help">Resume builder</button>
      <button type="button" class="new-pdf ocr" (click)="openOcr()" [disabled]="ocrLoading"
        title="Extract text from an image or the current page (offline OCR, Indian languages)">{{ ocrLoading ? 'Loading…' : 'Image to text' }}</button>
      <div class="document-tabs" role="tablist" aria-label="Open PDF documents">
        <div *ngFor="let tab of tabs; let index = index; trackBy: trackTab" class="tab-item" role="presentation">
          <button #tabButton type="button" role="tab" [id]="'pdf-tab-' + tab.id"
            [attr.aria-controls]="'pdf-document-' + tab.id" [attr.aria-selected]="activeId === tab.id"
            [tabindex]="activeId === tab.id ? 0 : -1" [title]="tab.file?.file?.name || 'Empty tab'"
            (click)="selectTab(tab.id)" (keydown)="onTabKeydown($event, index)">
            {{ tab.file?.file?.name || 'Empty' }}
          </button>
          <button *ngIf="tab.file" type="button" class="close-tab"
            [attr.aria-label]="'Close ' + tab.file.file.name" (click)="closeTab(tab.id)">X</button>
        </div>
      </div>
    </div>
    </ng-template>
    <p *ngIf="selecting" role="status">Choose PDF files to open...</p>
    <p *ngIf="error" class="tab-error" role="alert">{{ error }}</p>
    <app-resume-builder *ngIf="resumeBuilderOpen" (close)="resumeBuilderOpen = false"
      (openPdf)="openResume($event)"></app-resume-builder>
    <ng-container #ocrHost></ng-container>
    <app-pdf-document-tab *ngFor="let tab of tabs; trackBy: trackTab"
      [tabId]="tab.id" [file]="tab.file" [active]="activeId === tab.id"
      [commandTemplate]="activeId === tab.id ? documentCommands : null"
      [style.display]="activeId === tab.id ? 'flex' : 'none'" [attr.inert]="activeId === tab.id ? null : ''"
      role="tabpanel" [id]="'pdf-document-' + tab.id" [attr.aria-labelledby]="'pdf-tab-' + tab.id"
      (openRequested)="openDocuments($event)" (closeRequested)="closeTab(tab.id)"></app-pdf-document-tab>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; height: 100%; min-width: 0; min-height: 0; overflow: hidden; }
    .document-bar { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
    button { min-height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #202938; padding: 6px 10px; cursor: pointer; font: inherit; font-size: 12px; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    button[aria-selected="true"] { color: var(--brand-peacock, #006b63); border-color: var(--brand-peacock, #006b63); background: #e7f5f2; font-weight: 700; }
    button:focus-visible { outline: 3px solid var(--brand-lotus, #b33b65); outline-offset: 1px; }
    .document-tabs { display: flex; gap: 6px; flex: 1; min-width: 0; overflow-x: auto; padding: 3px; }
    .tab-item { display: flex; flex: 0 0 auto; gap: 2px; align-items: center; }
    .tab-item [role="tab"] { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .close-tab { padding: 6px 8px; }
    .new-pdf { flex: 0 0 auto; font-weight: 600; white-space: nowrap; }
    .resume, .ocr { color: var(--brand-lotus, #b33b65); border-color: #e9b9ca; }
    .file-menu { position: relative; flex: 0 0 auto; }
    .file-menu summary { display: flex; align-items: center; min-height: 40px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #202938; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .file-menu summary::after { content: ' +'; margin-left: 6px; color: var(--brand-lotus, #b33b65); }
    .file-menu summary:focus-visible { outline: 3px solid var(--brand-lotus, #b33b65); outline-offset: 1px; }
    .file-menu-actions { position: absolute; top: calc(100% + 4px); left: 0; z-index: 50; display: flex; flex-direction: column; gap: 6px; width: 190px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; box-shadow: 0 8px 20px #0002; }
    .tab-error, p[role="status"] { padding: 8px 12px; margin: 0; overflow-wrap: anywhere; }
    .tab-error { color: #b42318; background: #fff; }
    @media (max-width: 600px) {
      /* Phone: two tidy header rows (Tools/Open/New/AI chat, then Resume builder + scrollable tabs). */
      .document-bar { display: contents; }
      .document-bar::after { content: ''; order: 2; flex-basis: 100%; height: 0; }
      .resume, .ocr { order: 3; }
      .document-tabs { order: 4; flex: 1 1 0; }
      button, .file-menu summary { padding: 6px 8px; }
    }
  `],
})
export class PdfDocumentTabsComponent implements OnDestroy {
  @ViewChild('ocrHost', { read: ViewContainerRef, static: true }) ocrHost?: ViewContainerRef;
  private ocrRef: ComponentRef<OcrWindowComponent> | null = null;
  ocrLoading = false;
  private ocrReturnFocus: HTMLElement | null = null;
  @ViewChildren(PdfDocumentTabComponent) hosts?: QueryList<PdfDocumentTabComponent>;
  @ViewChildren('tabButton') tabButtons?: QueryList<ElementRef<HTMLButtonElement>>;
  tabs: DocumentTab[] = [{ id: 'document-1', file: null }];
  activeId = 'document-1';
  selecting = false;
  error = '';
  private nextId = 1;
  private untitledCount = 0;
  resumeBuilderOpen = false;

  /** Opens an exported resume in a new editor tab and closes the builder (the draft stays in memory). */
  openResume(file: File): void {
    this.addFiles([{ file }]);
    this.resumeBuilderOpen = false;
    this.cdr.markForCheck();
  }

  constructor(private runtime: RuntimeService, private cdr: ChangeDetectorRef) {}

  /** Loads the OCR window chunk on first use only, so OCR never weighs on the initial download. */
  async openOcr(): Promise<void> {
    if (this.ocrRef || this.ocrLoading || !this.ocrHost) return;
    this.ocrReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.ocrLoading = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      const { OcrWindowComponent } = await import('../ocr/ocr-window.component');
      const ref = this.ocrHost.createComponent(OcrWindowComponent);
      const workspace = this.activeWorkspace;
      ref.setInput('pageSource', workspace?.document ? () => this.activeWorkspace?.renderCurrentPageForOcr() ?? Promise.resolve(null) : null);
      ref.setInput('canAddToPdf', !!workspace?.canInsertText);
      ref.instance.close.subscribe(() => this.closeOcr());
      ref.instance.addToPdf.subscribe(text => {
        const workspace = this.activeWorkspace;
        const problem = workspace ? workspace.addTextObjectWithText(text) : 'Open a PDF first.';
        if (problem) {
          ref.instance.error = problem;
          ref.changeDetectorRef.markForCheck();
        } else {
          this.closeOcr();
        }
      });
      this.ocrRef = ref;
    } catch (error) {
      this.error = `Unable to open Image to text: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.ocrLoading = false;
      this.cdr.markForCheck();
    }
  }

  closeOcr(): void {
    const wasOpen = this.ocrRef !== null;
    this.ocrRef?.destroy();
    this.ocrRef = null;
    this.cdr.markForCheck();
    if (wasOpen) this.ocrReturnFocus?.focus();
    this.ocrReturnFocus = null;
  }

  ngOnDestroy(): void {
    this.closeOcr();
  }

  private get activeWorkspace() {
    return this.hosts?.find(host => host.tabId === this.activeId)?.workspace;
  }

  async openDocuments(request: WorkspaceOpenRequest): Promise<void> {
    if (this.selecting) return;
    this.selecting = true;
    this.error = '';
    try {
      if (request.recent?.path && this.runtime.isDesktop()) {
        const bytes = await this.runtime.readFile(request.recent.path);
        this.addFiles([{ file: new File([bytes], request.recent.name, { type: 'application/pdf' }), filePath: request.recent.path }]);
      } else if (request.multiple) {
        const result = await this.runtime.openMultipleFileDialog();
        if (!result.canceled) this.addFiles(result.files);
      } else {
        const result = await this.runtime.openFileDialog();
        if (!result.canceled) {
          if (!result.file) throw new Error('The PDF picker returned no file.');
          this.addFiles([{ file: result.file, filePath: result.filePath }]);
        }
      }
    } catch (error) {
      this.error = `Unable to open PDF files: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.selecting = false;
      this.cdr.markForCheck();
    }
  }

  async createBlankDocument(): Promise<void> {
    if (this.selecting) return;
    this.selecting = true;
    this.error = '';
    try {
      const pdf = await PDFDocument.create();
      pdf.addPage(PageSizes.A4);
      const bytes = await pdf.save();
      const name = `Untitled-${++this.untitledCount}.pdf`;
      this.addFiles([{ file: new File([bytes as BlobPart], name, { type: 'application/pdf' }) }]);
    } catch (error) {
      this.error = `Unable to create a new PDF: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.selecting = false;
      this.cdr.markForCheck();
    }
  }

  private addFiles(files: OpenedPdfFile[]): void {
    if (!files.length) throw new Error('No PDF files were selected.');
    for (const selected of files) {
      const existing = this.tabs.find(tab => tab.file && (
        selected.filePath ? tab.file.filePath === selected.filePath :
          !tab.file.filePath && tab.file.file.name === selected.file.name &&
          tab.file.file.size === selected.file.size && tab.file.file.lastModified === selected.file.lastModified
      ));
      if (existing) {
        this.activeId = existing.id;
        continue;
      }
      const empty = this.tabs.find(tab => !tab.file);
      if (empty) {
        empty.file = selected;
        this.activeId = empty.id;
      } else {
        const tab: DocumentTab = { id: `document-${++this.nextId}`, file: selected };
        this.tabs = [...this.tabs, tab];
        this.activeId = tab.id;
      }
    }
  }

  selectTab(id: string): void {
    this.activeId = id;
    this.error = '';
    this.cdr.detectChanges();
    this.focusActiveTab();
  }

  async closeTab(id: string): Promise<void> {
    const tab = this.tabs.find(item => item.id === id);
    if (!tab) {
      this.error = 'The selected PDF tab is no longer open.';
      return;
    }
    if (tab.file && !window.confirm(`Close ${tab.file.file.name}? Save your PDF first if you want to keep edits in the original file.`)) return;
    this.selectTab(id);
    try {
      const host = this.hosts?.find(item => item.tabId === id);
      if (!host) throw new Error('The PDF workspace is not ready. Try again.');
      if (!(await host.close())) return;
      const index = this.tabs.indexOf(tab);
      this.tabs = this.tabs.filter(item => item.id !== id);
      if (!this.tabs.length) this.tabs = [{ id: `document-${++this.nextId}`, file: null }];
      this.activeId = this.tabs[Math.min(index, this.tabs.length - 1)].id;
      this.cdr.detectChanges();
      this.focusActiveTab();
    } catch (error) {
      this.error = `Unable to close PDF: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.cdr.markForCheck();
    }
  }

  onTabKeydown(event: KeyboardEvent, index: number): void {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % this.tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + this.tabs.length) % this.tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.tabs.length - 1;
    else return;
    event.preventDefault();
    this.selectTab(this.tabs[next].id);
    this.cdr.detectChanges();
    this.focusActiveTab();
  }

  private focusActiveTab(): void {
    this.tabButtons?.find(button => button.nativeElement.id === `pdf-tab-${this.activeId}`)?.nativeElement.focus();
  }

  trackTab(_index: number, tab: DocumentTab): string { return tab.id; }
}
