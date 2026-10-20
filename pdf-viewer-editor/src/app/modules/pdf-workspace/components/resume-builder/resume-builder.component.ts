import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RuntimeService } from '@core/services/runtime.service';
import { AiChatService, AiProvider, OPENAI_CHAT_URL } from '../../services/ai-chat.service';
import { ActionStatus, ActionStatusComponent, ActionStatusKind } from '../action-status/action-status.component';
import { AiKeyGuideComponent } from '../ai-chat/ai-key-guide.component';
import { ResumeDraftService } from './resume-draft.service';
import { ResumePdfService } from './resume-pdf.service';
import {
  RESUME_WRITER_PROMPT,
  ResumeAiTarget,
  buildResumeSectionMessages,
  cleanAiSectionText,
  resumeSectionLabel,
} from './resume-ai';
import {
  RESUME_TEMPLATES,
  ResumeCheck,
  ResumeData,
  ResumeEducation,
  ResumeExperience,
  ResumePageSize,
  ResumeTemplateId,
  bulletLines,
  contactLine,
  dateRange,
  emptyEducation,
  emptyExperience,
  emptyResume,
  joinParts,
  resumeChecklist,
  resumeTemplate,
} from './resume.model';

interface AiSuggestion {
  target: ResumeAiTarget;
  label: string;
  text: string;
}

const AI_TIMEOUT_MS = 60_000;

@Component({
  selector: 'app-resume-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionStatusComponent, AiKeyGuideComponent],
  templateUrl: './resume-builder.component.html',
  styleUrls: ['./resume-builder.component.scss'],
})
export class ResumeBuilderComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() openPdf = new EventEmitter<File>();
  @ViewChild('dialog', { static: true }) dialog?: ElementRef<HTMLElement>;
  @ViewChild('keyGuideButton') keyGuideButton?: ElementRef<HTMLButtonElement>;

  readonly templates = RESUME_TEMPLATES;
  readonly bulletLines = bulletLines;
  readonly dateRange = dateRange;
  readonly joinParts = joinParts;
  readonly contactLine = contactLine;
  readonly openAiUrl = OPENAI_CHAT_URL;

  mobileView: 'edit' | 'preview' = 'edit';
  aiPanelOpen = false;
  provider: AiProvider = 'openai';
  endpoint = '';
  apiKey = '';
  model = 'gpt-4o-mini';
  consent = false;
  aiInstructions = '';
  aiBusyTarget: ResumeAiTarget | null = null;
  aiError = '';
  suggestion: AiSuggestion | null = null;
  keyGuideOpen = false;
  exporting = false;
  status: ActionStatus | null = null;
  private controller: AbortController | null = null;
  private statusTimer: ReturnType<typeof setTimeout> | null = null;
  private previousFocus: HTMLElement | null = null;

  constructor(
    private draft: ResumeDraftService,
    private pdfService: ResumePdfService,
    private ai: AiChatService,
    private runtime: RuntimeService,
    private cdr: ChangeDetectorRef
  ) {}

  get data(): ResumeData {
    return this.draft.data;
  }

  get template(): ResumeTemplateId {
    return this.draft.template;
  }

  set template(value: ResumeTemplateId) {
    this.draft.template = value;
  }

  get pageSize(): ResumePageSize {
    return this.draft.pageSize;
  }

  set pageSize(value: ResumePageSize) {
    this.draft.pageSize = value;
  }

  get templateInfo() {
    return resumeTemplate(this.template);
  }

  get checks(): ResumeCheck[] {
    return resumeChecklist(this.data);
  }

  get passedChecks(): number {
    return this.checks.filter(check => check.passed).length;
  }

  get aiReady(): boolean {
    return !!this.apiKey.trim() && !!this.model.trim() && (this.provider === 'openai' || !!this.endpoint.trim()) && this.consent;
  }

  ngOnInit(): void {
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setTimeout(() => this.dialog?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.abortAi();
    this.apiKey = '';
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.previousFocus?.focus?.();
  }

  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (this.keyGuideOpen) return;
    event.preventDefault();
    if (this.suggestion) {
      this.discardSuggestion();
      return;
    }
    this.requestClose();
  }

  requestClose(): void {
    this.abortAi();
    this.close.emit();
  }

  private abortAi(): void {
    const controller = this.controller;
    this.controller = null;
    this.aiBusyTarget = null;
    controller?.abort();
  }

  selectTemplate(id: ResumeTemplateId): void {
    this.template = id;
  }

  addExperience(): void {
    this.data.experience.push(emptyExperience());
  }

  addEducation(): void {
    this.data.education.push(emptyEducation());
  }

  addProject(): void {
    this.data.projects.push({ name: '', details: '' });
  }

  removeEntry<T>(list: T[], index: number): void {
    list.splice(index, 1);
    if (this.suggestion?.target.index !== undefined) this.suggestion = null;
  }

  moveEntry<T>(list: T[], index: number, offset: -1 | 1): void {
    const target = index + offset;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    if (this.suggestion?.target.index !== undefined) this.suggestion = null;
  }

  trackIndex(index: number): number {
    return index;
  }

  loadExample(): void {
    if (this.hasContent() && !window.confirm('Replace your current resume draft with the example?')) return;
    this.draft.data = exampleResume();
    this.setStatus('info', 'Example resume loaded. Replace every detail with your own information.');
  }

  clearDraft(): void {
    if (this.hasContent() && !window.confirm('Clear the whole resume draft? This cannot be undone.')) return;
    this.draft.reset();
    this.suggestion = null;
    this.setStatus('info', 'Resume draft cleared.');
  }

  changeProvider(provider: AiProvider): void {
    this.abortAi();
    this.provider = provider;
    this.apiKey = '';
    this.consent = false;
    this.model = provider === 'openai' ? 'gpt-4o-mini' : '';
  }

  clearKey(): void {
    this.abortAi();
    this.apiKey = '';
    this.consent = false;
    this.setStatus('info', 'API key cleared from memory.');
  }

  closeKeyGuide(): void {
    this.keyGuideOpen = false;
    this.cdr.markForCheck();
    setTimeout(() => this.keyGuideButton?.nativeElement.focus());
  }

  isAiBusy(target: ResumeAiTarget): boolean {
    return !!this.aiBusyTarget && this.aiBusyTarget.section === target.section && this.aiBusyTarget.index === target.index;
  }

  isSuggestionFor(section: ResumeAiTarget['section'], index?: number): boolean {
    return !!this.suggestion && this.suggestion.target.section === section && this.suggestion.target.index === index;
  }

  async draftWithAi(target: ResumeAiTarget): Promise<void> {
    if (this.aiBusyTarget) {
      this.setStatus('info', 'Please wait for the current AI draft to finish or cancel it.');
      return;
    }
    if (!this.aiReady) {
      this.aiPanelOpen = true;
      this.aiError = 'Set up AI drafting first: enter your API key and model, then confirm you agree to send your resume text to the provider.';
      this.cdr.markForCheck();
      return;
    }
    const label = resumeSectionLabel(target, this.data);
    this.aiError = '';
    this.suggestion = null;
    this.aiBusyTarget = target;
    this.controller = new AbortController();
    const controller = this.controller;
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    this.setStatus('progress', `Drafting "${label}" with AI...`);
    try {
      const reply = await this.ai.complete(
        { provider: this.provider, endpoint: this.endpoint, apiKey: this.apiKey, model: this.model },
        buildResumeSectionMessages(target, this.data, this.aiInstructions),
        controller.signal,
        RESUME_WRITER_PROMPT
      );
      if (controller !== this.controller) return;
      this.suggestion = { target, label, text: cleanAiSectionText(reply, target.section) };
      this.setStatus('success', `AI suggestion ready for "${label}". Review it, then choose Replace, Add below, or Discard.`);
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      if (aborted) {
        if (this.controller === controller) this.setStatus('error', 'AI request timed out after 60 seconds. Nothing was changed; try again.');
      } else {
        this.aiError = error instanceof Error ? error.message : 'AI request failed. Check your provider settings and retry.';
        this.setStatus('error', `AI drafting failed: ${this.aiError}`);
      }
    } finally {
      clearTimeout(timeout);
      if (this.controller === controller) {
        this.controller = null;
        this.aiBusyTarget = null;
      }
      this.cdr.markForCheck();
    }
  }

  cancelAi(): void {
    this.abortAi();
    this.setStatus('info', 'AI request cancelled. Nothing was changed.');
  }

  applySuggestion(mode: 'replace' | 'append'): void {
    const suggestion = this.suggestion;
    if (!suggestion) return;
    const index = suggestion.target.index ?? 0;
    const merge = (current: string) => mode === 'append' && current.trim() ? `${current.trimEnd()}\n${suggestion.text}` : suggestion.text;
    switch (suggestion.target.section) {
      case 'summary': this.data.summary = merge(this.data.summary); break;
      case 'skills': this.data.skills = merge(this.data.skills); break;
      case 'certifications': this.data.certifications = merge(this.data.certifications); break;
      case 'experience': if (this.data.experience[index]) this.data.experience[index].bullets = merge(this.data.experience[index].bullets); break;
      case 'education': if (this.data.education[index]) this.data.education[index].details = merge(this.data.education[index].details); break;
      case 'projects': if (this.data.projects[index]) this.data.projects[index].details = merge(this.data.projects[index].details); break;
    }
    this.suggestion = null;
    this.setStatus('success', `${suggestion.label} updated. Check facts and replace any [placeholders] before exporting.`);
  }

  discardSuggestion(): void {
    this.suggestion = null;
    this.setStatus('info', 'AI suggestion discarded.');
  }

  async downloadPdf(): Promise<void> {
    const name = this.fileName();
    await this.exportPdf('Creating resume PDF...', async bytes => {
      this.setStatus('progress', `Choose where to save ${name}...`);
      const data = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(data).set(bytes);
      const result = await this.runtime.saveFileDialog(name, data, 'application/pdf');
      if (result?.canceled) return null;
      const saved = result?.filePath?.split(/[\\/]/).pop() || name;
      return `Resume saved as ${saved}.`;
    });
  }

  async openInEditor(): Promise<void> {
    const name = this.fileName();
    await this.exportPdf('Creating resume PDF for the editor...', async bytes => {
      this.openPdf.emit(new File([bytes as BlobPart], name, { type: 'application/pdf' }));
      return `${name} opened in a new editor tab.`;
    });
  }

  fileName(): string {
    const base = (this.data.contact.name.trim() || 'Resume').replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-');
    return `${base || 'Resume'}${base.toLowerCase().endsWith('resume') ? '' : '-Resume'}.pdf`;
  }

  private async exportPdf(progress: string, finish: (bytes: Uint8Array) => Promise<string | null>): Promise<void> {
    if (this.exporting) return;
    if (!this.data.contact.name.trim()) {
      this.setStatus('error', 'Add your full name in Contact details before exporting.');
      return;
    }
    this.exporting = true;
    this.setStatus('progress', progress);
    try {
      const bytes = await this.pdfService.render(this.data, this.template, this.pageSize);
      const message = await finish(bytes);
      if (message === null) this.setStatus('info', 'Save cancelled. Your resume draft is still open.');
      else this.setStatus('success', message);
    } catch (error) {
      this.setStatus('error', `Unable to create resume PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.exporting = false;
      this.cdr.markForCheck();
    }
  }

  setStatus(kind: ActionStatusKind, message: string): void {
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = null;
    this.status = { kind, message };
    if (kind === 'success' || kind === 'info') {
      this.statusTimer = setTimeout(() => {
        this.status = null;
        this.statusTimer = null;
        this.cdr.markForCheck();
      }, 6000);
    }
    this.cdr.markForCheck();
  }

  dismissStatus(): void {
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = null;
    this.status = null;
  }

  skillLines(): { label: string; items: string }[] {
    return this.data.skills.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      const match = /^([^:]{1,40}):\s*(.+)$/.exec(line);
      return match ? { label: match[1], items: match[2] } : { label: '', items: line };
    });
  }

  hasExperience(item: ResumeExperience): boolean {
    return !!(item.title.trim() || item.company.trim() || item.bullets.trim());
  }

  hasEducation(item: ResumeEducation): boolean {
    return !!(item.degree.trim() || item.school.trim());
  }

  detailLines(text: string): string[] {
    return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  }

  private hasContent(): boolean {
    return JSON.stringify(this.data) !== JSON.stringify(emptyResume());
  }
}

function exampleResume(): ResumeData {
  return {
    targetRole: 'Senior Software Engineer',
    jobDescription: '',
    contact: {
      name: 'Priya Sharma',
      headline: 'Senior Software Engineer | Cloud & Distributed Systems',
      email: 'priya.sharma@example.com',
      phone: '+91 98765 43210',
      location: 'Hyderabad, India',
      links: 'linkedin.com/in/priyasharma, github.com/priyasharma',
    },
    summary: 'Senior software engineer with 7 years of experience building scalable cloud services and data platforms. Skilled in TypeScript, Java and AWS, with a track record of cutting latency, improving reliability and mentoring engineers. Led a platform migration that reduced infrastructure costs by 32% while supporting 3x traffic growth.',
    experience: [
      {
        title: 'Senior Software Engineer', company: 'Example Tech Pvt Ltd', location: 'Hyderabad', start: 'Jan 2021', end: 'Present',
        bullets: '- Lead a team of 5 engineers delivering a payments API that processes 2M+ transactions per day at 99.95% uptime\n- Reduce p95 API latency by 45% by introducing caching and query optimisation\n- Mentor 4 junior engineers through code reviews and design sessions; 2 promoted within a year',
      },
      {
        title: 'Software Engineer', company: 'Sample Solutions', location: 'Bengaluru', start: 'Jul 2017', end: 'Dec 2020',
        bullets: '- Built 12 microservices in Java and Spring Boot supporting a customer portal with 500K users\n- Automated CI/CD pipelines, cutting release time from 2 days to 3 hours\n- Migrated legacy reporting to AWS, saving [X] in annual hosting costs',
      },
    ],
    education: [
      { degree: 'B.Tech, Computer Science', school: 'Example Institute of Technology', location: 'Hyderabad', start: '2013', end: '2017', details: 'First class with distinction; final-year project on distributed caching' },
    ],
    skills: 'Languages: TypeScript, Java, Python, SQL\nCloud & DevOps: AWS, Docker, Kubernetes, Terraform, GitHub Actions\nFrameworks: Angular, Node.js, Spring Boot',
    certifications: 'AWS Certified Solutions Architect - Associate, Amazon Web Services, 2022',
    projects: [],
  };
}
