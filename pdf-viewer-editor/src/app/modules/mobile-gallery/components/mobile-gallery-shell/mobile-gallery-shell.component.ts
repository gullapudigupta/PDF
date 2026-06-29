import { Component } from '@angular/core';
import { AppRunResult, RuntimeTarget } from '@mobile-gallery-view';

import { MobileGalleryFacadeService } from '../../services/mobile-gallery-facade.service';

@Component({
  selector: 'app-mobile-gallery-shell',
  standalone: false,
  template: `
    <div class="gallery-shell">
      <header class="hero">
        <h1>Mobile Gallery Cleaner</h1>
        <p>Run a full sample scan, review, and cleanup flow inside the Angular app shell.</p>
      </header>

      <section class="controls">
        <label for="runtime">Runtime</label>
        <select id="runtime" [(ngModel)]="runtimeTarget">
          <option value="mobile">mobile</option>
          <option value="web">web</option>
          <option value="extension">extension</option>
        </select>
        <button (click)="runFlow()" [disabled]="running">{{ running ? 'Running...' : 'Run Sample Flow' }}</button>
      </section>

      <section class="cards" *ngIf="result">
        <article class="card" *ngFor="let card of result.viewModel.summaryCards">
          <h3>{{ card.label }}</h3>
          <p>{{ card.value }}</p>
        </article>
      </section>

      <section class="split" *ngIf="result">
        <article class="panel">
          <h2>Groups First</h2>
          <ul>
            <li *ngFor="let group of result.viewModel.groupRows">
              <strong>{{ group.name }}</strong>
              <span>{{ group.mediaCount }} items</span>
              <span>{{ group.totalSizeMb }} MB</span>
            </li>
          </ul>
        </article>

        <article class="panel">
          <h2>Contacts</h2>
          <ul>
            <li *ngFor="let contact of result.viewModel.contactRows">
              <strong>{{ contact.name }}</strong>
              <span>{{ contact.mediaCount }} items</span>
              <span>{{ contact.totalSizeMb }} MB</span>
            </li>
          </ul>
        </article>
      </section>

      <section class="panel" *ngIf="result">
        <h2>Decision and Safety</h2>
        <p>Dry-run candidates: {{ result.dryRun.totalCandidates }}</p>
        <p>Estimated savings: {{ result.dryRun.estimatedSavingsMb }} MB</p>
        <p>Undo expires: {{ result.undoTicket.expiresAt }}</p>
        <p>Top reasons: {{ result.viewModel.decisionPanel.topReasons.join(', ') }}</p>
      </section>

      <section class="panel" *ngIf="result">
        <h2>Runtime Validation</h2>
        <ul>
          <li *ngFor="let item of result.runtimeValidation">
            <strong>{{ item.target }}</strong>
            <span [class.ok]="item.isValid" [class.bad]="!item.isValid">{{ item.isValid ? 'valid' : 'invalid' }}</span>
          </li>
        </ul>
      </section>

      <section class="panel error" *ngIf="errorMessage">
        {{ errorMessage }}
      </section>
    </div>
  `,
  styles: [
    `
      .gallery-shell {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
        height: 100%;
        overflow: auto;
        background: linear-gradient(160deg, #f8fbff 0%, #eef6f7 50%, #fdf6ef 100%);
      }

      .hero h1 {
        font-size: 24px;
        margin-bottom: 6px;
      }

      .hero p {
        color: #32506d;
      }

      .controls {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      select,
      button {
        border: 1px solid #9eb7c7;
        border-radius: 10px;
        padding: 8px 12px;
        background: #fff;
      }

      button {
        background: #0f5e76;
        color: #fff;
        border-color: #0f5e76;
      }

      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
      }

      .card,
      .panel {
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid #dbe8ef;
        border-radius: 14px;
        padding: 14px;
      }

      .card p {
        font-size: 24px;
        font-weight: 700;
      }

      .split {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 10px;
      }

      ul {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 0;
      }

      li {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        border-bottom: 1px solid #edf3f6;
        padding-bottom: 8px;
      }

      .ok {
        color: #0f7a35;
      }

      .bad {
        color: #b42318;
      }

      .error {
        border-color: #f7c4c4;
        color: #9b1c1c;
      }

      @media (max-width: 680px) {
        .gallery-shell {
          padding: 12px;
        }

        .hero h1 {
          font-size: 20px;
        }
      }
    `,
  ],
})
export class MobileGalleryShellComponent {
  runtimeTarget: RuntimeTarget = 'mobile';
  result: AppRunResult | null = null;
  running = false;
  errorMessage = '';

  constructor(private readonly facade: MobileGalleryFacadeService) {}

  async runFlow(): Promise<void> {
    this.running = true;
    this.errorMessage = '';
    try {
      this.result = await this.facade.runSample(this.runtimeTarget);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Unexpected gallery runtime error';
    } finally {
      this.running = false;
    }
  }
}
