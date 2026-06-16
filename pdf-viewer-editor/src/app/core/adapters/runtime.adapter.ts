export interface RuntimeAdapter {
  openFileDialog(): Promise<{ canceled: boolean; file?: File; fileName?: string }>;
  saveFileDialog(defaultName: string, data: ArrayBuffer): Promise<{ canceled: boolean; filePath?: string }>;
  readFile(filePath: string): Promise<ArrayBuffer>;
  writeFile(filePath: string, data: ArrayBuffer): Promise<void>;
  getPlatform(): 'desktop' | 'extension';
}

export class DesktopRuntimeAdapter implements RuntimeAdapter {
  async openFileDialog(): Promise<{ canceled: boolean; file?: File; fileName?: string }> {
    const result = await (window as any).electronAPI.openFile();
    
    if (result.canceled) {
      return { canceled: true };
    }

    const uint8Array = Uint8Array.from(atob(result.fileData), c => c.charCodeAt(0));
    const file = new File([uint8Array], result.fileName, { type: 'application/pdf' });
    
    return { canceled: false, file, fileName: result.fileName };
  }

  async saveFileDialog(defaultName: string, data: ArrayBuffer): Promise<{ canceled: boolean; filePath?: string }> {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    const result = await (window as any).electronAPI.saveFile(defaultName, base64);
    
    return result;
  }

  async readFile(filePath: string): Promise<ArrayBuffer> {
    const result = await (window as any).electronAPI.readFile(filePath);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    const uint8Array = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
    return uint8Array.buffer;
  }

  async writeFile(filePath: string, data: ArrayBuffer): Promise<void> {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    const result = await (window as any).electronAPI.writeFile(filePath, base64);
    
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  getPlatform(): 'desktop' {
    return 'desktop';
  }
}

export class ExtensionRuntimeAdapter implements RuntimeAdapter {
  async openFileDialog(): Promise<{ canceled: boolean; file?: File; fileName?: string }> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          resolve({ canceled: false, file, fileName: file.name });
        } else {
          resolve({ canceled: true });
        }
      };
      
      input.oncancel = () => {
        resolve({ canceled: true });
      };
      
      input.click();
    });
  }

  async saveFileDialog(defaultName: string, data: ArrayBuffer): Promise<{ canceled: boolean; filePath?: string }> {
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    
    URL.revokeObjectURL(url);
    
    return { canceled: false, filePath: defaultName };
  }

  async readFile(filePath: string): Promise<ArrayBuffer> {
    throw new Error('Direct file system access not supported in extension runtime');
  }

  async writeFile(filePath: string, data: ArrayBuffer): Promise<void> {
    throw new Error('Direct file system access not supported in extension runtime');
  }

  getPlatform(): 'extension' {
    return 'extension';
  }
}
