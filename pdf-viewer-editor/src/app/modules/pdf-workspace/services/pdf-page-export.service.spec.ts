import { OfficeExportAdapter, PdfPageExportService } from './pdf-page-export.service';
import { PdfRenderService } from './pdf-render.service';

describe('PdfPageExportService', () => {
  let renderService: jasmine.SpyObj<PdfRenderService>;
  let service: PdfPageExportService;

  beforeEach(() => {
    renderService = jasmine.createSpyObj<PdfRenderService>('PdfRenderService', ['renderPageToCanvas']);
    renderService.renderPageToCanvas.and.callFake(async (_bytes, _page, canvas) => {
      canvas.width = 2;
      canvas.height = 3;
      const context = canvas.getContext('2d');
      context?.fillRect(0, 0, 2, 3);
    });
    service = new PdfPageExportService(renderService);
  });

  it('exports rasterized PNG and JPEG pages with matching MIME types', async () => {
    const bytes = new Uint8Array([1, 2]);
    const png = await service.exportPage(bytes, 2, 'png');
    const jpeg = await service.exportPage(bytes, 2, 'jpeg');

    expect(png.mimeType).toBe('image/png');
    expect(png.extension).toBe('png');
    expect(png.bytes.byteLength).toBeGreaterThan(0);
    expect(jpeg.mimeType).toBe('image/jpeg');
    expect(jpeg.extension).toBe('jpeg');
    expect(jpeg.bytes.byteLength).toBeGreaterThan(0);
    expect(renderService.renderPageToCanvas).toHaveBeenCalledWith(bytes, 2, jasmine.any(HTMLCanvasElement), {
      fitWidth: 2400,
      fitHeight: 3200,
    });
  });

  it('exports a valid SVG page containing the rendered image', async () => {
    const exported = await service.exportPage(new Uint8Array([1]), 1, 'svg');
    const svg = await new Blob([exported.bytes]).text();

    expect(exported.mimeType).toBe('image/svg+xml');
    expect(exported.extension).toBe('svg');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"');
    expect(svg).toContain('href="data:image/png;base64,');
  });

  it('provides Office format extension points without claiming unsupported conversion', async () => {
    await expectAsync(service.exportOffice(new Uint8Array([1]), [1], 'docx'))
      .toBeRejectedWithError('No DOCX export adapter is registered');
    await expectAsync(service.exportOffice(new Uint8Array([1]), [], 'xlsx'))
      .toBeRejectedWithError('Select one or more valid pages for Office export');

    const adapter: OfficeExportAdapter = {
      format: 'docx',
      exportPages: jasmine.createSpy().and.resolveTo(new Uint8Array([7]).buffer),
    };
    service.registerOfficeAdapter(adapter);
    const result = await service.exportOffice(new Uint8Array([1]), [1, 1, 2], 'docx');

    expect(adapter.exportPages).toHaveBeenCalledWith(new Uint8Array([1]), [1, 2]);
    expect(new Uint8Array(result)).toEqual(new Uint8Array([7]));
  });

  it('rejects invalid page numbers', async () => {
    await expectAsync(service.exportPage(new Uint8Array([1]), 0, 'png'))
      .toBeRejectedWithError('Invalid page number: 0');
  });
});
