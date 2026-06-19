import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    <div class="app-container">
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
    `,
  ],
})
export class AppComponent {
  title = 'PDF Viewer & Editor';
}
