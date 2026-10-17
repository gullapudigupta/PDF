import { PDFDocument } from '@cantoo/pdf-lib';
import { PermissionFlag } from 'pdfjs-dist';
import { PdfProtectionOptions, PdfSecurityService } from './pdf-security.service';

describe('PdfSecurityService', () => {
  let service: PdfSecurityService;

  async function createPdf(): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    document.addPage([400, 500]);
    document.setTitle('Original title');
    document.setAuthor('Original author');
    document.setSubject('Original subject');
    document.setKeywords(['original', 'pdf']);
    return new Uint8Array(await document.save());
  }

  beforeEach(() => {
    service = new PdfSecurityService();
  });

  it('reads and updates document metadata and normalized keywords', async () => {
    const bytes = await createPdf();
    const updated = await service.updateMetadata(bytes, {
      title: 'Updated title',
      author: 'Updated author',
      subject: 'Updated subject',
      keywords: ' forms, protected PDF ,,',
    });

    expect(await service.getMetadata(updated)).toEqual({
      title: 'Updated title',
      author: 'Updated author',
      subject: 'Updated subject',
      keywords: 'forms, protected PDF',
    });
  });

  it('protects a PDF with distinct user and owner passwords and the selected permissions', async () => {
    const bytes = await createPdf();
    const protectedBytes = await service.protect(bytes, {
      userPassword: 'reader-pass-1',
      ownerPassword: 'owner-pass-1',
      permissionPreset: 'forms',
    });

    await expectAsync(PDFDocument.load(protectedBytes)).toBeRejected();

    const readerDocument = await PDFDocument.load(protectedBytes, { password: 'reader-pass-1' });
    const ownerDocument = await PDFDocument.load(protectedBytes, { password: 'owner-pass-1' });
    expect(readerDocument.getPageCount()).toBe(1);
    expect(ownerDocument.getPageCount()).toBe(1);
    await expectAsync(PDFDocument.load(protectedBytes, { password: 'wrong-password' })).toBeRejected();
  });

  it('encodes each permission preset in the encrypted PDF permissions dictionary', async () => {
    const bytes = await createPdf();
    const expected: Array<{ preset: PdfProtectionOptions['permissionPreset']; allowed: number[]; denied: number[] }> = [
      {
        preset: 'view',
        allowed: [PermissionFlag.COPY_FOR_ACCESSIBILITY],
        denied: [PermissionFlag.PRINT, PermissionFlag.COPY, PermissionFlag.MODIFY_CONTENTS],
      },
      {
        preset: 'print',
        allowed: [PermissionFlag.PRINT, PermissionFlag.PRINT_HIGH_QUALITY],
        denied: [PermissionFlag.COPY, PermissionFlag.MODIFY_CONTENTS, PermissionFlag.FILL_INTERACTIVE_FORMS],
      },
      {
        preset: 'forms',
        allowed: [PermissionFlag.PRINT, PermissionFlag.FILL_INTERACTIVE_FORMS],
        denied: [PermissionFlag.PRINT_HIGH_QUALITY, PermissionFlag.COPY, PermissionFlag.MODIFY_CONTENTS],
      },
      {
        preset: 'unrestricted',
        allowed: [
          PermissionFlag.PRINT,
          PermissionFlag.PRINT_HIGH_QUALITY,
          PermissionFlag.COPY,
          PermissionFlag.MODIFY_CONTENTS,
          PermissionFlag.MODIFY_ANNOTATIONS,
          PermissionFlag.FILL_INTERACTIVE_FORMS,
          PermissionFlag.ASSEMBLE,
        ],
        denied: [],
      },
    ];

    for (const testCase of expected) {
      const protectedBytes = await service.protect(bytes, {
        userPassword: 'reader-pass-1',
        ownerPassword: 'owner-pass-1',
        permissionPreset: testCase.preset,
      });
      const text = new TextDecoder('latin1').decode(protectedBytes);
      const permissionValue = Number(/\/P\s+(-?\d+)/.exec(text)?.[1]);
      expect(Number.isFinite(permissionValue)).withContext(testCase.preset).toBeTrue();
      for (const permission of testCase.allowed) {
        expect(permissionValue & permission).withContext(testCase.preset).not.toBe(0);
      }
      for (const permission of testCase.denied) {
        expect(permissionValue & permission).withContext(testCase.preset).toBe(0);
      }
    }
  });

  it('rejects weak or identical passwords before encrypting', async () => {
    const bytes = await createPdf();
    const base: PdfProtectionOptions = {
      userPassword: 'reader-pass-1',
      ownerPassword: 'owner-pass-1',
      permissionPreset: 'view',
    };

    await expectAsync(service.protect(bytes, { ...base, userPassword: 'short' }))
      .toBeRejectedWithError('User and owner passwords must each be at least 8 characters');
    await expectAsync(service.protect(bytes, { ...base, ownerPassword: base.userPassword }))
      .toBeRejectedWithError('User and owner passwords must be different');
  });
});
