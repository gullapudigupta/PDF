import { Injectable, OnDestroy } from '@angular/core';
import { createWorker, OEM } from 'tesseract.js';
import type { Worker, WorkerOptions } from 'tesseract.js';

export interface OcrLanguage {
  code: string;
  label: string;
}

export const OCR_LANGUAGES: readonly OcrLanguage[] = [
  { code: 'eng', label: 'English' },
  { code: 'hin', label: 'Hindi (हिन्दी)' },
  { code: 'tel', label: 'Telugu (తెలుగు)' },
  { code: 'tam', label: 'Tamil (தமிழ்)' },
  { code: 'ben', label: 'Bengali (বাংলা)' },
  { code: 'mar', label: 'Marathi (मराठी)' },
  { code: 'guj', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kan', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'mal', label: 'Malayalam (മലയാളം)' },
  { code: 'pan', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ori', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'urd', label: 'Urdu (اردو)' },
  { code: 'asm', label: 'Assamese (অসমীয়া)' },
];

export interface OcrProgress {
  stage: string;
  /** 0..1 progress of the current stage. */
  progress: number;
}

export interface OcrResult {
  text: string;
  /** Mean word confidence, 0..100. */
  confidence: number;
}

export class OcrCancelledError extends Error {
  constructor() {
    super('Text recognition was cancelled.');
    this.name = 'OcrCancelledError';
  }
}

type TesseractWorker = Pick<Worker, 'recognize' | 'terminate'>;

export interface TesseractModule {
  createWorker(langs: string | string[], oem: OEM, options: Partial<WorkerOptions>): Promise<TesseractWorker>;
}

const STAGE_LABELS: Record<string, string> = {
  'loading tesseract core': 'Loading the OCR engine',
  'initializing tesseract': 'Starting the OCR engine',
  'initialized tesseract': 'Starting the OCR engine',
  'loading language traineddata': 'Loading language data',
  'loaded language traineddata': 'Loading language data',
  'initializing api': 'Preparing languages',
  'initialized api': 'Preparing languages',
  'recognizing text': 'Recognising text',
};

/**
 * Tesseract is bundled with the dynamically imported OCR window, not the initial app.
 * Avoid a second package-path chunk request when recognition starts.
 */
@Injectable()
export class OcrEngineService implements OnDestroy {
  /** Replaced in tests; worker/core/language assets still load only on recognition. */
  loadModule: () => Promise<TesseractModule> = async () => ({ createWorker });

  private worker: TesseractWorker | null = null;
  private workerLangs = '';
  private progressHandler: ((progress: OcrProgress) => void) | null = null;
  private cancelCurrent: (() => void) | null = null;

  get busy(): boolean {
    return this.cancelCurrent !== null;
  }

  async recognize(image: HTMLCanvasElement | Blob, languages: string[], onProgress?: (progress: OcrProgress) => void): Promise<OcrResult> {
    if (this.busy) throw new Error('Text recognition is already running.');
    const codes = languages.filter(code => OCR_LANGUAGES.some(language => language.code === code));
    if (!codes.length) throw new Error('Choose at least one language.');

    let cancelled = false;
    const cancellation = new Promise<never>((_resolve, reject) => {
      this.cancelCurrent = () => {
        cancelled = true;
        reject(new OcrCancelledError());
      };
    });
    cancellation.catch(() => undefined);
    this.progressHandler = onProgress ?? null;
    try {
      const run = async (): Promise<OcrResult> => {
        const worker = await this.ensureWorker(codes.join('+'));
        if (cancelled) {
          if (this.worker === worker) await this.dispose();
          throw new OcrCancelledError();
        }
        const { data } = await worker.recognize(image);
        return { text: (data.text ?? '').replace(/\n{3,}/g, '\n\n').trim(), confidence: Math.round(Number(data.confidence) || 0) };
      };
      return await Promise.race([run(), cancellation]);
    } finally {
      this.cancelCurrent = null;
      this.progressHandler = null;
    }
  }

  /** Stops the running job. The worker is terminated because Tesseract jobs cannot be interrupted. */
  async cancel(): Promise<void> {
    const cancel = this.cancelCurrent;
    if (!cancel) return;
    cancel();
    await this.dispose();
  }

  async dispose(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    this.workerLangs = '';
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // The worker may already be gone; nothing else to release.
      }
    }
  }

  ngOnDestroy(): void {
    this.cancelCurrent?.();
    void this.dispose();
  }

  private async ensureWorker(langs: string): Promise<TesseractWorker> {
    if (this.worker && this.workerLangs === langs) return this.worker;
    await this.dispose();
    this.report('Loading the OCR engine', 0);
    const tesseract = await this.loadModule();
    const asset = (path: string) => new URL(path, document.baseURI).href;
    const worker = await tesseract.createWorker(langs.split('+'), OEM.LSTM_ONLY, {
      workerPath: asset('assets/ocr/worker.min.js'),
      corePath: asset('assets/ocr/core'),
      langPath: asset('assets/ocr/lang'),
      gzip: true,
      cacheMethod: 'none',
      workerBlobURL: false,
      logger: (message: { status?: string; progress?: number }) => {
        const stage = STAGE_LABELS[message.status ?? ''];
        if (stage) this.report(stage, Number(message.progress) || 0);
      },
    });
    this.worker = worker;
    this.workerLangs = langs;
    return worker;
  }

  private report(stage: string, progress: number): void {
    this.progressHandler?.({ stage, progress: Math.max(0, Math.min(1, progress)) });
  }
}
