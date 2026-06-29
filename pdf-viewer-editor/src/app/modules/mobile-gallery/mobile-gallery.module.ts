import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '@shared/shared.module';
import { MobileGalleryShellComponent } from './components/mobile-gallery-shell/mobile-gallery-shell.component';

const routes: Routes = [
  {
    path: '',
    component: MobileGalleryShellComponent,
  },
];

@NgModule({
  declarations: [MobileGalleryShellComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class MobileGalleryModule {}
