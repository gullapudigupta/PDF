import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    <div class="app-container">
      <nav class="app-nav">
        <a routerLink="/mobile-gallery" routerLinkActive="active-link">Mobile Gallery</a>
        <a routerLink="/pdf-workspace" routerLinkActive="active-link">PDF Workspace</a>
      </nav>
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
      }

      .app-nav {
        display: flex;
        gap: 8px;
        padding: 8px 12px;
        border-bottom: 1px solid #d9e2e8;
        background: #f4f8fb;
      }

      .app-nav a {
        text-decoration: none;
        color: #0f4f6a;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid transparent;
      }

      .app-nav a.active-link {
        background: #0f5e76;
        color: #fff;
        border-color: #0f5e76;
      }
    `,
  ],
})
export class AppComponent {
  title = 'PDF Viewer & Editor';
}
