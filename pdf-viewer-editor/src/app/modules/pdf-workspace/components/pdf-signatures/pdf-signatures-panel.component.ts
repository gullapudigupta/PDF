import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { PdfSignatureInfo, PdfSignatureService, SignatureError } from '../../services/pdf-signature.service';
import { PDF_DIALOG_STYLES } from '../pdf-dialogs/pdf-dialog.styles';

@Component({
  selector: 'app-pdf-signatures-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backdrop" (click)="close.emit()"></div>
    <section class="card" role="dialog" aria-modal="true" aria-labelledby="pdf-signatures-title" aria-describedby="pdf-signatures-desc">
      <header>
        <div>
          <h2 id="pdf-signatures-title">Signatures</h2>
          <p id="pdf-signatures-desc">Digital signatures in {{ fileName || 'this PDF' }}.</p>
        </div>
        <button #closeButton type="button" class="icon-close" aria-label="Close signatures" (click)="close.emit()">&times;</button>
      </header>
      <div class="body">
        <p *ngIf="loading" class="stage" role="status">Checking signatures...</p>
        <p *ngIf="error" class="error" role="alert">{{ error }}</p>
        <p *ngIf="!loading && !error && !signatures.length" class="empty" role="status">This PDF has no digital signatures.</p>
        <p *ngIf="!loading && signatures.length" class="summary" role="status">{{ summary }}</p>
        <ul class="list" *ngIf="signatures.length">
          <li *ngFor="let signature of signatures" [class]="'item ' + signature.status">
            <div class="title-row">
              <strong>{{ signature.signerName || 'Unknown signer' }}</strong>
              <span class="badge">{{ badge(signature) }}</span>
            </div>
            <p class="status">{{ signature.statusText }}</p>
            <dl>
              <div><dt>Field</dt><dd>{{ signature.fieldName }}</dd></div>
              <div *ngIf="signature.signingTime"><dt>Signed</dt><dd>{{ signature.signingTime | date: 'medium' }}</dd></div>
              <div *ngIf="signature.reason"><dt>Reason</dt><dd>{{ signature.reason }}</dd></div>
              <div *ngIf="signature.location"><dt>Location</dt><dd>{{ signature.location }}</dd></div>
              <div *ngIf="signature.issuerName"><dt>Issued by</dt><dd>{{ signature.issuerName }}</dd></div>
              <div *ngIf="signature.validFrom && signature.validTo"><dt>Certificate valid</dt>
                <dd>{{ signature.validFrom | date: 'mediumDate' }} – {{ signature.validTo | date: 'mediumDate' }}<span *ngIf="expiredAtSigning(signature)" class="warn"> (expired when signed)</span></dd></div>
            </dl>
          </li>
        </ul>
        <p class="note">This check confirms the document is unchanged and matches the signer's certificate. It does not check whether you trust the certificate issuer or whether the certificate was revoked (no online lookups).</p>
      </div>
      <footer>
        <button type="button" class="primary" (click)="close.emit()">Close</button>
      </footer>
    </section>
  `,
  styles: [PDF_DIALOG_STYLES, `
    .stage { color: #0b5d57; font-weight: 600; }
    .empty, .summary { font-weight: 600; }
    .list { list-style: none; margin: 0 0 12px; padding: 0; display: grid; gap: 10px; }
    .item { border: 1px solid #d6e2e0; border-left: 5px solid #8a989c; border-radius: 10px; padding: 10px 12px; background: #fbfdfc; }
    .item.valid { border-left-color: #0b7a5f; }
    .item.modified { border-left-color: #b26a00; }
    .item.invalid { border-left-color: #b3261e; }
    .title-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
    .badge { font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 999px; background: #eceff1; color: #37474f; }
    .valid .badge { background: #e0f4ec; color: #0b5d48; }
    .modified .badge { background: #fff1db; color: #7a4800; }
    .invalid .badge { background: #fde7e5; color: #8c1d18; }
    .status { margin: 6px 0; }
    dl { margin: 0; display: grid; gap: 2px; font-size: 13px; }
    dl div { display: flex; gap: 6px; flex-wrap: wrap; }
    dt { font-weight: 600; min-width: 112px; color: #37474f; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .warn { color: #8c1d18; font-weight: 600; }
  `],
})
export class PdfSignaturesPanelComponent implements OnInit, AfterViewInit {
  @Input() fileName = '';
  @Input() pdfBytes: Uint8Array | null = null;
  @Output() close = new EventEmitter<void>();
  @ViewChild('closeButton') closeButton?: ElementRef<HTMLButtonElement>;

  loading = true;
  error = '';
  signatures: PdfSignatureInfo[] = [];

  constructor(private service: PdfSignatureService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    void this.check();
  }

  ngAfterViewInit(): void {
    this.closeButton?.nativeElement.focus();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Escape') this.close.emit();
  }

  get summary(): string {
    const valid = this.signatures.filter(signature => signature.status === 'valid').length;
    const total = this.signatures.length;
    if (valid === total) return total === 1 ? 'The signature is valid.' : `All ${total} signatures are valid.`;
    return `${valid} of ${total} signature${total === 1 ? '' : 's'} valid. Review the details below.`;
  }

  badge(signature: PdfSignatureInfo): string {
    return { valid: 'Valid', modified: 'Changed after signing', invalid: 'Invalid', unsupported: 'Unsupported format' }[signature.status];
  }

  expiredAtSigning(signature: PdfSignatureInfo): boolean {
    const time = signature.signingTime?.getTime();
    return !!time && !!signature.validTo && !!signature.validFrom && (time > signature.validTo.getTime() || time < signature.validFrom.getTime());
  }

  async check(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      if (!this.pdfBytes) throw new SignatureError('Open a PDF first.');
      this.signatures = await this.service.verify(this.pdfBytes);
    } catch (error) {
      this.signatures = [];
      this.error = error instanceof SignatureError ? error.message : `Unable to check signatures: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
