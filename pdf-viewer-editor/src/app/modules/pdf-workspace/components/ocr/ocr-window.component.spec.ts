import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OcrCancelledError, OcrEngineService } from './ocr-engine.service';
import { OcrWindowComponent } from './ocr-window.component';

async function pngFile(name = 'scan.png', width = 40, height = 20): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.fillRect(0, 0, 10, 10);
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
  return new File([blob], name, { type: 'image/png' });
}

describe('OcrWindowComponent', () => {
  let fixture: ComponentFixture<OcrWindowComponent>;
  let component: OcrWindowComponent;
  let engine: jasmine.SpyObj<OcrEngineService>;

  beforeEach(async () => {
    engine = jasmine.createSpyObj<OcrEngineService>('OcrEngineService', ['recognize', 'cancel', 'dispose']);
    engine.cancel.and.resolveTo();
    engine.dispose.and.resolveTo();
    await TestBed.configureTestingModule({ imports: [OcrWindowComponent] })
      .overrideComponent(OcrWindowComponent, { set: { providers: [{ provide: OcrEngineService, useValue: engine }] } })
      .compileComponents();
    fixture = TestBed.createComponent(OcrWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the privacy promise, all supported languages and a disabled extract button until an image is chosen', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('runs on this device');
    expect(text).toContain('never uploaded');
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.languages label') as NodeListOf<HTMLElement>).map(label => label.textContent!.trim());
    expect(labels.length).toBe(13);
    expect(labels.join(' ')).toContain('Telugu');
    expect(labels.join(' ')).toContain('Tamil');
    expect(labels.join(' ')).toContain('Hindi');
    const extract = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(button => button.textContent!.includes('Extract text'))!;
    expect(extract.disabled).toBeTrue();
  });

  it('validates image type and size before reading', async () => {
    await component.loadImageFile(new File(['x'], 'doc.pdf', { type: 'application/pdf' }), 'doc.pdf');
    expect(component.error).toContain('PNG, JPEG, WebP or BMP');
    const big = new File([new Uint8Array(21 * 1024 * 1024)], 'huge.png', { type: 'image/png' });
    await component.loadImageFile(big, 'huge.png');
    expect(component.error).toContain('larger than 20 MB');
    expect(component.hasImage).toBeFalse();
  });

  it('extracts text from an uploaded image in the chosen languages, then copies, downloads and adds it to the PDF', async () => {
    engine.recognize.and.callFake(async (_image, _langs, onProgress) => {
      onProgress?.({ stage: 'Recognising text', progress: 0.4 });
      return { text: 'తెలుగు text', confidence: 91 };
    });
    component.canAddToPdf = true;
    await component.loadImageFile(await pngFile(), 'scan.png');
    expect(component.hasImage).toBeTrue();
    expect(component.previewUrl).toMatch(/^blob:/);
    component.toggleLanguage('tel', true);
    component.toggleLanguage('eng', false);

    await component.recognize();
    expect(engine.recognize).toHaveBeenCalledWith(jasmine.any(HTMLCanvasElement), ['tel'], jasmine.any(Function));
    expect(component.resultText).toBe('తెలుగు text');
    expect(component.notice).toContain('91% confidence');

    const clipboard = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    await component.copyText();
    expect(clipboard).toHaveBeenCalledWith('తెలుగు text');

    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    component.downloadText();
    expect(click).toHaveBeenCalled();

    const added: string[] = [];
    component.addToPdf.subscribe(text => added.push(text));
    component.insertIntoPdf();
    expect(added).toEqual(['తెలుగు text']);
  });

  it('keeps at least one language selected', () => {
    component.toggleLanguage('eng', false);
    expect(component.isSelected('eng')).toBeTrue();
    expect(component.notice).toContain('at least one language');
  });

  it('uses the current PDF page as the image source', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 70;
    component.pageSource = jasmine.createSpy('pageSource').and.resolveTo({ canvas, label: 'report.pdf – page 2' });
    await component.useCurrentPage();
    expect(component.hasImage).toBeTrue();
    expect(component.sourceLabel).toBe('report.pdf – page 2');
  });

  it('reports cancellation and lets Escape cancel then close', async () => {
    engine.recognize.and.rejectWith(new OcrCancelledError());
    await component.loadImageFile(await pngFile(), 'scan.png');
    await component.recognize();
    expect(component.notice).toContain('cancelled');
    expect(component.error).toBe('');

    const closed: boolean[] = [];
    component.close.subscribe(() => closed.push(true));
    component.busy = true;
    const escapeWhileBusy = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    component.onDialogKeydown(escapeWhileBusy);
    expect(engine.cancel).toHaveBeenCalled();
    expect(closed).toEqual([]);
    component.busy = false;
    component.onDialogKeydown(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(closed).toEqual([true]);
    component.onDocumentEscape(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(closed).toEqual([true, true]);
  });
});
