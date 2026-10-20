import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OCR_LANGUAGES, OcrCancelledError, OcrEngineService, OcrProgress } from './ocr-engine.service';

export interface OcrPageImage {
  canvas: HTMLCanvasElement;
  label: string;
}

export type OcrPageSource = () => Promise<OcrPageImage | null>;

export const OCR_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const OCR_MAX_PIXELS = 40_000_000;
const OCR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];

/** Full-screen "Image to text" window. Created lazily by the tab shell via dynamic import. */
@Component({
  selector: 'app-ocr-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [OcrEngineService],
  templateUrl: './ocr-window.component.html',
  styleUrls: ['./ocr-window.component.scss'],
})
export class OcrWindowComponent implements OnInit, OnDestroy {
  /** Renders the active PDF page for OCR, or null when no PDF is open. */
  @Input() pageSource: OcrPageSource | null = null;
  @Input() canAddToPdf = false;
  @Output() close = new EventEmitter<void>();
  @Output() addToPdf = new EventEmitter<string>();

  @ViewChild('dialog', { static: true }) dialog?: ElementRef<HTMLElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly languages = OCR_LANGUAGES;
  selectedLanguages = new Set<string>(['eng']);
  sourceLabel = '';
  previewUrl: string | null = null;
  private image: HTMLCanvasElement | null = null;
  loadingSource = false;
  busy = false;
  progress: OcrProgress | null = null;
  resultText = '';
  confidence: number | null = null;
  error = '';
  notice = '';
  dragging = false;

  constructor(private engine: OcrEngineService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    queueMicrotask(() => this.dialog?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.revokePreview();
    this.image = null;
    void this.engine.cancel().finally(() => this.engine.dispose());
  }

  get hasImage(): boolean {
    return this.image !== null;
  }

  get languageSummary(): string {
    return this.languages.filter(language => this.selectedLanguages.has(language.code)).map(language => language.label.split(' (')[0]).join(', ');
  }

  get progressPercent(): number {
    return Math.round((this.progress?.progress ?? 0) * 100);
  }

  toggleLanguage(code: string, checked: boolean): void {
    if (checked) this.selectedLanguages.add(code);
    else if (this.selectedLanguages.size > 1) this.selectedLanguages.delete(code);
    else this.notice = 'Keep at least one language selected.';
    this.selectedLanguages = new Set(this.selectedLanguages);
  }

  isSelected(code: string): boolean {
    return this.selectedLanguages.has(code);
  }

  chooseFile(): void {
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.loadImageFile(file, file.name);
  }

  onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dragging = true;
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) await this.loadImageFile(file, file.name);
  }

  @HostListener('window:paste', ['$event'])
  async onPaste(event: ClipboardEvent): Promise<void> {
    const item = Array.from(event.clipboardData?.items ?? []).find(entry => entry.kind === 'file' && entry.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    await this.loadImageFile(file, 'Pasted image');
  }

  async pasteFromClipboard(): Promise<void> {
    this.clearMessages();
    try {
      if (!navigator.clipboard?.read) throw new Error('unsupported');
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find(entry => entry.startsWith('image/'));
        if (type) {
          await this.loadImageFile(await item.getType(type), 'Pasted image');
          return;
        }
      }
      this.error = 'The clipboard has no image. Copy an image or screenshot first, then try again.';
    } catch {
      this.error = 'This browser blocked clipboard access. Press Ctrl+V (Cmd+V on Mac) in this window to paste an image.';
    }
    this.cdr.markForCheck();
  }

  async useCurrentPage(): Promise<void> {
    if (!this.pageSource || this.busy) return;
    this.clearMessages();
    this.loadingSource = true;
    this.cdr.markForCheck();
    try {
      const page = await this.pageSource();
      if (!page) {
        this.error = 'Open a PDF first, then choose "Current PDF page".';
        return;
      }
      await this.setImage(page.canvas, page.label);
    } catch (error) {
      this.error = `Unable to render the current page: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.loadingSource = false;
      this.cdr.markForCheck();
    }
  }

  async loadImageFile(file: Blob, label: string): Promise<void> {
    if (this.busy) return;
    this.clearMessages();
    if (!OCR_IMAGE_TYPES.includes(file.type)) {
      this.error = 'Choose a PNG, JPEG, WebP or BMP image.';
      this.cdr.markForCheck();
      return;
    }
    if (file.size > OCR_MAX_FILE_BYTES) {
      this.error = 'This image is larger than 20 MB. Resize or crop it, then try again.';
      this.cdr.markForCheck();
      return;
    }
    this.loadingSource = true;
    this.cdr.markForCheck();
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width * bitmap.height > OCR_MAX_PIXELS) {
          this.error = `This image is ${bitmap.width}×${bitmap.height} pixels. Use an image under 40 megapixels.`;
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable.');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0);
        await this.setImage(canvas, label);
      } finally {
        bitmap.close?.();
      }
    } catch {
      this.error = 'This image could not be read. It may be damaged or in an unsupported format.';
    } finally {
      this.loadingSource = false;
      this.cdr.markForCheck();
    }
  }

  async recognize(): Promise<void> {
    if (!this.image || this.busy) return;
    this.clearMessages();
    this.busy = true;
    this.progress = { stage: 'Loading the OCR engine', progress: 0 };
    this.cdr.markForCheck();
    try {
      const result = await this.engine.recognize(this.image, [...this.selectedLanguages], progress => {
        this.progress = progress;
        this.cdr.markForCheck();
      });
      this.resultText = result.text;
      this.confidence = result.confidence;
      this.notice = result.text
        ? `Text extracted (${result.confidence}% confidence). Review and correct it before using it.`
        : 'No text was found. Try a sharper image or choose the correct language.';
    } catch (error) {
      if (error instanceof OcrCancelledError) this.notice = 'Recognition cancelled. Nothing was changed.';
      else this.error = `Text recognition failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.busy = false;
      this.progress = null;
      this.cdr.markForCheck();
      setTimeout(() => this.restoreFocus());
    }
  }

  async cancel(): Promise<void> {
    await this.engine.cancel();
  }

  async copyText(): Promise<void> {
    if (!this.resultText) return;
    this.clearMessages();
    try {
      await navigator.clipboard.writeText(this.resultText);
      this.notice = 'Text copied to the clipboard.';
    } catch {
      this.error = 'Copy was blocked by the browser. Select the text and press Ctrl+C.';
    }
    this.cdr.markForCheck();
  }

  downloadText(): void {
    if (!this.resultText) return;
    const url = URL.createObjectURL(new Blob([this.resultText], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(this.sourceLabel || 'image').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w\- ]+/g, '').trim() || 'image'}-text.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.notice = 'Text file downloaded.';
  }

  insertIntoPdf(): void {
    if (!this.resultText.trim() || !this.canAddToPdf) return;
    this.addToPdf.emit(this.resultText.trim());
  }

  requestClose(): void {
    this.close.emit();
  }

  /** Keeps workspace shortcuts (page keys, Ctrl+F, Delete) from acting on the PDF behind this window. */
  onDialogKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Escape') this.handleEscape(event);
  }

  /** Escape still works when focus fell back to the page, e.g. after a disabled button lost it. */
  @HostListener('document:keydown.escape', ['$event'])
  onDocumentEscape(event: Event): void {
    this.handleEscape(event);
  }

  private handleEscape(event: Event): void {
    event.preventDefault();
    if (this.busy) void this.cancel();
    else this.requestClose();
  }

  private restoreFocus(): void {
    const dialog = this.dialog?.nativeElement;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
  }

  private async setImage(canvas: HTMLCanvasElement, label: string): Promise<void> {
    this.revokePreview();
    this.image = canvas;
    this.sourceLabel = label;
    this.resultText = '';
    this.confidence = null;
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    this.previewUrl = blob ? URL.createObjectURL(blob) : null;
    this.notice = `${label} is ready. Choose the languages in the image, then select "Extract text".`;
  }

  private revokePreview(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }

  private clearMessages(): void {
    this.error = '';
    this.notice = '';
  }
}
