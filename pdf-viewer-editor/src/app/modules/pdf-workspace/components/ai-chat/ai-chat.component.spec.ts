import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AiChatComponent } from './ai-chat.component';
import { AiChatService, MAX_AI_SOURCE } from '../../services/ai-chat.service';
import { LoadedPdfDocument, PdfDocumentService } from '../../services/pdf-document.service';

describe('AiChatComponent', () => {
  let fixture: ComponentFixture<AiChatComponent>;
  let component: AiChatComponent;
  let ai: jasmine.SpyObj<AiChatService>;
  let pdf: jasmine.SpyObj<PdfDocumentService>;
  const document: LoadedPdfDocument = {
    id: 'pdf',
    name: 'test.pdf',
    totalPages: 2,
    bytes: new Uint8Array([1]),
    proxy: null,
  };

  beforeEach(async () => {
    ai = jasmine.createSpyObj<AiChatService>('AiChatService', ['complete']);
    pdf = jasmine.createSpyObj<PdfDocumentService>('PdfDocumentService', ['extractText']);
    ai.complete.and.resolveTo('Improved text');
    pdf.extractText.and.callFake(async page => `Text on page ${page}`);
    await TestBed.configureTestingModule({
      imports: [AiChatComponent],
      providers: [
        { provide: AiChatService, useValue: ai },
        { provide: PdfDocumentService, useValue: pdf },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AiChatComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('document', document);
    fixture.detectChanges();
    component.apiKey = 'session-secret';
  });

  it('previews the current page or full document locally, without sending', async () => {
    component.currentPage = 2;
    await component.loadSource('page');
    expect(pdf.extractText.calls.allArgs()).toEqual([[2]]);
    expect(component.sourceText).toBe('Page 2\nText on page 2');
    pdf.extractText.calls.reset();
    await component.loadSource('document');
    expect(pdf.extractText.calls.allArgs()).toEqual([[1], [2]]);
    expect(component.sourceText).toContain('Page 1');
    expect(component.consent).toBeFalse();
    expect(ai.complete).not.toHaveBeenCalled();
  });

  it('requires explicit consent and text, sends only preview/messages, and never modifies the PDF', async () => {
    component.sourceText = 'Original text';
    await component.send();
    expect(ai.complete).not.toHaveBeenCalled();
    component.consent = true;
    await component.send();
    const [settings, messages] = ai.complete.calls.mostRecent().args;
    expect(settings.apiKey).toBe('session-secret');
    expect(messages[0].content).toContain('Original text');
    expect(JSON.stringify(messages)).not.toContain('session-secret');
    expect(component.messages[1]).toEqual({ role: 'assistant', content: 'Improved text' });
    expect(document.bytes).toEqual(new Uint8Array([1]));
    expect(component.notice).toContain('Copy');
    expect(component.sourceText).toBe('Original text');
  });

  it('refreshes async preview and response state without another user interaction', async () => {
    fixture.autoDetectChanges();
    await component.loadSource('page');
    await fixture.whenStable();
    const preview: HTMLTextAreaElement = fixture.nativeElement.querySelector(
      '[aria-label="AI source text preview"]'
    );
    expect(preview.value).toContain('Text on page 1');
    expect(preview.disabled).toBeFalse();
    component.consent = true;
    await component.send();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Improved text');
  });

  it('builds instructions for every writing action', async () => {
    for (const action of ['summarize', 'suggest', 'format', 'tone', 'question'] as const) {
      component.clearConversation();
      component.action = action;
      component.sourceText = 'Some source';
      component.prompt = 'Help me';
      component.consent = true;
      await component.send();
      expect(ai.complete.calls.mostRecent().args[1][0].content).toContain('Help me');
      if (action === 'tone')
        expect(ai.complete.calls.mostRecent().args[1][0].content).toContain('Professional');
    }
  });

  it('reports empty/scanned, oversized and failed text extraction', async () => {
    pdf.extractText.and.resolveTo('');
    await component.loadSource('document');
    expect(component.error).toContain('No extractable text');
    pdf.extractText.and.resolveTo('a'.repeat(MAX_AI_SOURCE));
    await component.loadSource('page');
    expect(component.error).toContain('exceeds');
    expect(component.sourceText).toBe('');
    pdf.extractText.and.rejectWith(new Error('Internal details'));
    await component.loadSource('page');
    expect(component.error).toContain('Could not extract');
    expect(component.error).not.toContain('Internal details');
  });

  it('does not accept stale extraction after document changes or cancel', async () => {
    let resolve!: (text: string) => void;
    pdf.extractText.and.returnValue(
      new Promise<string>(done => {
        resolve = done;
      })
    );
    const pending = component.loadSource('document');
    fixture.componentRef.setInput('document', null);
    fixture.detectChanges();
    resolve('Old document text');
    await pending;
    expect(component.sourceText).toBe('');
    expect(component.extracting).toBeFalse();
    expect(pdf.extractText).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate sends and discards cancelled responses', async () => {
    let resolve!: (text: string) => void;
    ai.complete.and.returnValue(
      new Promise<string>(done => {
        resolve = done;
      })
    );
    component.sourceText = 'Text';
    component.consent = true;
    const pending = component.send();
    await component.send();
    expect(ai.complete).toHaveBeenCalledTimes(1);
    const signal = ai.complete.calls.mostRecent().args[2];
    component.cancel();
    expect(signal.aborted).toBeTrue();
    resolve('Stale response');
    await pending;
    expect(component.messages).toEqual([]);
    expect(component.busy).toBeFalse();
  });

  it('times out and exposes a retryable error', fakeAsync(() => {
    ai.complete.and.callFake(
      (_settings, _messages, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('Cancelled', 'AbortError'))
          );
        })
    );
    component.sourceText = 'Text';
    component.consent = true;
    void component.send();
    tick(60_000);
    expect(component.error).toContain('timed out');
    expect(component.busy).toBeFalse();
  }));

  it('shows provider errors and preserves input for retry', async () => {
    ai.complete.and.rejectWith(new Error('AI authentication failed.'));
    component.sourceText = 'Text';
    component.prompt = 'Instructions';
    component.consent = true;
    await component.send();
    expect(component.error).toContain('authentication');
    expect(component.prompt).toBe('Instructions');
    expect(component.messages).toEqual([]);
    expect(component.busy).toBeFalse();
  });

  it('rejects empty and oversized requests without calling the provider', async () => {
    component.consent = true;
    await component.send();
    expect(component.error).toContain('Enter instructions');
    component.sourceText = 'a'.repeat(MAX_AI_SOURCE + 1);
    await component.send();
    expect(component.error).toContain('60,000');
    expect(ai.complete).not.toHaveBeenCalled();
  });

  it('copies plain text, exposes clipboard errors and renders responses without HTML', async () => {
    const clipboard = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    await component.copyResponse('<b>Plain text</b>');
    expect(clipboard).toHaveBeenCalledWith('<b>Plain text</b>');
    expect(component.notice).toContain('Copied');
    clipboard.and.rejectWith(new Error('Denied'));
    await component.copyResponse('Text');
    expect(component.error).toContain('copy it manually');
    component.messages = [{ role: 'assistant', content: '<script>alert(1)</script>' }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.message-text').textContent).toContain('<script>');
    expect(fixture.nativeElement.querySelector('.message-text script')).toBeNull();
  });

  it('clears document context on replacement and credentials on provider switch or destruction', () => {
    component.messages = [{ role: 'assistant', content: 'Old' }];
    component.sourceText = 'Old';
    fixture.componentRef.setInput('document', { ...document, id: 'next' });
    fixture.detectChanges();
    expect(component.messages).toEqual([]);
    expect(component.sourceText).toBe('');
    expect(component.apiKey).toBe('session-secret');
    component.changeProvider('other');
    expect(component.apiKey).toBe('');
    expect(component.model).toBe('');
    component.apiKey = 'new-key';
    fixture.destroy();
    expect(component.apiKey).toBe('');
  });
});
