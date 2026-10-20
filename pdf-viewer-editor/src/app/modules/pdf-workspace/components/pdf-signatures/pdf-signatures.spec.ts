import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as forge from 'node-forge';
import { PDFDocument } from 'pdf-lib';
import { PdfSignatureService } from '../../services/pdf-signature.service';
import { PdfSignDialogComponent, SignedPdfResult } from './pdf-sign-dialog.component';
import { PdfSignaturesPanelComponent } from './pdf-signatures-panel.component';

function makeP12(password: string, commonName: string): Uint8Array {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '02';
  cert.validity.notBefore = new Date(Date.now() - 86400000);
  cert.validity.notAfter = new Date(Date.now() + 86400000 * 365);
  cert.setSubject([{ name: 'commonName', value: commonName }]);
  cert.setIssuer([{ name: 'commonName', value: commonName }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const der = forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: '3des' })).getBytes();
  return Uint8Array.from(der, char => char.charCodeAt(0));
}

async function blankPdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index++) pdf.addPage([400, 500]);
  return pdf.save();
}

describe('Digital signature UI', () => {
  let p12: Uint8Array;
  const password = 'Sign-Me-2026';

  beforeAll(() => {
    p12 = makeP12(password, 'Ravi Kumar');
  });

  describe('PdfSignDialogComponent', () => {
    let fixture: ComponentFixture<PdfSignDialogComponent>;
    let component: PdfSignDialogComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [PdfSignDialogComponent] }).compileComponents();
      fixture = TestBed.createComponent(PdfSignDialogComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('fileName', 'contract.pdf');
      fixture.componentRef.setInput('pageCount', 2);
      fixture.componentRef.setInput('currentPage', 2);
      fixture.detectChanges();
    });

    it('explains key safety and validates the certificate, password and page', async () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('never saved, logged or uploaded');
      expect(component.page).toBe(2);

      await component.submit();
      expect(component.error).toBe('Choose your .pfx or .p12 certificate file.');
      await component.loadCertificateFile(new File(['x'], 'photo.png'));
      expect(component.error).toBe('Choose a .pfx or .p12 certificate file.');
      await component.loadCertificateFile(new File([p12 as BlobPart], 'ravi.pfx'));
      expect(component.certificateName).toBe('ravi.pfx');
      await component.submit();
      expect(component.error).toBe('Enter the certificate password.');
      component.password = password;
      component.page = 5;
      await component.submit();
      expect(component.error).toBe('Choose a page between 1 and 2.');
    });

    it('shows a clear message for a wrong password and keeps the file for a retry', async () => {
      component.prepareDocument = () => blankPdf(1);
      await component.loadCertificateFile(new File([p12 as BlobPart], 'ravi.p12'));
      component.password = 'wrong';
      await component.submit();
      expect(component.error).toBe('The certificate password is incorrect.');
      expect(component.password).toBe('');
      expect(component.certificateName).toBe('ravi.p12');
      expect(component.busy).toBeFalse();
    });

    it('signs the prepared document, emits a verifiable copy and clears the secrets', async () => {
      const prepared = jasmine.createSpy('prepare').and.callFake(() => blankPdf(2));
      component.prepareDocument = prepared;
      await component.loadCertificateFile(new File([p12 as BlobPart], 'ravi.pfx'));
      component.password = password;
      component.reason = 'Approved';
      component.location = 'Chennai';
      const results: SignedPdfResult[] = [];
      component.signed.subscribe(result => results.push(result));

      await component.submit();
      expect(component.error).toBe('');
      expect(prepared).toHaveBeenCalled();
      expect(results.length).toBe(1);
      expect(results[0].signerName).toBe('Ravi Kumar');
      expect(results[0].warning).toBe('');
      expect(component.password).toBe('');
      expect(component.certificateName).toBe('');

      const [signature] = await TestBed.inject(PdfSignatureService).verify(results[0].bytes);
      expect(signature).toEqual(jasmine.objectContaining({ status: 'valid', reason: 'Approved', location: 'Chennai', signerName: 'Ravi Kumar' }));
    });

    it('closes with Escape and stops shortcuts reaching the workspace', () => {
      const cancelled: boolean[] = [];
      component.cancel.subscribe(() => cancelled.push(true));
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      const outer = jasmine.createSpy('outer');
      document.addEventListener('keydown', outer);
      fixture.nativeElement.querySelector('input[type=password]').dispatchEvent(event);
      document.removeEventListener('keydown', outer);
      expect(cancelled).toEqual([true]);
      expect(outer).not.toHaveBeenCalled();
    });
  });

  describe('PdfSignaturesPanelComponent', () => {
    async function render(bytes: Uint8Array | null): Promise<ComponentFixture<PdfSignaturesPanelComponent>> {
      await TestBed.configureTestingModule({ imports: [PdfSignaturesPanelComponent] }).compileComponents();
      const fixture = TestBed.createComponent(PdfSignaturesPanelComponent);
      fixture.componentRef.setInput('fileName', 'contract.pdf');
      fixture.componentRef.setInput('pdfBytes', bytes);
      fixture.detectChanges();
      await fixture.whenStable();
      await fixture.componentInstance.check();
      fixture.detectChanges();
      return fixture;
    }

    it('reports that an unsigned PDF has no signatures and states that trust is not checked', async () => {
      const fixture = await render(await blankPdf(1));
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('This PDF has no digital signatures.');
      expect(text).toContain('does not check whether you trust the certificate issuer');
    });

    it('lists a valid signature with signer details, then a changed copy', async () => {
      const service = new PdfSignatureService();
      const certificate = await service.readCertificate(p12, password);
      const signed = await service.sign(await blankPdf(1), certificate, { reason: 'Approved', location: 'Pune' });

      let fixture = await render(signed);
      let text = fixture.nativeElement.textContent as string;
      expect(text).toContain('The signature is valid.');
      expect(text).toContain('Ravi Kumar');
      expect(text).toContain('Valid');
      expect(text).toContain('Pune');
      expect(fixture.nativeElement.querySelector('.item.valid')).not.toBeNull();

      TestBed.resetTestingModule();
      const changed = new Uint8Array(signed.length + 8);
      changed.set(signed);
      changed.set(new TextEncoder().encode('\n%edit\n'), signed.length);
      fixture = await render(changed);
      text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Changed after signing');
      expect(text).toContain('0 of 1 signature valid');
    });
  });
});
