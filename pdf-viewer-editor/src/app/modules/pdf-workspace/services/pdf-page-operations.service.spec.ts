import { TestBed } from '@angular/core/testing';
import { degrees, PDFDocument } from 'pdf-lib';

import { PdfPageOperationsService } from './pdf-page-operations.service';

describe('PdfPageOperationsService', () => {
  let service: PdfPageOperationsService;

  beforeEach(() => {
    service = TestBed.inject(PdfPageOperationsService);
  });

  async function createPdf(pageSizes: [number, number][]): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    pageSizes.forEach(size => document.addPage(size));
    return new Uint8Array(await document.save());
  }

  async function pageWidths(bytes: Uint8Array): Promise<number[]> {
    const document = await PDFDocument.load(bytes);
    return document.getPages().map(page => page.getWidth());
  }

  it('deletes the requested page and rejects deleting the final page', async () => {
    const bytes = await createPdf([[100, 100], [200, 200]]);
    const updated = await service.deletePage(bytes, 1);

    expect(await pageWidths(updated)).toEqual([200]);
    await expectAsync(service.deletePage(updated, 1)).toBeRejectedWithError('A PDF must contain at least one page');
  });

  it('reorders pages while preserving their content and page dimensions', async () => {
    const bytes = await createPdf([[100, 100], [200, 200], [300, 300]]);
    const updated = await service.reorderPage(bytes, 1, 3);

    expect(await pageWidths(updated)).toEqual([200, 300, 100]);
  });

  it('rotates selected pages and crops using top-left viewport coordinates', async () => {
    const bytes = await createPdf([[400, 500], [400, 500]]);
    const rotated = await service.rotatePages(bytes, [1, 2], 90);
    const rotatedDocument = await PDFDocument.load(rotated);
    expect(rotatedDocument.getPages().map(page => page.getRotation().angle)).toEqual([90, 90]);

    const cropped = await service.cropPage(bytes, 1, 400, 500, { x: 40, y: 50, width: 200, height: 300 });
    const croppedDocument = await PDFDocument.load(cropped);
    expect(croppedDocument.getPage(0).getCropBox()).toEqual({ x: 40, y: 150, width: 200, height: 300 });
  });

  it('maps crop rectangles correctly on rotated pages', async () => {
    const source = await createPdf([[400, 500]]);
    const document = await PDFDocument.load(source);
    document.getPage(0).setRotation(degrees(90));
    const rotatedBytes = new Uint8Array(await document.save());
    const cropped = await service.cropPage(rotatedBytes, 1, 500, 400, { x: 10, y: 20, width: 100, height: 150 });
    const result = await PDFDocument.load(cropped);

    expect(result.getPage(0).getCropBox()).toEqual({ x: 20, y: 10, width: 150, height: 100 });
  });

  it('inserts all source pages at the requested position', async () => {
    const target = await createPdf([[100, 100], [300, 300]]);
    const source = await createPdf([[200, 200], [400, 400]]);
    const updated = await service.insertPages(target, source, 1);

    expect(await pageWidths(updated)).toEqual([100, 200, 400, 300]);
  });

  it('extracts selected page ranges in the requested order', async () => {
    const bytes = await createPdf([[100, 100], [200, 200], [300, 300], [400, 400]]);
    const extracted = await service.extractPages(bytes, '4, 1-2');

    expect(await pageWidths(extracted)).toEqual([400, 100, 200]);
  });

  it('merges pages from multiple documents in input order', async () => {
    const first = await createPdf([[100, 100], [200, 200]]);
    const second = await createPdf([[300, 300]]);
    const merged = await service.mergePdfs([first, second]);

    expect(await pageWidths(merged)).toEqual([100, 200, 300]);
  });

  it('splits selected ranges into separate PDFs', async () => {
    const bytes = await createPdf([[100, 100], [200, 200], [300, 300], [400, 400]]);
    const parts = await service.splitByPageRanges(bytes, '1-2, 4');

    expect(parts.length).toBe(2);
    expect(await pageWidths(parts[0])).toEqual([100, 200]);
    expect(await pageWidths(parts[1])).toEqual([400]);
  });

  it('rejects out-of-range page numbers and insertion indexes', async () => {
    const bytes = await createPdf([[100, 100]]);
    const multiPageBytes = await createPdf([[100, 100], [200, 200]]);

    await expectAsync(service.deletePage(bytes, 0)).toBeRejectedWithError('Invalid page number: 0');
    await expectAsync(service.reorderPage(bytes, 1, 2)).toBeRejectedWithError('Invalid page number: 2');
    await expectAsync(service.insertPages(bytes, bytes, 2)).toBeRejectedWithError('Invalid insertion index: 2');
    await expectAsync(service.extractPages(multiPageBytes, '2-1')).toBeRejectedWithError('Invalid descending page range: 2-1');
    await expectAsync(service.splitByPageRanges(bytes, '1,,1')).toBeRejectedWithError('Invalid page range: empty range');
    await expectAsync(service.mergePdfs([bytes])).toBeRejectedWithError('Select at least two PDFs to merge');
    await expectAsync(service.rotatePages(bytes, [1], 45)).toBeRejectedWithError('Invalid page rotation: 45');
    await expectAsync(service.cropPage(bytes, 1, 100, 100, { x: 90, y: 90, width: 20, height: 20 }))
      .toBeRejectedWithError('Crop rectangle must be positive and within the page viewport');
  });
});
