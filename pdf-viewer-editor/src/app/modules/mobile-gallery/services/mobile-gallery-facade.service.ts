import { Injectable } from '@angular/core';
import {
  AppRunResult,
  InMemoryAdapter,
  MediaFileMetadata,
  MobileGalleryAppService,
  RuntimeTarget,
} from '@mobile-gallery-view';

@Injectable({
  providedIn: 'root',
})
export class MobileGalleryFacadeService {
  async runSample(runtimeTarget: RuntimeTarget): Promise<AppRunResult> {
    const roots = ['/media/whatsapp', '/media/screenshots', '/media/camera'];

    const mediaByRoot: Record<string, MediaFileMetadata[]> = {
      '/media/whatsapp': [
        this.file('/media/whatsapp/family-1.jpg', 1080, 1920, 420000, 'aa11', 'abcdefgh', 2, 0.9),
        this.file('/media/whatsapp/family-1-copy.jpg', 1080, 1920, 420000, 'aa11', 'abcdxfgh', 2, 0.9),
        this.file('/media/whatsapp/forwarded-poster.jpg', 720, 1280, 180000, 'bb22', 'ijklmnop', 0, 0.7),
      ],
      '/media/screenshots': [
        this.file('/media/screenshots/screenshot-1.png', 1080, 2400, 350000, 'cc33', 'qrstuvwx', 0, 0.95),
        this.file('/media/screenshots/screenshot-2.png', 1080, 2400, 360000, 'dd44', 'qrstuvwy', 0, 0.95),
      ],
      '/media/camera': [
        this.file('/media/camera/trip-1.jpg', 3000, 2000, 2400000, 'ee55', 'yyyyzzzz', 1, 0.95),
        this.file('/media/camera/blurry-night.jpg', 1280, 720, 200000, 'ff66', 'yyyaazzz', 1, 0.65),
      ],
    };

    const textFiles = {
      '/imports/contacts.csv':
        'id,name,group\nfamily,Family Group,home\nscreens,Screens Group,tools\ntrip,Trip Team,friends',
    };

    const adapters: Record<RuntimeTarget, InMemoryAdapter> = {
      web: new InMemoryAdapter('web', mediaByRoot, textFiles),
      mobile: new InMemoryAdapter('mobile', mediaByRoot, textFiles),
      extension: new InMemoryAdapter('extension', mediaByRoot, textFiles),
    };

    const app = new MobileGalleryAppService(adapters);
    return app.run({
      runtimeTarget,
      scan: { rootPaths: roots },
      contactImportFilePath: '/imports/contacts.csv',
    });
  }

  private file(
    path: string,
    width: number,
    height: number,
    fileSize: number,
    hashExact: string,
    hashPerceptual: string,
    faceCount: number,
    compressionRatio: number
  ): MediaFileMetadata {
    return {
      path,
      width,
      height,
      fileSize,
      hashExact,
      hashPerceptual,
      faceCount,
      compressionRatio,
    };
  }
}
