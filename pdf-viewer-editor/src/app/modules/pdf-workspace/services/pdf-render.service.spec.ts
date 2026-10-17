import { PdfRenderService } from './pdf-render.service';

describe('PdfRenderService', () => {
  let service: PdfRenderService;

  beforeEach(() => {
    service = new PdfRenderService();
  });

  it('renders page with computed fit scale and zoom', async () => {
    const renderPromise = Promise.resolve();
    const renderSpy = jasmine.createSpy().and.returnValue({ promise: renderPromise });

    const page = {
      getViewport: jasmine
        .createSpy()
        .and.callFake(({ scale, rotation }: { scale: number; rotation: number }) => ({
          width: 200 * scale,
          height: 400 * scale,
          rotation,
        })),
      render: renderSpy,
      getTextContent: jasmine.createSpy(),
    };

    const doc = {
      getPage: jasmine.createSpy().and.resolveTo(page),
    };

    const getDocumentSpy = spyOn<any>(service, 'getDocument').and.returnValue({
      promise: Promise.resolve(doc as any),
    } as any);

    const canvas = document.createElement('canvas');
    const context = {
      clearRect: jasmine.createSpy(),
    } as any;
    spyOn(canvas, 'getContext').and.returnValue(context);

    const bytes = new Uint8Array([1, 2, 3]);
    await service.renderPageToCanvas(bytes, 1, canvas, {
      fitWidth: 300,
      fitHeight: 300,
      zoom: 2,
      rotation: 90,
    });

    const pdfJsBytes = (getDocumentSpy.calls.mostRecent().args[0] as { data: Uint8Array }).data;
    expect(pdfJsBytes).not.toBe(bytes);
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
    expect(doc.getPage).toHaveBeenCalledWith(1);
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(600);
    expect(context.clearRect).toHaveBeenCalled();
    expect(renderSpy).toHaveBeenCalled();
  });

  it('throws when 2d context is unavailable', async () => {
    const page = {
      getViewport: jasmine.createSpy().and.returnValue({ width: 100, height: 100 }),
      render: jasmine.createSpy().and.returnValue({ promise: Promise.resolve() }),
    };

    const doc = {
      getPage: jasmine.createSpy().and.resolveTo(page),
    };

    spyOn<any>(service, 'getDocument').and.returnValue({ promise: Promise.resolve(doc as any) } as any);

    const canvas = document.createElement('canvas');
    spyOn(canvas, 'getContext').and.returnValue(null);

    await expectAsync(
      service.renderPageToCanvas(new Uint8Array([1]), 1, canvas)
    ).toBeRejectedWithError('Canvas 2D context unavailable');
  });

  it('renders an already-authorized PDF document proxy without reopening its bytes', async () => {
    const page = {
      getViewport: jasmine.createSpy().and.callFake(({ scale }: { scale: number }) => ({
        width: 100 * scale,
        height: 140 * scale,
      })),
      render: jasmine.createSpy().and.returnValue({ promise: Promise.resolve() }),
    };
    const proxy = { getPage: jasmine.createSpy().and.resolveTo(page) };
    const getDocument = spyOn<any>(service, 'getDocument');
    const canvas = document.createElement('canvas');
    spyOn(canvas, 'getContext').and.returnValue({ clearRect: jasmine.createSpy() } as any);

    await service.renderLoadedPageToCanvas(proxy, 1, canvas);

    expect(proxy.getPage).toHaveBeenCalledWith(1);
    expect(getDocument).not.toHaveBeenCalled();
    expect(page.render).toHaveBeenCalled();
  });

  it('extracts text from page', async () => {
    const page = {
      getTextContent: jasmine.createSpy().and.resolveTo({ items: [{ str: 'A' }, { str: 'B' }] }),
      getViewport: jasmine.createSpy(),
      render: jasmine.createSpy(),
    };

    const doc = {
      getPage: jasmine.createSpy().and.resolveTo(page),
    };

    const bytes = new Uint8Array([1]);
    const getDocument = spyOn<any>(service, 'getDocument').and.returnValue({
      promise: Promise.resolve(doc as any),
    } as any);

    const text = await service.extractText(bytes, 1);
    const pdfJsBytes = (getDocument.calls.mostRecent().args[0] as { data: Uint8Array }).data;
    expect(pdfJsBytes).not.toBe(bytes);
    expect(Array.from(bytes)).toEqual([1]);
    expect(text).toBe('A B');
  });
});
