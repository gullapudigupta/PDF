import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PdfMetadata } from '../../services/pdf-security.service';
import { PDF_DIALOG_STYLES } from './pdf-dialog.styles';

@Component({
  selector: 'app-pdf-metadata-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="backdrop" (click)="cancelIfIdle()"></div>
    <section class="card" role="dialog" aria-modal="true" aria-labelledby="pdf-metadata-title" aria-describedby="pdf-metadata-desc">
      <header>
        <div>
          <h2 id="pdf-metadata-title">Document properties</h2>
          <p id="pdf-metadata-desc">Edit the metadata stored inside {{ fileName || 'this PDF' }}.</p>
        </div>
        <button type="button" class="icon-close" aria-label="Close document properties" (click)="cancelIfIdle()">&times;</button>
      </header>
      <form (ngSubmit)="submit()">
        <div class="body">
          <label class="field">Title
            <input #firstField name="metadataTitle" [(ngModel)]="draft.title" maxlength="500" placeholder="Document title" />
          </label>
          <div class="grid-2">
            <label class="field">Author
              <input name="metadataAuthor" [(ngModel)]="draft.author" maxlength="300" placeholder="Author name" />
            </label>
            <label class="field">Subject
              <input name="metadataSubject" [(ngModel)]="draft.subject" maxlength="500" placeholder="Subject" />
            </label>
          </div>
          <label class="field">Keywords <small>Separate keywords with commas</small>
            <textarea name="metadataKeywords" [(ngModel)]="draft.keywords" maxlength="1000" placeholder="invoice, 2026, client"></textarea>
          </label>
          <p *ngIf="error" class="error" role="alert">{{ error }}</p>
        </div>
        <footer>
          <button type="button" (click)="cancelIfIdle()" [disabled]="busy">Cancel</button>
          <button type="submit" class="primary" [disabled]="busy">{{ busy ? 'Saving...' : 'Save properties' }}</button>
        </footer>
      </form>
    </section>
  `,
  styles: [PDF_DIALOG_STYLES],
})
export class PdfMetadataDialogComponent implements OnChanges, AfterViewInit {
  @Input() metadata: PdfMetadata = { title: '', author: '', subject: '', keywords: '' };
  @Input() fileName = '';
  @Input() busy = false;
  @Input() error: string | null = null;
  @Output() save = new EventEmitter<PdfMetadata>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild('firstField') firstField?: ElementRef<HTMLInputElement>;
  draft: PdfMetadata = { title: '', author: '', subject: '', keywords: '' };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metadata']) this.draft = { ...this.metadata };
  }

  ngAfterViewInit(): void {
    this.firstField?.nativeElement.focus();
  }

  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event): void {
    event.stopPropagation();
    this.cancelIfIdle();
  }

  cancelIfIdle(): void {
    if (!this.busy) this.cancel.emit();
  }

  submit(): void {
    if (this.busy) return;
    this.save.emit({
      title: this.draft.title.trim(),
      author: this.draft.author.trim(),
      subject: this.draft.subject.trim(),
      keywords: this.draft.keywords.trim(),
    });
  }
}
