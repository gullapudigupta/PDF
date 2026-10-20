import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PdfPermissionPreset, PdfProtectionOptions } from '../../services/pdf-security.service';
import { PDF_DIALOG_STYLES } from './pdf-dialog.styles';

export const MIN_PDF_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-pdf-protect-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="backdrop" (click)="cancelIfIdle()"></div>
    <section class="card" role="dialog" aria-modal="true" aria-labelledby="pdf-protection-title" aria-describedby="pdf-protection-desc">
      <header>
        <div>
          <h2 id="pdf-protection-title">Protect PDF</h2>
          <p id="pdf-protection-desc">Save a password-protected copy of {{ fileName || 'this PDF' }}. The open document is not changed.</p>
        </div>
        <button type="button" class="icon-close" aria-label="Close protect PDF" (click)="cancelIfIdle()">&times;</button>
      </header>
      <form (ngSubmit)="submit()" autocomplete="off">
        <div class="body">
          <fieldset>
            <legend>Open password</legend>
            <div class="grid-2">
              <label class="field">User password
                <input #firstField [type]="showPasswords ? 'text' : 'password'" name="userPassword" [(ngModel)]="userPassword"
                  autocomplete="new-password" [attr.aria-invalid]="submitted && !!userError" />
              </label>
              <label class="field">Confirm user password
                <input [type]="showPasswords ? 'text' : 'password'" name="confirmUserPassword" [(ngModel)]="userPasswordConfirm"
                  autocomplete="new-password" [attr.aria-invalid]="submitted && !!userError" />
              </label>
            </div>
            <small class="hint">Readers need this password to open the PDF.</small>
          </fieldset>
          <fieldset>
            <legend>Owner password and permissions</legend>
            <div class="grid-2">
              <label class="field">Owner password
                <input [type]="showPasswords ? 'text' : 'password'" name="ownerPassword" [(ngModel)]="ownerPassword"
                  autocomplete="new-password" [attr.aria-invalid]="submitted && !!ownerError" />
              </label>
              <label class="field">Confirm owner password
                <input [type]="showPasswords ? 'text' : 'password'" name="confirmOwnerPassword" [(ngModel)]="ownerPasswordConfirm"
                  autocomplete="new-password" [attr.aria-invalid]="submitted && !!ownerError" />
              </label>
            </div>
            <label class="field">Reader permissions
              <select name="permissionPreset" [(ngModel)]="permissionPreset">
                <option value="view">View only</option>
                <option value="print">Allow printing</option>
                <option value="forms">Allow form filling</option>
                <option value="unrestricted">Unrestricted</option>
              </select>
            </label>
          </fieldset>
          <label class="check"><input type="checkbox" name="showPasswords" [(ngModel)]="showPasswords" /> Show passwords</label>
          <p class="note">Use at least {{ minLength }} characters and different user/owner passwords. The copy uses AES-256 encryption; passwords cannot be recovered.</p>
          <p *ngIf="submitted && validationError" class="error" role="alert">{{ validationError }}</p>
          <p *ngIf="error && !(submitted && validationError)" class="error" role="alert">{{ error }}</p>
        </div>
        <footer>
          <button type="button" (click)="cancelIfIdle()" [disabled]="busy">Cancel</button>
          <button type="submit" class="primary" [disabled]="busy">{{ busy ? 'Protecting...' : 'Save protected copy' }}</button>
        </footer>
      </form>
    </section>
  `,
  styles: [PDF_DIALOG_STYLES],
})
export class PdfProtectDialogComponent implements AfterViewInit, OnDestroy {
  @Input() fileName = '';
  @Input() busy = false;
  @Input() error: string | null = null;
  @Output() protect = new EventEmitter<PdfProtectionOptions>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild('firstField') firstField?: ElementRef<HTMLInputElement>;
  readonly minLength = MIN_PDF_PASSWORD_LENGTH;
  userPassword = '';
  userPasswordConfirm = '';
  ownerPassword = '';
  ownerPasswordConfirm = '';
  permissionPreset: PdfPermissionPreset = 'view';
  showPasswords = false;
  submitted = false;

  get userError(): string {
    if (this.userPassword.trim().length < this.minLength) return `User password must be at least ${this.minLength} characters.`;
    if (this.userPassword !== this.userPasswordConfirm) return 'User password confirmation does not match.';
    return '';
  }

  get ownerError(): string {
    if (this.ownerPassword.trim().length < this.minLength) return `Owner password must be at least ${this.minLength} characters.`;
    if (this.ownerPassword !== this.ownerPasswordConfirm) return 'Owner password confirmation does not match.';
    if (this.ownerPassword === this.userPassword) return 'Owner password must be different from the user password.';
    return '';
  }

  get validationError(): string {
    return this.userError || this.ownerError;
  }

  ngAfterViewInit(): void {
    this.firstField?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.userPassword = '';
    this.userPasswordConfirm = '';
    this.ownerPassword = '';
    this.ownerPasswordConfirm = '';
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
    this.submitted = true;
    if (this.busy || this.validationError) return;
    this.protect.emit({
      userPassword: this.userPassword,
      ownerPassword: this.ownerPassword,
      permissionPreset: this.permissionPreset,
    });
  }
}
