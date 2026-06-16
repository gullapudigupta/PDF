import { Component } from '@angular/core';

@Component({
  selector: 'app-pdf-workspace',
  template: `
    <div class="workspace-container">
      <div class="toolbar">
        <h1>PDF Viewer & Editor</h1>
        <div class="toolbar-actions">
          <button (click)="openFile()">Open PDF</button>
        </div>
      </div>
      <div class="content">
        <div class="viewer-area">
          <p>PDF viewer will be rendered here</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .workspace-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #f5f5f5;
        border-bottom: 1px solid #ddd;
      }

      .toolbar h1 {
        font-size: 18px;
        font-weight: 600;
      }

      .toolbar-actions button {
        padding: 8px 16px;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }

      .toolbar-actions button:hover {
        background: #1565c0;
      }

      .content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .viewer-area {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e0e0e0;
      }
    `,
  ],
})
export class PdfWorkspaceComponent {
  openFile(): void {
    console.log('Open file clicked');
  }
}
