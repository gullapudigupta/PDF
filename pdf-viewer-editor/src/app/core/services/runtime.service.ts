import { Injectable } from '@angular/core';
import { RuntimeAdapter, DesktopRuntimeAdapter, ExtensionRuntimeAdapter } from '../adapters/runtime.adapter';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RuntimeService implements RuntimeAdapter {
  private adapter: RuntimeAdapter;

  constructor() {
    this.adapter = environment.runtime === 'desktop' 
      ? new DesktopRuntimeAdapter() 
      : new ExtensionRuntimeAdapter();
  }

  openFileDialog(): Promise<{ canceled: boolean; file?: File; fileName?: string }> {
    return this.adapter.openFileDialog();
  }

  saveFileDialog(defaultName: string, data: ArrayBuffer): Promise<{ canceled: boolean; filePath?: string }> {
    return this.adapter.saveFileDialog(defaultName, data);
  }

  readFile(filePath: string): Promise<ArrayBuffer> {
    return this.adapter.readFile(filePath);
  }

  writeFile(filePath: string, data: ArrayBuffer): Promise<void> {
    return this.adapter.writeFile(filePath, data);
  }

  getPlatform(): 'desktop' | 'extension' {
    return this.adapter.getPlatform();
  }

  isDesktop(): boolean {
    return this.getPlatform() === 'desktop';
  }

  isExtension(): boolean {
    return this.getPlatform() === 'extension';
  }
}
