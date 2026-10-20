import { OcrCancelledError, OcrEngineService, OcrProgress, TesseractModule } from './ocr-engine.service';

describe('OcrEngineService', () => {
  let service: OcrEngineService;
  let createWorker: jasmine.Spy;
  let workers: { recognize: jasmine.Spy; terminate: jasmine.Spy }[];
  let loggers: ((message: { status: string; progress: number }) => void)[];

  beforeEach(() => {
    workers = [];
    loggers = [];
    createWorker = jasmine.createSpy('createWorker').and.callFake(async (_langs: string[], _oem: number, options: any) => {
      loggers.push(options.logger);
      const worker = {
        recognize: jasmine.createSpy('recognize').and.callFake(async () => {
          options.logger({ status: 'recognizing text', progress: 0.5 });
          return { data: { text: 'నమస్తే Hello\n\n\n\nworld ', confidence: 87.6 } };
        }),
        terminate: jasmine.createSpy('terminate').and.resolveTo(undefined),
      };
      workers.push(worker);
      return worker;
    });
    service = new OcrEngineService();
    service.loadModule = jasmine.createSpy('loadModule').and.resolveTo({ createWorker } as unknown as TesseractModule);
  });

  afterEach(() => service.ngOnDestroy());

  it('loads tesseract lazily with bundled offline assets and LSTM-only models', async () => {
    expect(service.loadModule).not.toHaveBeenCalled();
    const progress: OcrProgress[] = [];
    const result = await service.recognize(document.createElement('canvas'), ['eng', 'tel'], step => progress.push(step));

    expect(service.loadModule).toHaveBeenCalledTimes(1);
    const [langs, oem, options] = createWorker.calls.mostRecent().args;
    expect(langs).toEqual(['eng', 'tel']);
    expect(oem).toBe(1);
    expect(options.workerPath).toBe(new URL('assets/ocr/worker.min.js', document.baseURI).href);
    expect(options.corePath).toBe(new URL('assets/ocr/core', document.baseURI).href);
    expect(options.langPath).toBe(new URL('assets/ocr/lang', document.baseURI).href);
    expect(options.gzip).toBeTrue();
    expect(options.cacheMethod).toBe('none');
    expect(options.workerBlobURL).toBeFalse();
    expect(JSON.stringify(options)).not.toContain('cdn.jsdelivr');
    expect(result).toEqual({ text: 'నమస్తే Hello\n\nworld', confidence: 88 });
    expect(progress.map(step => step.stage)).toContain('Recognising text');
  });

  it('reuses the worker for the same languages and recreates it when languages change', async () => {
    const canvas = document.createElement('canvas');
    await service.recognize(canvas, ['hin']);
    await service.recognize(canvas, ['hin']);
    expect(createWorker).toHaveBeenCalledTimes(1);
    await service.recognize(canvas, ['tam', 'eng']);
    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(workers[0].terminate).toHaveBeenCalled();
  });

  it('rejects unknown languages and parallel jobs', async () => {
    await expectAsync(service.recognize(document.createElement('canvas'), ['xyz'])).toBeRejectedWithError('Choose at least one language.');
    workers = [];
    createWorker.and.returnValue(new Promise(() => undefined));
    const first = service.recognize(document.createElement('canvas'), ['eng']);
    await expectAsync(service.recognize(document.createElement('canvas'), ['eng'])).toBeRejectedWithError('Text recognition is already running.');
    await service.cancel();
    await expectAsync(first).toBeRejectedWith(jasmine.any(OcrCancelledError));
  });

  it('cancels a running job and terminates the worker', async () => {
    let release!: () => void;
    createWorker.and.callFake(async () => {
      const worker = {
        recognize: jasmine.createSpy('recognize').and.returnValue(new Promise(resolve => { release = () => resolve({ data: { text: 'late', confidence: 1 } }); })),
        terminate: jasmine.createSpy('terminate').and.resolveTo(undefined),
      };
      workers.push(worker);
      return worker;
    });
    const job = service.recognize(document.createElement('canvas'), ['eng']);
    await new Promise(resolve => setTimeout(resolve));
    expect(service.busy).toBeTrue();
    await service.cancel();
    await expectAsync(job).toBeRejectedWith(jasmine.any(OcrCancelledError));
    expect(workers[0].terminate).toHaveBeenCalled();
    expect(service.busy).toBeFalse();
    release();
  });
});
