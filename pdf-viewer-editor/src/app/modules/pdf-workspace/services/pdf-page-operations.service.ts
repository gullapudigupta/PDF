import { Injectable } from '@angular/core';
import { degrees, PDFDocument, PDFPage } from 'pdf-lib';

@Injectable({ providedIn: 'root' })
export class PdfPageOperationsService {
  async deletePage(bytes: Uint8Array, pageNumber: number): Promise<Uint8Array> {
    const document = await PDFDocument.load(bytes);
    this.validatePageNumber(pageNumber, document.getPageCount());
    if (document.getPageCount() === 1) throw new Error('A PDF must contain at least one page');
    document.removePage(pageNumber - 1);
    return new Uint8Array(await document.save());
  }

  async reorderPage(bytes: Uint8Array, fromPage: number, toPage: number): Promise<Uint8Array> {
    const document = await PDFDocument.load(bytes);
    const pageCount = document.getPageCount();
    this.validatePageNumber(fromPage, pageCount);
    this.validatePageNumber(toPage, pageCount);
    if (fromPage === toPage) return bytes.slice();

    const page: PDFPage = document.getPage(fromPage - 1);
    document.removePage(fromPage - 1);
    document.insertPage(toPage - 1, page);
    return new Uint8Array(await document.save());
  }

  async rotatePages(bytes: Uint8Array, pageNumbers: number[], rotation: number): Promise<Uint8Array> {
    if (![90, 180, 270].includes(rotation)) throw new Error(`Invalid page rotation: ${rotation}`);
    if (!pageNumbers.length) throw new Error('Select at least one page to rotate');
    const document = await PDFDocument.load(bytes);
    for (const pageNumber of new Set(pageNumbers)) {
      this.validatePageNumber(pageNumber, document.getPageCount());
      const page = document.getPage(pageNumber - 1);
      page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
    }
    return new Uint8Array(await document.save());
  }

  async cropPage(
    bytes: Uint8Array,
    pageNumber: number,
    viewportWidth: number,
    viewportHeight: number,
    rect: { x: number; y: number; width: number; height: number }
  ): Promise<Uint8Array> {
    const document = await PDFDocument.load(bytes);
    this.validatePageNumber(pageNumber, document.getPageCount());
    if (![viewportWidth, viewportHeight, rect.x, rect.y, rect.width, rect.height]
      .every(Number.isFinite) || viewportWidth <= 0 || viewportHeight <= 0 ||
      rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0 ||
      rect.x + rect.width > viewportWidth || rect.y + rect.height > viewportHeight) {
      throw new Error('Crop rectangle must be positive and within the page viewport');
    }

    const page = document.getPage(pageNumber - 1);
    const cropBox = page.getCropBox();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    let x: number;
    let y: number;
    let width: number;
    let height: number;
    if (rotation === 0) {
      const scaleX = cropBox.width / viewportWidth;
      const scaleY = cropBox.height / viewportHeight;
      x = cropBox.x + rect.x * scaleX;
      y = cropBox.y + cropBox.height - (rect.y + rect.height) * scaleY;
      width = rect.width * scaleX;
      height = rect.height * scaleY;
    } else if (rotation === 90) {
      const scaleX = cropBox.height / viewportWidth;
      const scaleY = cropBox.width / viewportHeight;
      x = cropBox.x + rect.y * scaleY;
      y = cropBox.y + rect.x * scaleX;
      width = rect.height * scaleY;
      height = rect.width * scaleX;
    } else if (rotation === 180) {
      const scaleX = cropBox.width / viewportWidth;
      const scaleY = cropBox.height / viewportHeight;
      x = cropBox.x + cropBox.width - (rect.x + rect.width) * scaleX;
      y = cropBox.y + rect.y * scaleY;
      width = rect.width * scaleX;
      height = rect.height * scaleY;
    } else if (rotation === 270) {
      const scaleX = cropBox.height / viewportWidth;
      const scaleY = cropBox.width / viewportHeight;
      x = cropBox.x + cropBox.width - (rect.y + rect.height) * scaleY;
      y = cropBox.y + cropBox.height - (rect.x + rect.width) * scaleX;
      width = rect.height * scaleY;
      height = rect.width * scaleX;
    } else {
      throw new Error(`Unsupported page rotation for cropping: ${rotation}`);
    }
    page.setCropBox(x, y, width, height);
    return new Uint8Array(await document.save());
  }

  async insertPages(
    targetBytes: Uint8Array,
    sourceBytes: Uint8Array,
    insertAt: number
  ): Promise<Uint8Array> {
    const target = await PDFDocument.load(targetBytes);
    const source = await PDFDocument.load(sourceBytes);
    if (!Number.isInteger(insertAt) || insertAt < 0 || insertAt > target.getPageCount()) {
      throw new Error(`Invalid insertion index: ${insertAt}`);
    }

    const pages = await target.copyPages(source, source.getPageIndices());
    pages.forEach((page, offset) => target.insertPage(insertAt + offset, page));
    return new Uint8Array(await target.save());
  }

  async extractPages(bytes: Uint8Array, selection: string): Promise<Uint8Array> {
    const source = await PDFDocument.load(bytes);
    const ranges = this.parsePageRanges(selection, source.getPageCount());
    const output = await PDFDocument.create();
    const pageIndices = ranges.flat();
    const pages = await output.copyPages(source, pageIndices);
    pages.forEach(page => output.addPage(page));
    return new Uint8Array(await output.save());
  }

  async mergePdfs(documents: Uint8Array[]): Promise<Uint8Array> {
    if (documents.length < 2) throw new Error('Select at least two PDFs to merge');
    const output = await PDFDocument.create();
    for (const bytes of documents) {
      const source = await PDFDocument.load(bytes);
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach(page => output.addPage(page));
    }
    return new Uint8Array(await output.save());
  }

  async splitByPageRanges(bytes: Uint8Array, selection: string): Promise<Uint8Array[]> {
    const source = await PDFDocument.load(bytes);
    const ranges = this.parsePageRanges(selection, source.getPageCount());
    const outputs = await Promise.all(ranges.map(async pageIndices => {
      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, pageIndices);
      pages.forEach(page => output.addPage(page));
      return new Uint8Array(await output.save());
    }));
    return outputs;
  }

  private parsePageRanges(selection: string, pageCount: number): number[][] {
    if (!selection.trim()) throw new Error('Page ranges are required');
    return selection.split(',').map(range => {
      const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(range);
      const normalizedRange = range.trim();
      if (!match) throw new Error(normalizedRange ? `Invalid page range: ${normalizedRange}` : 'Invalid page range: empty range');
      const start = Number(match[1]);
      const end = Number(match[2] ?? match[1]);
      this.validatePageNumber(start, pageCount);
      this.validatePageNumber(end, pageCount);
      if (end < start) throw new Error(`Invalid descending page range: ${normalizedRange}`);
      return Array.from({ length: end - start + 1 }, (_, index) => start + index - 1);
    });
  }

  private validatePageNumber(pageNumber: number, pageCount: number): void {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }
  }
}
