import { Injectable } from '@angular/core';
import { PdfRenderService } from './pdf-render.service';

export type PdfPageImageFormat = 'png' | 'jpeg' | 'svg';
export type OfficeExportFormat = 'docx' | 'xlsx';

export interface ExportedPageFile {
  bytes: ArrayBuffer;
  mimeType: 'image/png' | 'image/jpeg' | 'image/svg+xml';
  extension: PdfPageImageFormat;
}

export interface OfficeExportAdapter {
  readonly format: OfficeExportFormat;
  exportPages(bytes: Uint8Array, pageNumbers: number[]): Promise<ArrayBuffer>;
}

@Injectable({ providedIn: 'root' })
export class PdfPageExportService {
  private readonly officeAdapters = new Map<OfficeExportFormat, OfficeExportAdapter>();

  constructor(private readonly pdfRenderService: PdfRenderService) {}

  async exportPage(bytes: Uint8Array, pageNumber: number, format: PdfPageImageFormat): Promise<ExportedPageFile> {
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }
    const canvas = globalThis.document.createElement('canvas');
    await this.pdfRenderService.renderPageToCanvas(bytes, pageNumber, canvas, { fitWidth: 2400, fitHeight: 3200 });
    const canvasBlob = await this.canvasToBlob(canvas, format === 'jpeg' ? 'image/jpeg' : 'image/png');
    if (format !== 'svg') {
      return {
        bytes: await canvasBlob.arrayBuffer(),
        mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
        extension: format,
      };
    }

    const pngDataUrl = await this.blobToDataUrl(canvasBlob);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image width="${canvas.width}" height="${canvas.height}" href="${pngDataUrl}"/></svg>`;
    const bytesBuffer = await new Blob([svg], { type: 'image/svg+xml' }).arrayBuffer();
    return { bytes: bytesBuffer, mimeType: 'image/svg+xml', extension: 'svg' };
  }

  registerOfficeAdapter(adapter: OfficeExportAdapter): void {
    if (this.officeAdapters.has(adapter.format)) {
      throw new Error(`An Office export adapter is already registered for ${adapter.format}`);
    }
    this.officeAdapters.set(adapter.format, adapter);
  }

  async exportOffice(bytes: Uint8Array, pageNumbers: number[], format: OfficeExportFormat): Promise<ArrayBuffer> {
    if (!pageNumbers.length || pageNumbers.some(page => !Number.isInteger(page) || page < 1)) {
      throw new Error('Select one or more valid pages for Office export');
    }
    const adapter = this.officeAdapters.get(format);
    if (!adapter) throw new Error(`No ${format.toUpperCase()} export adapter is registered`);
    return adapter.exportPages(bytes, [...new Set(pageNumbers)]);
  }

  private canvasToBlob(canvas: HTMLCanvasElement, mimeType: 'image/png' | 'image/jpeg'): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error(`Unable to encode rendered page as ${mimeType}`));
          return;
        }
        resolve(blob);
      }, mimeType, 0.92);
    });
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Unable to encode the page image for SVG export'));
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Unable to encode the page image for SVG export'));
          return;
        }
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }
}
