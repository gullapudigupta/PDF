import * as pdfjsLib from 'pdfjs-dist';
import { PdfDocumentService } from './pdf-document.service';

describe('PdfDocumentService', () => {
  let service: PdfDocumentService;

  beforeEach(() => {
    service = new PdfDocumentService();
  });

  it('loads document and stores current document', async () => {
    const fakeProxy = {
      numPages: 2,
      getPage: jasmine.createSpy(),
      destroy: jasmine.createSpy(),
    };

    spyOn(pdfjsLib, 'getDocument').and.returnValue({
      promise: Promise.resolve(fakeProxy as any),
    } as any);

    const file = new File([new Uint8Array([1, 2, 3])], 'sample.pdf', { type: 'application/pdf' });
    const loaded = await service.loadFromFile(file);

    expect(loaded.name).toBe('sample.pdf');
    expect(loaded.totalPages).toBe(2);
    expect(service.getCurrentDocument()).toBe(loaded);
  });

  it('falls back worker source when first getDocument attempt fails', async () => {
    const fakeProxy = { numPages: 1, getPage: jasmine.createSpy(), destroy: jasmine.createSpy() };
    let callCount = 0;

    spyOn(pdfjsLib, 'getDocument').and.callFake(() => {
      callCount += 1;
      if (callCount === 1) {
        return { promise: Promise.reject(new Error('worker fail')) } as any;
      }
      return { promise: Promise.resolve(fakeProxy as any) } as any;
    });

    const file = new File([new Uint8Array([9])], 'fallback.pdf', { type: 'application/pdf' });
    await service.loadFromFile(file);

    expect(callCount).toBe(2);
    expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('assets/pdf.worker.min.js');
  });

  it('throws for invalid page range', async () => {
    const fakeProxy = {
      numPages: 1,
      getPage: jasmine.createSpy().and.resolveTo({}),
      destroy: jasmine.createSpy(),
    };

    spyOn(pdfjsLib, 'getDocument').and.returnValue({ promise: Promise.resolve(fakeProxy as any) } as any);
    await service.loadFromFile(new File([new Uint8Array([1])], 'single.pdf'));

    await expectAsync(service.getPage(2)).toBeRejectedWithError('Invalid page number: 2');
  });

  it('extracts text from a page', async () => {
    const page = {
      getTextContent: jasmine.createSpy().and.resolveTo({ items: [{ str: 'Hello' }, { str: 'PDF' }] }),
    };
    const fakeProxy = {
      numPages: 1,
      getPage: jasmine.createSpy().and.resolveTo(page),
      destroy: jasmine.createSpy(),
    };

    spyOn(pdfjsLib, 'getDocument').and.returnValue({ promise: Promise.resolve(fakeProxy as any) } as any);
    await service.loadFromFile(new File([new Uint8Array([1])], 'text.pdf'));

    const text = await service.extractText(1);
    expect(text).toBe('Hello PDF');
  });
});
