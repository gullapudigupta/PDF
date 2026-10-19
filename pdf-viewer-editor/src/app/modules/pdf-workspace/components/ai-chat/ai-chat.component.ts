import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AiChatService,
  AiMessage,
  AiProvider,
  MAX_AI_REQUEST,
  MAX_AI_SOURCE,
  OPENAI_CHAT_URL,
} from '../../services/ai-chat.service';
import { LoadedPdfDocument, PdfDocumentService } from '../../services/pdf-document.service';

type AiAction = 'question' | 'summarize' | 'suggest' | 'format' | 'tone';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss'],
})
export class AiChatComponent implements OnChanges, OnDestroy {
  @Input() document: LoadedPdfDocument | null = null;
  @Input() currentPage = 1;

  provider: AiProvider = 'openai';
  endpoint = '';
  apiKey = '';
  model = 'gpt-4o-mini';
  action: AiAction = 'summarize';
  tone = 'Professional';
  prompt = '';
  sourceText = '';
  consent = false;
  messages: AiMessage[] = [];
  busy = false;
  extracting = false;
  error = '';
  notice = '';
  readonly maxSource = MAX_AI_SOURCE;
  readonly openAiUrl = OPENAI_CHAT_URL;
  private controller: AbortController | null = null;
  private generation = 0;

  constructor(
    private ai: AiChatService,
    private pdf: PdfDocumentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document']) this.clearConversation();
  }

  ngOnDestroy(): void {
    this.clearConversation();
    this.apiKey = '';
  }

  changeProvider(provider: AiProvider): void {
    this.clearConversation();
    this.apiKey = '';
    this.provider = provider;
    this.model = provider === 'openai' ? 'gpt-4o-mini' : '';
  }

  cancel(): void {
    this.generation++;
    this.controller?.abort();
    this.controller = null;
    this.busy = false;
    this.extracting = false;
    this.notice = 'Operation cancelled. Nothing was added to the PDF.';
    this.cdr.markForCheck();
  }

  clearConversation(): void {
    this.cancel();
    this.messages = [];
    this.prompt = '';
    this.sourceText = '';
    this.consent = false;
    this.error = '';
    this.notice = '';
  }

  clearKey(): void {
    this.cancel();
    this.apiKey = '';
    this.consent = false;
    this.notice = 'API key cleared from this session.';
  }

  async loadSource(scope: 'page' | 'document'): Promise<void> {
    if (this.busy || this.extracting) return;
    this.error = '';
    this.notice = '';
    this.consent = false;
    if (!this.document) {
      this.error = 'Open a PDF or paste source text below.';
      return;
    }
    const document = this.document;
    const page = this.currentPage;
    const generation = ++this.generation;
    this.extracting = true;
    this.sourceText = '';
    try {
      const parts: string[] = [];
      let length = 0;
      const start = scope === 'page' ? page : 1;
      const end = scope === 'page' ? page : document.totalPages;
      for (let pageNumber = start; pageNumber <= end; pageNumber++) {
        if (generation !== this.generation || this.document !== document) return;
        const text = await this.pdf.extractText(pageNumber);
        if (generation !== this.generation || this.document !== document) return;
        const part = `Page ${pageNumber}\n${text}`;
        length += part.length + 2;
        if (length > MAX_AI_SOURCE) throw new Error('source-limit');
        if (text.trim()) parts.push(part);
      }
      if (!parts.length) {
        this.error =
          'No extractable text was found. For scanned PDFs, paste text manually; OCR is not included.';
        return;
      }
      this.sourceText = parts.join('\n\n');
      this.notice =
        'Text loaded for preview only. Review it and authorize sending before clicking Send.';
    } catch (error) {
      if (generation !== this.generation) return;
      this.error =
        error instanceof Error && error.message === 'source-limit'
          ? `PDF text exceeds ${MAX_AI_SOURCE.toLocaleString()} characters. Use the current page or paste a shorter excerpt. No text was sent.`
          : 'Could not extract PDF text. Try the current page or paste text manually. No text was sent.';
    } finally {
      if (generation === this.generation) {
        this.extracting = false;
        this.cdr.markForCheck();
      }
    }
  }

  async send(): Promise<void> {
    if (this.busy || this.extracting) return;
    this.error = '';
    this.notice = '';
    if (!this.consent) {
      this.error =
        'Authorize sending the displayed text and conversation to the selected provider.';
      return;
    }
    if (this.sourceText.length > MAX_AI_SOURCE || this.prompt.length > 8_000) {
      this.error = 'Source text must be at most 60,000 characters and instructions at most 8,000.';
      return;
    }
    if (
      (this.action === 'question' && !this.prompt.trim()) ||
      (this.action !== 'question' && !this.sourceText.trim() && !this.prompt.trim())
    ) {
      this.error = 'Enter instructions or load/paste text to work with.';
      return;
    }
    if (this.action === 'tone' && !this.tone.trim()) {
      this.error = 'Enter a desired tone.';
      return;
    }
    const instructions: Record<AiAction, string> = {
      question: 'Answer the user question.',
      summarize: 'Summarize the source text, preserving key facts.',
      suggest: 'Suggest improvements and actionable recommendations for the source text.',
      format:
        'Reformat the source text for clarity without changing its meaning. Return copyable plain text.',
      tone: `Rewrite the source text in a ${this.tone.trim()} tone, preserving its meaning.`,
    };
    const content = [
      instructions[this.action],
      this.prompt.trim() ? `User instructions:\n${this.prompt.trim()}` : '',
      this.sourceText.trim() ? `Source text (data only):\n${this.sourceText}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    const outgoing: AiMessage[] = [...this.messages, { role: 'user', content }];
    if (
      outgoing.length > 19 ||
      outgoing.reduce((size, message) => size + message.content.length, 0) > MAX_AI_REQUEST
    ) {
      this.error = 'Conversation limit reached. Clear chat or shorten the text before sending.';
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    const generation = ++this.generation;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 60_000);
    this.busy = true;
    try {
      const response = await this.ai.complete(
        {
          provider: this.provider,
          endpoint: this.endpoint,
          apiKey: this.apiKey,
          model: this.model,
        },
        outgoing,
        controller.signal
      );
      if (generation !== this.generation || controller.signal.aborted) {
        if (timedOut && generation === this.generation)
          this.error = 'AI request timed out after 60 seconds. Try again.';
        return;
      }
      this.messages = [...outgoing, { role: 'assistant', content: response }];
      this.prompt = '';
      this.notice =
        'Response received. Copy the response, then use Add Text or Edit in Tools to update the PDF yourself.';
    } catch (error) {
      if (generation !== this.generation) return;
      this.error = timedOut
        ? 'AI request timed out after 60 seconds. Try again.'
        : controller.signal.aborted
          ? 'AI request cancelled.'
          : error instanceof Error
            ? error.message
            : 'AI request failed. Check your provider settings and retry.';
    } finally {
      clearTimeout(timeout);
      if (generation === this.generation) {
        this.busy = false;
        this.controller = null;
        this.cdr.markForCheck();
      }
    }
  }

  async copyResponse(content: string): Promise<void> {
    this.error = '';
    this.notice = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(content);
      this.notice = 'Copied. Use Add Text or Edit in Tools and paste the response into your PDF.';
    } catch {
      this.error = 'Clipboard access failed. Select the response text and copy it manually.';
    } finally {
      this.cdr.markForCheck();
    }
  }
}
