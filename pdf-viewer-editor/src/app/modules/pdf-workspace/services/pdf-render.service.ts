import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

export interface RenderOptions {
  fitWidth?: number;
  fitHeight?: number;
  zoom?: number;
  rotation?: number;
}

@Injectable({ providedIn: 'root' })
export class PdfRenderService {
  async renderPageToCanvas(
    bytes: Uint8Array,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    options: RenderOptions = {}
  ): Promise<void> {
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await doc.getPage(pageNumber);

    const rotation = options.rotation ?? 0;
    const baseViewport = page.getViewport({ scale: 1, rotation });

    const widthScale = options.fitWidth ? options.fitWidth / baseViewport.width : Number.POSITIVE_INFINITY;
    const heightScale = options.fitHeight ? options.fitHeight / baseViewport.height : Number.POSITIVE_INFINITY;

    const fitScale = Math.min(widthScale, heightScale);
    const safeFitScale = Number.isFinite(fitScale) ? fitScale : 1;
    const finalScale = Math.max(0.1, safeFitScale * (options.zoom ?? 1));

    const viewport = page.getViewport({ scale: finalScale, rotation });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
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
