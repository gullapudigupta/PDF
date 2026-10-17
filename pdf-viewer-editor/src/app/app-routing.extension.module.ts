import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'pdf-workspace',
    pathMatch: 'full',
  },
  {
    path: 'pdf-workspace',
    loadChildren: () =>
      import('./modules/pdf-workspace/pdf-workspace.module').then(m => m.PdfWorkspaceModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
