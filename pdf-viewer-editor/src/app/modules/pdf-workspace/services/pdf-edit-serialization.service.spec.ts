import { TestBed } from '@angular/core/testing';
import { decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';

import { Annotation } from '../models/annotation.model';
import { PdfEditableOverlay, PdfEditSerializationService } from './pdf-edit-serialization.service';

describe('PdfEditSerializationService', () => {
  let service: PdfEditSerializationService;

  beforeEach(() => {
    service = TestBed.inject(PdfEditSerializationService);
  });

  async function createPdf(): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    document.addPage([400, 500]);
    document.addPage([400, 500]);
    return new Uint8Array(await document.save());
  }

  function annotation(page: number, content: string): Annotation {
    return {
      id: `annotation-${page}`,
      documentId: 'doc-1',
      page,
      type: 'comment',
      rect: { x: 20, y: 30, width: 120, height: 40 },
      style: { color: '#ffcc00', opacity: 0.7 },
      content,
      createdAt: 1,
      updatedAt: 1,
    };
  }

  it('flattens text overlays and page annotations into the PDF output', async () => {
    const bytes = await createPdf();
    const overlays: PdfEditableOverlay[] = [
      { type: 'text', x: 40, y: 50, width: 180, height: 60, label: 'Text Box', text: 'Edited text' },
      { type: 'link', x: 60, y: 120, width: 160, height: 40, label: 'Link', text: 'Open site', url: 'https://example.com' },
      { type: 'link', x: 240, y: 120, width: 120, height: 40, label: 'Link', text: 'Go to page 2', pageNumber: 2 },
    ];
    const updated = await service.flattenEdits(bytes, 1, 400, 500, overlays, [annotation(2, 'A note')]);
    const document = await PDFDocument.load(updated);

    expect(document.getPageCount()).toBe(2);
    expect(document.getPage(0).node.Contents()).toBeDefined();
    expect(document.getPage(0).node.Annots()?.size()).toBe(2);
    expect(document.getPage(1).node.Contents()).toBeDefined();
  });

  it('exports styled text at the exact point size with Helvetica regular or bold', async () => {
    const bytes = await createPdf();
    const overlays: PdfEditableOverlay[] = [
      { type: 'text', x: 40, y: 50, width: 300, height: 90, label: 'Text Box', text: 'Heading', fontSize: 24, bold: true },
      { type: 'text', x: 40, y: 200, width: 300, height: 90, label: 'Text Box', text: 'Body', fontSize: 12, bold: false },
      { type: 'text', x: 40, y: 320, width: 300, height: 90, label: 'Text Box', text: 'Clamped', fontSize: 500 },
    ];
    // Viewport is 2x the page so points must not be scaled by the preview zoom.
    const updated = await service.flattenEdits(bytes, 1, 800, 1000, overlays, []);
    const document = await PDFDocument.load(updated);
    const page = document.getPage(0);
    const fonts = page.node.Resources()!.lookup(PDFName.of('Font'), PDFDict);
    const baseFonts = fonts.values().map(ref => (document.context.lookup(ref, PDFDict).get(PDFName.of('BaseFont')) as PDFName).asString());
    expect([...new Set(baseFonts)]).toEqual(jasmine.arrayWithExactContents(['/Helvetica', '/Helvetica-Bold']));

    const contents = page.node.Contents()!;
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref => document.context.lookup(ref)) : [contents];
    const operators = streams
      .map(stream => new TextDecoder().decode(decodePDFRawStream(stream as PDFRawStream).decode()))
      .join('\n');
    expect(operators).toMatch(/ 24 Tf/);
    expect(operators).toMatch(/ 12 Tf/);
    expect(operators).toMatch(/ 72 Tf/);
    expect(operators).not.toMatch(/ 48 Tf/);
  });

  it('returns an unchanged copy when there are no edits and rejects invalid inputs', async () => {
    const bytes = await createPdf();
    const unchanged = await service.flattenEdits(bytes, 1, 0, 0, [], []);
    expect(unchanged).not.toBe(bytes);
    expect(Array.from(unchanged)).toEqual(Array.from(bytes));

    await expectAsync(service.flattenEdits(bytes, 0, 400, 500, [], [annotation(1, 'A note')]))
      .toBeRejectedWithError('Invalid page number: 0');
    await expectAsync(service.flattenEdits(bytes, 1, 0, 500, [{ type: 'image', x: 0, y: 0, width: 1, height: 1, label: 'Image', imageSrc: '' }], []))
      .toBeRejectedWithError('Page viewport dimensions are required to save edits');
    await expectAsync(service.flattenEdits(bytes, 1, 400, 500, [
      { type: 'link', x: 0, y: 0, width: 10, height: 10, label: 'Link', url: 'javascript:alert(1)' },
    ], [])).toBeRejectedWithError('PDF links must use HTTP or HTTPS');
    await expectAsync(service.flattenEdits(bytes, 1, 400, 500, [
      { type: 'link', x: 0, y: 0, width: 10, height: 10, label: 'Link', pageNumber: 3 },
    ], [])).toBeRejectedWithError('Invalid internal link page: 3');
    await expectAsync(service.flattenEdits(bytes, 1, 400, 500, [
      { type: 'link', x: 0, y: 0, width: 10, height: 10, label: 'Link' },
    ], [])).toBeRejectedWithError('PDF link is missing a valid destination');
  });
});
