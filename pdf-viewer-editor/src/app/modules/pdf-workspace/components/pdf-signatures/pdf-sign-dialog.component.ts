import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PdfSignatureService, SignaturePosition, SignatureError, SigningCertificate } from '../../services/pdf-signature.service';
import { PDF_DIALOG_STYLES } from '../pdf-dialogs/pdf-dialog.styles';

export const MAX_CERTIFICATE_BYTES = 1024 * 1024;

export interface SignedPdfResult {
  bytes: Uint8Array;
  signerName: string;
  warning: string;
}

@Component({
  selector: 'app-pdf-sign-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="backdrop" (click)="cancelIfIdle()"></div>
    <section class="card" role="dialog" aria-modal="true" aria-labelledby="pdf-sign-title" aria-describedby="pdf-sign-desc">
      <header>
        <div>
          <h2 id="pdf-sign-title">Digitally sign</h2>
          <p id="pdf-sign-desc">Sign {{ fileName || 'this PDF' }} with your certificate. A signed copy is saved; the open document is not changed.</p>
        </div>
        <button type="button" class="icon-close" aria-label="Close digital signature" (click)="cancelIfIdle()">&times;</button>
      </header>
      <form (ngSubmit)="submit()" autocomplete="off">
        <div class="body">
          <fieldset [disabled]="busy">
            <legend>Certificate</legend>
            <div class="file-row">
              <button #firstField type="button" (click)="certificateInput.click()">{{ certificateName ? 'Change certificate' : 'Choose .pfx / .p12 file' }}</button>
              <span class="file-name" [class.empty]="!certificateName">{{ certificateName || 'No certificate chosen' }}</span>
              <input #certificateInput type="file" hidden accept=".pfx,.p12,application/x-pkcs12" (change)="onCertificateSelected($event)" />
            </div>
            <label class="field">Certificate password
              <input type="password" name="certificatePassword" [(ngModel)]="password" autocomplete="off" />
            </label>
            <small class="hint">Your certificate and password stay in memory for this signature only. They are never saved, logged or uploaded.</small>
          </fieldset>
          <fieldset [disabled]="busy">
            <legend>Signature details</legend>
            <div class="grid-2">
              <label class="field">Signer name
                <input name="signerName" [(ngModel)]="signerName" placeholder="From the certificate" maxlength="120" />
              </label>
              <label class="field">Location
                <input name="location" [(ngModel)]="location" placeholder="e.g. Hyderabad, India" maxlength="120" />
              </label>
            </div>
            <label class="field">Reason
              <input name="reason" [(ngModel)]="reason" maxlength="160" />
            </label>
          </fieldset>
          <fieldset [disabled]="busy">
            <legend>Appearance</legend>
            <label class="check"><input type="checkbox" name="visible" [(ngModel)]="visible" /> Show a visible signature box</label>
            <div class="grid-2" *ngIf="visible">
              <label class="field">Page
                <input type="number" name="page" [(ngModel)]="page" [min]="1" [max]="pageCount" />
              </label>
              <label class="field">Position
                <select name="position" [(ngModel)]="position">
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="top-right">Top right</option>
                  <option value="top-left">Top left</option>
                </select>
              </label>
            </div>
          </fieldset>
          <p class="note">Pending edits are applied first. Any change made to the signed copy afterwards will show the signature as "Changed after signing".</p>
          <p *ngIf="stage" class="stage" role="status">{{ stage }}</p>
          <p *ngIf="error" class="error" role="alert">{{ error }}</p>
        </div>
        <footer>
          <button type="button" (click)="cancelIfIdle()" [disabled]="busy">Cancel</button>
          <button type="submit" class="primary" [disabled]="busy">{{ busy ? 'Signing...' : 'Sign and save copy' }}</button>
        </footer>
      </form>
    </section>
  `,
  styles: [PDF_DIALOG_STYLES, `
    .file-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 10px; }
    .file-name { font-weight: 600; overflow-wrap: anywhere; }
    .file-name.empty { color: #5b6b73; font-weight: 400; }
    .stage { margin: 8px 0 0; color: #0b5d57; font-weight: 600; }
  `],
})
export class PdfSignDialogComponent implements AfterViewInit, OnDestroy {
  @Input() fileName = '';
  @Input() pageCount = 1;
  @Input() set currentPage(value: number) {
    this.page = value || 1;
  }
  /** Returns the PDF bytes with pending edits applied. */
  @Input() prepareDocument: (() => Promise<Uint8Array>) | null = null;
  @Output() signed = new EventEmitter<SignedPdfResult>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild('firstField') firstField?: ElementRef<HTMLButtonElement>;

  certificateName = '';
  password = '';
  signerName = '';
  reason = 'I approve this document';
  location = '';
  visible = true;
  page = 1;
  position: SignaturePosition = 'bottom-right';
  busy = false;
  stage = '';
  error = '';
  private certificateBytes: Uint8Array | null = null;

  constructor(private signatures: PdfSignatureService, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.firstField?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.clearSecrets();
  }

  /** Keeps workspace shortcuts from acting on the PDF behind this dialog. */
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Escape') this.cancelIfIdle();
  }

  cancelIfIdle(): void {
    if (this.busy) return;
    this.clearSecrets();
    this.cancel.emit();
  }

  async onCertificateSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.loadCertificateFile(file);
  }

  async loadCertificateFile(file: File): Promise<void> {
    this.error = '';
    if (!/\.(pfx|p12)$/i.test(file.name)) {
      this.error = 'Choose a .pfx or .p12 certificate file.';
    } else if (file.size > MAX_CERTIFICATE_BYTES) {
      this.error = 'This certificate file is larger than 1 MB. Choose your personal signing certificate.';
    } else {
      this.certificateBytes?.fill(0);
      this.certificateBytes = new Uint8Array(await file.arrayBuffer());
      this.certificateName = file.name;
    }
    this.cdr.markForCheck();
  }

  async submit(): Promise<void> {
    if (this.busy) return;
    this.error = '';
    if (!this.certificateBytes) {
      this.error = 'Choose your .pfx or .p12 certificate file.';
      return;
    }
    if (!this.password) {
      this.error = 'Enter the certificate password.';
      return;
    }
    const page = Math.trunc(Number(this.page));
    if (this.visible && (!Number.isFinite(page) || page < 1 || page > this.pageCount)) {
      this.error = `Choose a page between 1 and ${this.pageCount}.`;
      return;
    }
    if (!this.prepareDocument) {
      this.error = 'Open a PDF first.';
      return;
    }

    this.busy = true;
    let certificate: SigningCertificate | null = null;
    let succeeded = false;
    try {
      this.setStage('Checking the certificate...');
      certificate = await this.signatures.readCertificate(this.certificateBytes, this.password);
      if (certificate.notYetValid) throw new SignatureError(`This certificate is not valid until ${certificate.validFrom.toLocaleDateString()}.`);
      const warning = certificate.expired
        ? `The certificate expired on ${certificate.validTo.toLocaleDateString()}, so readers will see that it was signed with an expired certificate.`
        : '';
      this.setStage('Applying your edits...');
      const documentBytes = await this.prepareDocument();
      this.setStage('Signing the PDF...');
      const signerName = this.signerName.trim() || certificate.subjectName;
      const bytes = await this.signatures.sign(documentBytes, certificate, {
        signerName,
        reason: this.reason.trim(),
        location: this.location.trim(),
        visible: this.visible ? { page, position: this.position } : null,
      });
      succeeded = true;
      this.signed.emit({ bytes, signerName, warning });
    } catch (error) {
      this.error = error instanceof SignatureError
        ? error.message
        : `Unable to sign the PDF: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      certificate = null;
      this.password = '';
      if (succeeded) this.clearSecrets();
      this.busy = false;
      this.stage = '';
      this.cdr.markForCheck();
    }
  }

  private setStage(stage: string): void {
    this.stage = stage;
    this.cdr.markForCheck();
  }

  private clearSecrets(): void {
    this.password = '';
    this.certificateBytes?.fill(0);
    this.certificateBytes = null;
    this.certificateName = '';
  }
}
