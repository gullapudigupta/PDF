import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ActionStatusKind = 'progress' | 'success' | 'info' | 'error';

export interface ActionStatus {
  kind: ActionStatusKind;
  message: string;
}

@Component({
  selector: 'app-action-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="status" class="toast" [ngClass]="status.kind"
      [attr.role]="status.kind === 'error' ? 'alert' : 'status'" [attr.aria-live]="status.kind === 'error' ? 'assertive' : 'polite'">
      <span *ngIf="status.kind === 'progress'" class="spinner" aria-hidden="true"></span>
      <span *ngIf="status.kind !== 'progress'" class="icon" aria-hidden="true">{{ icons[status.kind] }}</span>
      <span class="label">{{ labels[status.kind] }}</span>
      <span class="message">{{ status.message }}</span>
      <button *ngIf="status.kind !== 'progress'" type="button" aria-label="Dismiss message" (click)="dismiss.emit()">&times;</button>
    </div>
  `,
  styles: [`
    :host { position: fixed; left: 50%; bottom: 20px; z-index: 950; transform: translateX(-50%); width: min(560px, calc(100vw - 24px)); pointer-events: none; }
    .toast { pointer-events: auto; display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 10px;
      border: 1px solid #cbd5e1; border-left-width: 5px; background: #fff; color: #1f2937; box-shadow: 0 10px 28px rgba(15, 23, 42, .22);
      font-size: 13px; line-height: 1.45; }
    .progress { border-left-color: var(--brand-peacock, #006b63); }
    .success { border-left-color: #15803d; background: #f0fdf4; }
    .info { border-left-color: #64748b; background: #f8fafc; }
    .error { border-left-color: #b42318; background: #fef3f2; }
    .icon { flex: 0 0 auto; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
      color: #fff; font-size: 12px; font-weight: 700; background: #64748b; }
    .success .icon { background: #15803d; }
    .error .icon { background: #b42318; }
    .spinner { flex: 0 0 auto; width: 16px; height: 16px; margin: 2px; border: 3px solid #cfe8e4; border-top-color: var(--brand-peacock, #006b63);
      border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
    .label { flex: 0 0 auto; font-weight: 700; }
    .message { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    button { flex: 0 0 auto; min-width: 28px; min-height: 28px; padding: 0; border: 0; background: transparent; color: inherit; font-size: 18px; line-height: 1; cursor: pointer; }
    button:focus-visible { outline: 3px solid var(--brand-lotus, #b33b65); border-radius: 4px; }
    @media (max-width: 600px) { :host { bottom: 12px; } }
  `],
})
export class ActionStatusComponent {
  @Input() status: ActionStatus | null = null;
  @Output() dismiss = new EventEmitter<void>();
  readonly icons: Record<ActionStatusKind, string> = { progress: '', success: '\u2713', info: 'i', error: '!' };
  readonly labels: Record<ActionStatusKind, string> = { progress: 'Working:', success: 'Done:', info: 'Note:', error: 'Failed:' };
}
