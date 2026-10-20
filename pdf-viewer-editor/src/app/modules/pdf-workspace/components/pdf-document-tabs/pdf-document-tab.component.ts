import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { OpenedPdfFile } from '@core/adapters/runtime.adapter';
import { AnnotationService } from '../../services/annotation.service';
import { HistoryService } from '../../services/history.service';
import { PdfDocumentService } from '../../services/pdf-document.service';
import { PdfWorkspaceComponent, WorkspaceOpenRequest } from '../pdf-workspace/pdf-workspace.component';

@Component({
  selector: 'app-pdf-document-tab',
  standalone: false,
  providers: [PdfDocumentService, AnnotationService, HistoryService],
  template: `
    <app-pdf-workspace [tabManaged]="true" [workspaceId]="tabId" [commandTemplate]="commandTemplate"
      [active]="active" [initialFile]="file"
      (openRequested)="openRequested.emit($event)" (closeRequested)="closeRequested.emit()"></app-pdf-workspace>
  `,
  styles: [':host { display: flex; flex: 1; min-height: 0; min-width: 0; }'],
})
export class PdfDocumentTabComponent {
  @Input() tabId = '';
  @Input() active = true;
  @Input() file: OpenedPdfFile | null = null;
  @Input() commandTemplate: TemplateRef<unknown> | null = null;
  @Output() openRequested = new EventEmitter<WorkspaceOpenRequest>();
  @Output() closeRequested = new EventEmitter<void>();
  @ViewChild(PdfWorkspaceComponent) workspace?: PdfWorkspaceComponent;

  async close(): Promise<boolean> {
    if (!this.workspace) throw new Error('Document workspace is not ready. Try again.');
    if (this.workspace.loading) throw new Error('Wait for the PDF to finish loading or cancel its password prompt before closing it.');
    await this.workspace.closeDocument(true);
    return this.workspace.document === null;
  }
}
