import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

export interface LoadedPdfDocument {
  id: string;
  name: string;
  totalPages: number;
  bytes: Uint8Array;
  proxy: any;
  isEncrypted?: boolean;
}

export type PdfPasswordProvider = (reason: number) => Promise<string | null>;

export class PdfPasswordCancelledError extends Error {
  constructor() {
    super('PDF password entry was cancelled');
    this.name = 'PdfPasswordCancelledError';
  }
}

@Injectable({ providedIn: 'root' })
export class PdfDocumentService {
  private currentDocument: LoadedPdfDocument | null = null;
  private getDocument = pdfjsLib.getDocument.bind(pdfjsLib);

  constructor() {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.mjs';
    }
  }

  async loadFromFile(file: File, passwordProvider?: PdfPasswordProvider): Promise<LoadedPdfDocument> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const id = `pdf-${file.name}-${file.size}-${file.lastModified}`;
    return this.loadFromBytes(bytes, file.name, id, passwordProvider);
  }

  async loadFromBytes(
    bytes: Uint8Array,
    name: string,
    id = `pdf-${Date.now()}`,
    passwordProvider?: PdfPasswordProvider
  ): Promise<LoadedPdfDocument> {
    let proxy: any;
    let isEncrypted = false;
    let passwordRequestCancelled = false;
    let passwordRequestError: unknown;
    let passwordRequestFailed = false;
    const load = async (): Promise<any> => {
      const loadingTask = this.getDocument({ data: bytes.slice() });
      if (passwordProvider) {
        loadingTask.onPassword = (updatePassword: (password: string) => void, reason: number) => {
          isEncrypted = true;
          void passwordProvider(reason).then(
            password => {
              if (password === null) {
                passwordRequestCancelled = true;
                void loadingTask.destroy();
                return;
              }
              updatePassword(password);
            },
            error => {
              passwordRequestFailed = true;
              passwordRequestError = error;
              void loadingTask.destroy();
            }
          );
        };
      }
      return loadingTask.promise;
    };
    try {
      proxy = await load();
    } catch (error) {
      if (passwordRequestCancelled) throw new PdfPasswordCancelledError();
      if (passwordRequestFailed) throw passwordRequestError ?? new Error('PDF password request failed');
      if (isEncrypted || this.isPasswordException(error)) throw error;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.js';
      proxy = await load();
    }

    const loaded: LoadedPdfDocument = {
      id,
      name,
      totalPages: proxy.numPages,
      bytes: bytes.slice(),
      proxy,
      isEncrypted,
    };

    const previousDocument = this.currentDocument;
    this.currentDocument = loaded;
    if (previousDocument && previousDocument.id !== loaded.id) previousDocument.proxy?.destroy();
    return loaded;
  }

  private isPasswordException(error: unknown): boolean {
    return typeof error === 'object' && error !== null &&
      'name' in error && error.name === 'PasswordException';
  }

  async replaceCurrentDocumentBytes(bytes: Uint8Array): Promise<LoadedPdfDocument> {
    if (!this.currentDocument) throw new Error('No document loaded');
    const current = this.currentDocument;
    const updated = await this.loadFromBytes(bytes, current.name, current.id);
    current.proxy?.destroy();
    return updated;
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
