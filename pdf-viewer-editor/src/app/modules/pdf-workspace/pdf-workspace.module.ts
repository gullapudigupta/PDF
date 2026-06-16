import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { SharedModule } from '@shared/shared.module';
import { PdfWorkspaceComponent } from './components/pdf-workspace/pdf-workspace.component';
import { workspaceReducer } from './store/workspace.reducer';
import { WorkspaceEffects } from './store/workspace.effects';

const routes: Routes = [
  {
    path: '',
    component: PdfWorkspaceComponent,
  },
];

@NgModule({
  declarations: [PdfWorkspaceComponent],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes),
    StoreModule.forFeature('workspace', workspaceReducer),
    EffectsModule.forFeature([WorkspaceEffects]),
  ],
})
export class PdfWorkspaceModule {}
