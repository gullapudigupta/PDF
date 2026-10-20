import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Output, ViewChild } from '@angular/core';

export const OPENAI_API_KEYS_URL = 'https://platform.openai.com/api-keys';

interface GuideStep {
  id: 'signin' | 'billing' | 'keys' | 'create' | 'copy' | 'paste';
  title: string;
  text: string;
  url: string;
}

@Component({
  selector: 'app-ai-key-guide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backdrop" (click)="close.emit()"></div>
    <section class="card" role="dialog" aria-modal="true" aria-labelledby="ai-key-guide-title" aria-describedby="ai-key-guide-step">
      <header>
        <div>
          <h2 id="ai-key-guide-title">How to get an OpenAI API key</h2>
          <p>A ChatGPT Plus/Team subscription is billed separately and does not include API access.</p>
        </div>
        <button type="button" class="icon-close" aria-label="Close API key guide" (click)="close.emit()">&times;</button>
      </header>

      <ol class="progress" aria-label="Guide steps">
        <li *ngFor="let item of steps; let i = index">
          <button type="button" [class.done]="i < index" [attr.aria-current]="i === index ? 'step' : null"
            [attr.aria-label]="'Step ' + (i + 1) + ': ' + item.title" (click)="go(i)">{{ i + 1 }}</button>
        </li>
      </ol>

      <div class="body" id="ai-key-guide-step" aria-live="polite">
        <figure class="illustration" [attr.aria-label]="'Illustration: ' + step.title">
          <div class="browser" aria-hidden="true">
            <div class="chrome"><span></span><span></span><span></span><div class="address">{{ step.url }}</div></div>
            <div class="screen" [ngSwitch]="step.id">
              <div *ngSwitchCase="'signin'" class="center">
                <div class="logo">OpenAI Platform</div>
                <div class="field-mock">you&#64;example.com</div>
                <div class="btn-mock hl">Log in / Sign up</div>
              </div>
              <div *ngSwitchCase="'billing'" class="split">
                <div class="side"><div>Settings</div><div class="hl-text">Billing</div><div>Limits</div></div>
                <div class="main"><div class="h">Billing overview</div><div class="muted">Credit balance: $0.00</div>
                  <div class="btn-mock hl">Add payment details</div></div>
              </div>
              <div *ngSwitchCase="'keys'" class="split">
                <div class="side"><div>Dashboard</div><div>Playground</div><div class="hl-text">API keys</div><div>Usage</div></div>
                <div class="main"><div class="h">API keys</div><div class="row-mock"></div><div class="row-mock short"></div></div>
              </div>
              <div *ngSwitchCase="'create'" class="split">
                <div class="side"><div class="hl-text">API keys</div></div>
                <div class="main"><div class="h">API keys <span class="btn-mock hl small">+ Create new secret key</span></div>
                  <div class="popup"><div class="muted">Name (optional)</div><div class="field-mock">PDF editor</div>
                    <div class="btn-mock primary">Create secret key</div></div></div>
              </div>
              <div *ngSwitchCase="'copy'" class="center">
                <div class="h">Save your key</div>
                <div class="key-row"><code>sk-proj-••••••••••••••••</code><span class="btn-mock hl small">Copy</span></div>
                <div class="warn">You will not be able to view this key again.</div>
              </div>
              <div *ngSwitchCase="'paste'" class="center left">
                <div class="h">AI writing assistant</div>
                <div class="muted">Provider: OpenAI GPT (primary)</div>
                <div class="muted">API key</div>
                <div class="field-mock hl">••••••••••••••••••</div>
                <div class="muted">Model: gpt-4o-mini</div>
              </div>
            </div>
          </div>
          <figcaption>
            <span class="badge">Step {{ index + 1 }} of {{ steps.length }}</span>
            <h3 #stepTitle tabindex="-1">{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </figcaption>
        </figure>
        <p class="safety">Keep your key private. Do not share it or paste it into documents. This app keeps it in memory only; revoke it on the API keys page if it is exposed.</p>
      </div>

      <footer>
        <a class="link" [href]="apiKeysUrl" target="_blank" rel="noopener noreferrer">Open OpenAI API keys page</a>
        <span class="spacer"></span>
        <button type="button" (click)="go(index - 1)" [disabled]="index === 0">Previous</button>
        <button *ngIf="index < steps.length - 1" type="button" class="primary" (click)="go(index + 1)">Next</button>
        <button *ngIf="index === steps.length - 1" type="button" class="primary" (click)="close.emit()">Done</button>
      </footer>
    </section>
  `,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .backdrop { position: absolute; inset: 0; background: rgba(15, 23, 42, .55); }
    .card { position: relative; display: flex; flex-direction: column; width: min(600px, 100%); max-height: calc(100vh - 32px); overflow: hidden;
      background: #fff; color: #1f2937; border-radius: 12px; box-shadow: 0 20px 50px rgba(15, 23, 42, .35); }
    header { display: flex; gap: 12px; padding: 16px 20px 10px; border-top: 4px solid var(--brand-peacock, #006b63); }
    header h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--brand-peacock, #006b63); }
    header p { margin: 4px 0 0; font-size: 13px; color: #4b5563; }
    .icon-close { margin-left: auto; min-width: 36px; padding: 0; border: 0; background: transparent; font-size: 22px; line-height: 1; }
    .progress { display: flex; justify-content: center; gap: 8px; margin: 0; padding: 4px 20px 10px; list-style: none; border-bottom: 1px solid #e5e7eb; }
    .progress button { width: 32px; height: 32px; min-height: 32px; padding: 0; border-radius: 50%; font-weight: 700; }
    .progress button.done { background: #e7f5f2; border-color: var(--brand-peacock, #006b63); color: var(--brand-peacock, #006b63); }
    .progress button[aria-current="step"] { background: var(--brand-peacock, #006b63); border-color: var(--brand-peacock, #006b63); color: #fff; }
    .body { padding: 14px 20px; overflow-y: auto; }
    figure { margin: 0; display: grid; gap: 12px; }
    .browser { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; box-shadow: 0 4px 12px #0001; }
    .chrome { display: flex; align-items: center; gap: 5px; padding: 6px 8px; background: #e2e8f0; }
    .chrome > span { width: 9px; height: 9px; border-radius: 50%; background: #94a3b8; }
    .address { flex: 1; margin-left: 6px; padding: 3px 8px; border-radius: 10px; background: #fff; font-size: 11px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .screen { min-height: 170px; padding: 14px; font-size: 12px; }
    .center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 150px; }
    .center.left { align-items: stretch; max-width: 280px; margin: 0 auto; }
    .split { display: grid; grid-template-columns: 110px 1fr; gap: 12px; min-height: 150px; }
    .side { display: grid; align-content: start; gap: 6px; padding-right: 8px; border-right: 1px solid #e2e8f0; color: #475569; }
    .main { display: grid; align-content: start; gap: 8px; position: relative; }
    .logo, .h { font-weight: 700; font-size: 14px; color: #111827; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .muted { color: #64748b; }
    .field-mock { min-width: 180px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #64748b; }
    .btn-mock { display: inline-block; padding: 6px 12px; border-radius: 6px; background: #111827; color: #fff; font-weight: 600; text-align: center; }
    .btn-mock.small { padding: 3px 8px; font-size: 11px; }
    .btn-mock.primary { background: #10a37f; }
    .row-mock { height: 12px; border-radius: 4px; background: #e2e8f0; }
    .row-mock.short { width: 60%; }
    .popup { display: grid; gap: 6px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; box-shadow: 0 6px 16px #0002; }
    .key-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
    .warn { color: #b42318; font-weight: 600; }
    .hl { outline: 3px solid var(--brand-lotus, #b33b65); outline-offset: 2px; animation: pulse 1.6s ease-in-out infinite; }
    .hl-text { color: var(--brand-lotus, #b33b65); font-weight: 700; }
    @keyframes pulse { 50% { outline-color: rgba(179, 59, 101, .35); } }
    @media (prefers-reduced-motion: reduce) { .hl { animation: none; } }
    figcaption h3 { margin: 6px 0 4px; font-size: 16px; font-weight: 700; color: #111827; }
    figcaption h3:focus { outline: none; }
    figcaption p { margin: 0; font-size: 14px; line-height: 1.5; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; background: #fbe9f0; color: var(--brand-lotus, #b33b65); font-size: 12px; font-weight: 700; }
    .safety { margin: 12px 0 0; padding: 10px 12px; font-size: 12px; background: #e7f5f2; border-left: 4px solid var(--brand-peacock, #006b63); border-radius: 6px; }
    footer { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid #e5e7eb; background: #f9fafb; }
    .spacer { flex: 1; }
    .link { color: var(--brand-peacock, #006b63); font-size: 13px; font-weight: 600; }
    button { min-height: 38px; padding: 6px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #1f2937; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    button:focus-visible, .link:focus-visible { outline: 3px solid var(--brand-lotus, #b33b65); outline-offset: 1px; }
    button.primary { background: var(--brand-peacock, #006b63); border-color: var(--brand-peacock, #006b63); color: #fff; }
    @media (max-width: 600px) {
      :host { align-items: flex-end; padding: 0; }
      .card { width: 100%; max-height: 94vh; border-radius: 14px 14px 0 0; }
      .split { grid-template-columns: 80px 1fr; }
      .progress { gap: 4px; }
      .link { width: 100%; }
    }
  `],
})
export class AiKeyGuideComponent implements AfterViewInit {
  @Output() close = new EventEmitter<void>();
  @ViewChild('stepTitle') stepTitle?: ElementRef<HTMLElement>;
  readonly apiKeysUrl = OPENAI_API_KEYS_URL;
  readonly steps: GuideStep[] = [
    { id: 'signin', title: 'Sign in to the OpenAI Platform', url: 'platform.openai.com/login',
      text: 'Open platform.openai.com and log in with your ChatGPT account (or sign up). The API platform uses the same login.' },
    { id: 'billing', title: 'Add billing for API usage', url: 'platform.openai.com/settings/organization/billing',
      text: 'Go to Settings > Billing and add a payment method or prepaid credits. API usage is pay-as-you-go and separate from ChatGPT Plus.' },
    { id: 'keys', title: 'Open the API keys page', url: 'platform.openai.com/api-keys',
      text: 'Choose "API keys" from the dashboard menu, or use the "Open OpenAI API keys page" link below.' },
    { id: 'create', title: 'Create a new secret key', url: 'platform.openai.com/api-keys',
      text: 'Click "+ Create new secret key", give it a name such as "PDF editor", choose your project, and confirm.' },
    { id: 'copy', title: 'Copy the key immediately', url: 'platform.openai.com/api-keys',
      text: 'The key starting with "sk-" is shown only once. Click Copy and keep it somewhere safe, such as a password manager.' },
    { id: 'paste', title: 'Paste it into this AI assistant', url: 'PDF | Anirdeshya - AI writing assistant',
      text: 'Close this guide, keep "OpenAI GPT (primary)" selected, paste the key into "API key", and send your request.' },
  ];
  index = 0;

  get step(): GuideStep { return this.steps[this.index]; }

  ngAfterViewInit(): void {
    this.stepTitle?.nativeElement.focus();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.close.emit();
    } else if (event.key === 'ArrowRight' && !(event.target instanceof HTMLAnchorElement)) {
      this.go(this.index + 1);
    } else if (event.key === 'ArrowLeft') {
      this.go(this.index - 1);
    }
  }

  go(index: number): void {
    if (index < 0 || index >= this.steps.length || index === this.index) return;
    this.index = index;
    queueMicrotask(() => this.stepTitle?.nativeElement.focus());
  }
}
