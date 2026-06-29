import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'mobile-gallery',
    pathMatch: 'full',
  },
  {
    path: 'mobile-gallery',
    loadChildren: () =>
      import('./modules/mobile-gallery/mobile-gallery.module').then(m => m.MobileGalleryModule),
  },
  {
    path: 'pdf-workspace',
    loadChildren: () =>
      import('./modules/pdf-workspace/pdf-workspace.module').then(m => m.PdfWorkspaceModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
