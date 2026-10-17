import * as pdfjsLib from 'pdfjs-dist';
import { PdfDocumentService, PdfPasswordCancelledError } from './pdf-document.service';

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

    spyOn<any>(service, 'getDocument').and.returnValue({ promise: Promise.resolve(fakeProxy as any) } as any);

    const file = new File([new Uint8Array([1, 2, 3])], 'sample.pdf', { type: 'application/pdf' });
    const loaded = await service.loadFromFile(file);

    expect(loaded.name).toBe('sample.pdf');
    expect(loaded.totalPages).toBe(2);
    expect(service.getCurrentDocument()).toBe(loaded);
  });

  it('requests a password to load an encrypted document and marks it read-only', async () => {
    const fakeProxy = { numPages: 1, getPage: jasmine.createSpy(), destroy: jasmine.createSpy() };
    let passwordHandler: ((updatePassword: (password: string) => void, reason: number) => void) | undefined;
    const loadingTask: any = {
      onPassword: undefined,
      promise: new Promise(resolve => {
        queueMicrotask(() => {
          passwordHandler?.(password => {
            expect(password).toBe('secret-password');
            resolve(fakeProxy);
          }, pdfjsLib.PasswordResponses.NEED_PASSWORD);
        });
      }),
      destroy: jasmine.createSpy().and.resolveTo(),
    };
    Object.defineProperty(loadingTask, 'onPassword', {
      get: () => passwordHandler,
      set: (handler: typeof passwordHandler) => { passwordHandler = handler; },
    });
    spyOn<any>(service, 'getDocument').and.returnValue(loadingTask);
    const passwordProvider = jasmine.createSpy().and.resolveTo('secret-password');

    const loaded = await service.loadFromBytes(new Uint8Array([1]), 'protected.pdf', undefined, passwordProvider);

    expect(passwordProvider).toHaveBeenCalledWith(pdfjsLib.PasswordResponses.NEED_PASSWORD);
    expect(loaded.isEncrypted).toBeTrue();
    expect(Object.prototype.hasOwnProperty.call(loaded, 'password')).toBeFalse();
    service.closeCurrent();
    expect(fakeProxy.destroy).toHaveBeenCalled();
    expect(service.getCurrentDocument()).toBeNull();
  });

  it('cancels password-protected document loading without retrying as an unprotected PDF', async () => {
    let passwordHandler: ((updatePassword: (password: string) => void, reason: number) => void) | undefined;
    let rejectLoadingTask!: (error: Error) => void;
    const loadingTask: any = {
      promise: new Promise((_resolve, reject) => {
        rejectLoadingTask = reject;
        queueMicrotask(() => passwordHandler?.(() => undefined, pdfjsLib.PasswordResponses.NEED_PASSWORD));
      }),
      destroy: jasmine.createSpy().and.callFake(() => {
        rejectLoadingTask(new Error('loading cancelled'));
        return Promise.resolve();
      }),
    };
    Object.defineProperty(loadingTask, 'onPassword', {
      get: () => passwordHandler,
      set: (handler: typeof passwordHandler) => { passwordHandler = handler; },
    });
    const getDocument = spyOn<any>(service, 'getDocument').and.returnValue(loadingTask);

    await expectAsync(service.loadFromBytes(new Uint8Array([1]), 'protected.pdf', undefined, async () => null))
      .toBeRejectedWithError(PdfPasswordCancelledError);

    expect(loadingTask.destroy).toHaveBeenCalled();
    expect(getDocument).toHaveBeenCalledTimes(1);
  });

  it('falls back worker source when first getDocument attempt fails', async () => {
    const fakeProxy = { numPages: 1, getPage: jasmine.createSpy(), destroy: jasmine.createSpy() };
    let callCount = 0;

    spyOn<any>(service, 'getDocument').and.callFake(() => {
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

  it('uses a stable file identity and preserves bytes when replacing the current PDF', async () => {
    const originalProxy = { numPages: 1, destroy: jasmine.createSpy() };
    const updatedProxy = { numPages: 2, destroy: jasmine.createSpy() };
    const getDocument = spyOn<any>(service, 'getDocument').and.returnValues(
      { promise: Promise.resolve(originalProxy as any) },
      { promise: Promise.resolve(updatedProxy as any) }
    );
    const file = new File([new Uint8Array([1, 2, 3])], 'stable.pdf', { lastModified: 123 });
    const initial = await service.loadFromFile(file);
    const updated = await service.replaceCurrentDocumentBytes(new Uint8Array([4, 5]));

    expect(updated.id).toBe(initial.id);
    expect(updated.totalPages).toBe(2);
    expect(Array.from(updated.bytes)).toEqual([4, 5]);
    expect(originalProxy.destroy).toHaveBeenCalled();
    expect(getDocument).toHaveBeenCalledTimes(2);
  });

  it('throws for invalid page range', async () => {
    const fakeProxy = {
      numPages: 1,
      getPage: jasmine.createSpy().and.resolveTo({}),
      destroy: jasmine.createSpy(),
    };

    spyOn<any>(service, 'getDocument').and.returnValue({ promise: Promise.resolve(fakeProxy as any) } as any);
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

    spyOn<any>(service, 'getDocument').and.returnValue({ promise: Promise.resolve(fakeProxy as any) } as any);
    await service.loadFromFile(new File([new Uint8Array([1])], 'text.pdf'));

    const text = await service.extractText(1);
    expect(text).toBe('Hello PDF');
  });
});
