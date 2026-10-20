import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { SharedModule } from '@shared/shared.module';
import { PdfWorkspaceComponent } from './components/pdf-workspace/pdf-workspace.component';
import { workspaceReducer } from './store/workspace.reducer';
import { WorkspaceEffects } from './store/workspace.effects';
import { AiChatComponent } from './components/ai-chat/ai-chat.component';
import { PdfDocumentTabsComponent } from './components/pdf-document-tabs/pdf-document-tabs.component';
import { PdfDocumentTabComponent } from './components/pdf-document-tabs/pdf-document-tab.component';
import { PdfMetadataDialogComponent } from './components/pdf-dialogs/pdf-metadata-dialog.component';
import { PdfProtectDialogComponent } from './components/pdf-dialogs/pdf-protect-dialog.component';
import { ActionStatusComponent } from './components/action-status/action-status.component';
import { ResumeBuilderComponent } from './components/resume-builder/resume-builder.component';

const routes: Routes = [
  {
    path: '',
    component: PdfDocumentTabsComponent,
  },
];

@NgModule({
  declarations: [PdfWorkspaceComponent, PdfDocumentTabsComponent, PdfDocumentTabComponent],
  imports: [
    CommonModule,
    SharedModule,
    AiChatComponent,
    PdfMetadataDialogComponent,
    PdfProtectDialogComponent,
    ActionStatusComponent,
    ResumeBuilderComponent,
    RouterModule.forChild(routes),
    StoreModule.forFeature('workspace', workspaceReducer),
    EffectsModule.forFeature([WorkspaceEffects]),
  ],
})
export class PdfWorkspaceModule {}
