import { Component } from '@angular/core';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    <div class="app-container">
      <header class="app-header">
        <div class="brand-lockup" aria-label="PDF from Anirdeshya Innovation Private Limited">
          <div class="brand-product"><h1>PDF</h1><span>Viewer &amp; Editor</span></div>
          <p class="company-line">from <strong>Anirdeshya Innovation Private Limited</strong></p>
        </div>
        <nav class="app-nav" aria-label="Application navigation">
          <a *ngIf="showMobileGallery" routerLink="/mobile-gallery" routerLinkActive="active-link">Mobile Gallery</a>
          <a routerLink="/pdf-workspace" routerLinkActive="active-link">PDF Workspace</a>
        </nav>
      </header>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [
    `
      .app-container {
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        min-width: 0;
        overflow: hidden;
      }

      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 20px;
        border-bottom: 3px solid var(--brand-lotus, #b33b65);
        background: #fff;
      }
      .brand-lockup { min-width: 0; }
      .brand-product { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; color: var(--brand-peacock, #006b63); }
      .brand-product h1 { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.15; letter-spacing: -.04em; }
      .brand-product span { font-size: 14px; font-weight: 600; }
      .company-line { margin: 4px 0 0; color: #525e6b; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
      .company-line strong { color: var(--brand-lotus, #b33b65); font-weight: 650; }

      .app-nav {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .app-nav a {
        text-decoration: none;
        color: var(--brand-peacock, #006b63);
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid transparent;
        font-weight: 600;
        font-size: 13px;
      }

      .app-nav a.active-link {
        background: var(--brand-peacock, #006b63);
        color: #fff;
        border-color: var(--brand-peacock, #006b63);
      }
      .app-nav a:focus-visible { outline: 3px solid var(--brand-lotus, #b33b65); outline-offset: 2px; }
      @media (max-width: 700px) {
        .app-header { align-items: flex-start; flex-direction: column; gap: 10px; padding: 10px 14px; }
        .brand-product h1 { font-size: 26px; }
        .company-line { font-size: 12px; }
      }
    `,
  ],
})
export class AppComponent {
  title = 'PDF Viewer & Editor';
  showMobileGallery = environment.runtime !== 'extension';
}
