import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

export interface LoadedPdfDocument {
  id: string;
  name: string;
  totalPages: number;
  bytes: Uint8Array;
  proxy: any;
}

@Injectable({ providedIn: 'root' })
export class PdfDocumentService {
  private currentDocument: LoadedPdfDocument | null = null;

  constructor() {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.mjs';
    }
  }

  async loadFromFile(file: File): Promise<LoadedPdfDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let proxy: any;
    try {
      proxy = await pdfjsLib.getDocument({ data: bytes }).promise;
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.js';
      proxy = await pdfjsLib.getDocument({ data: bytes }).promise;
    }

    const loaded: LoadedPdfDocument = {
      id: `pdf-${Date.now()}`,
      name: file.name,
      totalPages: proxy.numPages,
      bytes,
      proxy,
    };

    this.currentDocument = loaded;
    return loaded;
  }

  getCurrentDocument(): LoadedPdfDocument | null {
    return this.currentDocument;
  }

  async getPage(pageNumber: number): Promise<any> {
    if (!this.currentDocument) {
      throw new Error('No document loaded');
    }

    if (pageNumber < 1 || pageNumber > this.currentDocument.totalPages) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }

    return this.currentDocument.proxy.getPage(pageNumber);
  }

  async extractText(pageNumber: number): Promise<string> {
    const page = await this.getPage(pageNumber);
    const textContent = await page.getTextContent();

    return textContent.items
      .map((item: any) => item.str ?? '')
      .join(' ')
      .trim();
  }

  closeCurrent(): void {
    if (this.currentDocument?.proxy) {
      this.currentDocument.proxy.destroy();
    }

    this.currentDocument = null;
  }
}
