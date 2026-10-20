import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfMetadataDialogComponent } from './pdf-metadata-dialog.component';
import { PdfProtectDialogComponent } from './pdf-protect-dialog.component';

describe('PDF dialogs', () => {
  describe('PdfMetadataDialogComponent', () => {
    let fixture: ComponentFixture<PdfMetadataDialogComponent>;
    let component: PdfMetadataDialogComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [PdfMetadataDialogComponent] }).compileComponents();
      fixture = TestBed.createComponent(PdfMetadataDialogComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('metadata', { title: 'Old', author: 'A', subject: 'S', keywords: 'k' });
      fixture.componentRef.setInput('fileName', 'doc.pdf');
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('edits a copy of the metadata and emits trimmed values on save', () => {
      const saved = jasmine.createSpy('save');
      component.save.subscribe(saved);
      component.draft.title = '  New title ';
      expect(component.metadata.title).toBe('Old');
      (fixture.nativeElement.querySelector('button.primary') as HTMLButtonElement).click();
      expect(saved).toHaveBeenCalledWith({ title: 'New title', author: 'A', subject: 'S', keywords: 'k' });
    });

    it('renders as a modal, focuses the first field and closes with Escape or backdrop', () => {
      const cancel = jasmine.createSpy('cancel');
      component.cancel.subscribe(cancel);
      expect(fixture.nativeElement.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
      expect(document.activeElement?.getAttribute('name')).toBe('metadataTitle');
      fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      (fixture.nativeElement.querySelector('.backdrop') as HTMLElement).click();
      expect(cancel).toHaveBeenCalledTimes(2);
    });
  });

  describe('PdfProtectDialogComponent', () => {
    let fixture: ComponentFixture<PdfProtectDialogComponent>;
    let component: PdfProtectDialogComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [PdfProtectDialogComponent] }).compileComponents();
      fixture = TestBed.createComponent(PdfProtectDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('validates length, confirmation and distinct passwords before emitting', () => {
      const protect = jasmine.createSpy('protect');
      component.protect.subscribe(protect);
      component.submit();
      fixture.detectChanges();
      expect(protect).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.error').textContent).toContain('at least 8');
      component.userPassword = component.userPasswordConfirm = 'same-password';
      component.ownerPassword = component.ownerPasswordConfirm = 'same-password';
      expect(component.validationError).toContain('different');
      component.ownerPassword = 'owner-password';
      expect(component.validationError).toContain('confirmation');
      component.ownerPasswordConfirm = 'owner-password';
      component.permissionPreset = 'forms';
      component.submit();
      expect(protect).toHaveBeenCalledWith({ userPassword: 'same-password', ownerPassword: 'owner-password', permissionPreset: 'forms' });
    });

    it('toggles password visibility, blocks cancel while busy, and clears passwords on destroy', () => {
      const cancel = jasmine.createSpy('cancel');
      component.cancel.subscribe(cancel);
      const input = fixture.nativeElement.querySelector('input[name="userPassword"]') as HTMLInputElement;
      expect(input.type).toBe('password');
      component.showPasswords = true;
      fixture.detectChanges();
      expect(input.type).toBe('text');
      fixture.componentRef.setInput('busy', true);
      component.cancelIfIdle();
      expect(cancel).not.toHaveBeenCalled();
      component.userPassword = 'secret-value';
      fixture.destroy();
      expect(component.userPassword).toBe('');
    });
  });
});
