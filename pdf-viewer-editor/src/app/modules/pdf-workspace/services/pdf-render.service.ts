import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable({ providedIn: 'root' })
export class PdfRenderService {
  async renderPageToCanvas(
    bytes: Uint8Array,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale = 1
  ): Promise<void> {
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }

    await page.render({ canvasContext: context, viewport }).promise;
  }

  async extractText(bytes: Uint8Array, pageNumber: number): Promise<string> {
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();

    return textContent.items
      .map((item: any) => item.str ?? '')
      .join(' ')
      .trim();
  }
}
