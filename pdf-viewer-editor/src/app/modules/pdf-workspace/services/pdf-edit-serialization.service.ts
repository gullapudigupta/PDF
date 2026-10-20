import { Injectable } from '@angular/core';
import { PDFDocument, PDFFont, PDFName, PDFPage, PDFString, rgb, StandardFonts } from 'pdf-lib';
import { Annotation } from '../models/annotation.model';

export interface PdfEditableOverlay {
  type: 'text' | 'image' | 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  text?: string;
  imageSrc?: string;
  url?: string;
  pageNumber?: number;
  fontSize?: number;
  bold?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PdfEditSerializationService {
  async flattenEdits(
    bytes: Uint8Array,
    pageNumber: number,
    viewportWidth: number,
    viewportHeight: number,
    overlays: PdfEditableOverlay[],
    annotations: Annotation[]
  ): Promise<Uint8Array> {
    if (!overlays.length && !annotations.length) return bytes.slice();
    if (![viewportWidth, viewportHeight].every(value => Number.isFinite(value) && value > 0)) {
      throw new Error('Page viewport dimensions are required to save edits');
    }

    const document = await PDFDocument.load(bytes);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > document.getPageCount()) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }
    const page = document.getPage(pageNumber - 1);
    const scaleX = page.getWidth() / viewportWidth;
    const scaleY = page.getHeight() / viewportHeight;
    const font = await document.embedFont(StandardFonts.Helvetica);
    let boldFont: PDFFont | null = null;

    for (const overlay of overlays) {
      const x = overlay.x * scaleX;
      const y = page.getHeight() - (overlay.y + overlay.height) * scaleY;
      const width = overlay.width * scaleX;
      const height = overlay.height * scaleY;
      if (overlay.type === 'image') {
        if (!overlay.imageSrc) throw new Error('Image edit is missing its image data');
        const image = await this.embedImage(document, overlay.imageSrc);
        page.drawImage(image, { x, y, width, height });
      } else {
        const text = overlay.type === 'link' ? (overlay.text || overlay.url || '') : (overlay.text || '');
        const styled = overlay.type === 'text' && (overlay.fontSize !== undefined || overlay.bold !== undefined);
        if (text && styled) {
          const size = this.pointSize(overlay.fontSize);
          if (overlay.bold && !boldFont) boldFont = await document.embedFont(StandardFonts.HelveticaBold);
          // Matches the on-screen layout: text starts below the 20px object label plus 4px padding.
          const top = page.getHeight() - (overlay.y + 24) * scaleY;
          page.drawText(text, {
            x: x + 4 * scaleX,
            y: top - size,
            size,
            lineHeight: size * 1.35,
            maxWidth: Math.max(1, width - 8 * scaleX),
            font: overlay.bold && boldFont ? boldFont : font,
            color: rgb(0.08, 0.16, 0.34),
          });
        } else if (text) {
          page.drawText(text, {
            x,
            y: y + Math.max(2, height * 0.2),
            size: Math.max(6, 14 * scaleY),
            maxWidth: width,
            font,
            color: rgb(0.08, 0.16, 0.34),
          });
        }
        if (overlay.type === 'link') {
          if (overlay.pageNumber !== undefined) {
            if (!Number.isInteger(overlay.pageNumber) || overlay.pageNumber < 1 || overlay.pageNumber > document.getPageCount()) {
              throw new Error(`Invalid internal link page: ${overlay.pageNumber}`);
            }
            const annotation = document.context.register(document.context.obj({
              Type: 'Annot',
              Subtype: 'Link',
              Rect: [x, y, x + width, y + height],
              Border: [0, 0, 0],
              Dest: [document.getPage(overlay.pageNumber - 1).ref, PDFName.of('Fit')],
            }));
            page.node.addAnnot(annotation);
          } else if (overlay.url) {
            let url: URL;
            try {
              url = new URL(overlay.url);
            } catch {
              throw new Error('PDF links must use HTTP or HTTPS');
            }
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
              throw new Error('PDF links must use HTTP or HTTPS');
            }
            page.drawLine({
              start: { x, y: y + Math.max(1, height * 0.15) },
              end: { x: x + width, y: y + Math.max(1, height * 0.15) },
              thickness: Math.max(0.5, scaleY),
              color: rgb(0.08, 0.16, 0.34),
            });
            const annotation = document.context.register(document.context.obj({
              Type: 'Annot',
              Subtype: 'Link',
              Rect: [x, y, x + width, y + height],
              Border: [0, 0, 0],
              A: { S: 'URI', URI: PDFString.of(url.href) },
            }));
            page.node.addAnnot(annotation);
          } else {
            throw new Error('PDF link is missing a valid destination');
          }
        }
      }
    }

    for (const annotation of annotations) {
      if (annotation.page < 1 || annotation.page > document.getPageCount()) {
        throw new Error(`Invalid annotation page: ${annotation.page}`);
      }
      const annotationPage = document.getPage(annotation.page - 1);
      const annotationScaleX = annotation.viewport ? annotationPage.getWidth() / annotation.viewport.width : scaleX;
      const annotationScaleY = annotation.viewport ? annotationPage.getHeight() / annotation.viewport.height : scaleY;
      this.drawAnnotation(annotationPage, annotation, annotationScaleX, annotationScaleY, font);
    }
    return new Uint8Array(await document.save());
  }

  private pointSize(value: number | undefined): number {
    const size = Number(value ?? 12);
    return Number.isFinite(size) ? Math.min(72, Math.max(6, size)) : 12;
  }

  private drawAnnotation(
    page: PDFPage,
    annotation: Annotation,
    scaleX: number,
    scaleY: number,
    font: Awaited<ReturnType<PDFDocument['embedFont']>>
  ): void {
    const color = this.parseColor(annotation.style.color);
    const x = annotation.rect.x * scaleX;
    const y = page.getHeight() - (annotation.rect.y + annotation.rect.height) * scaleY;
    const width = annotation.rect.width * scaleX;
    const height = annotation.rect.height * scaleY;

    if (annotation.type === 'draw') {
      const points = (annotation.content ?? '').split(/\s+/).filter(Boolean).map(point => {
        const [pointX, pointY] = point.split(',').map(Number);
        if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) throw new Error('Invalid freehand annotation coordinates');
        return { x: x + pointX * scaleX, y: page.getHeight() - (annotation.rect.y + pointY) * scaleY };
      });
      for (let index = 1; index < points.length; index++) {
        page.drawLine({
          start: points[index - 1],
          end: points[index],
          thickness: Math.max(0.5, (annotation.style.strokeWidth ?? 2) * scaleX),
          color,
          opacity: annotation.style.opacity,
        });
      }
      return;
    }

    page.drawRectangle({
      x,
      y,
      width,
      height,
      color,
      opacity: annotation.style.opacity,
      borderColor: annotation.type === 'highlight' ? undefined : color,
      borderWidth: annotation.type === 'highlight' ? 0 : Math.max(0.5, scaleX),
    });
    if (annotation.content && annotation.type !== 'highlight') {
      page.drawText(annotation.content, {
        x: x + 2 * scaleX,
        y: y + Math.max(2, height * 0.2),
        size: Math.max(6, 10 * scaleY),
        maxWidth: Math.max(1, width - 4 * scaleX),
        font,
        color,
      });
    }
  }

  private async embedImage(document: PDFDocument, source: string) {
    let mimeType: string;
    let bytes: Uint8Array;
    const dataUri = /^data:image\/(png|jpeg);base64,([\s\S]+)$/i.exec(source);
    if (dataUri) {
      mimeType = dataUri[1].toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
      bytes = Uint8Array.from(atob(dataUri[2]), character => character.charCodeAt(0));
    } else {
      const url = new URL(source);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Image URL must use HTTP or HTTPS');
      const response = await fetch(url, { credentials: 'omit' });
      if (!response.ok) throw new Error(`Unable to load image (${response.status})`);
      mimeType = response.headers.get('content-type')?.split(';')[0] ?? '';
      bytes = new Uint8Array(await response.arrayBuffer());
    }

    if (mimeType === 'image/png') return document.embedPng(bytes);
    if (mimeType === 'image/jpeg') return document.embedJpg(bytes);
    throw new Error(`Unsupported image type: ${mimeType || 'unknown'}`);
  }

  private parseColor(value: string) {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
    if (!match) throw new Error(`Unsupported annotation color: ${value}`);
    const hex = match[1].length === 3 ? [...match[1]].map(character => character + character).join('') : match[1];
    return rgb(
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255
    );
  }
}
