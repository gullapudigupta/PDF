export interface RuntimeAdapter {
  openFileDialog(): Promise<{ canceled: boolean; file?: File; fileName?: string; filePath?: string }>;
  saveFileDialog(
    defaultName: string,
    data: ArrayBuffer,
    mimeType?: 'application/pdf' | 'application/json' | 'image/png' | 'image/jpeg' | 'image/svg+xml'
  ): Promise<{ canceled: boolean; filePath?: string }>;
  readFile(filePath: string): Promise<ArrayBuffer>;
  writeFile(filePath: string, data: ArrayBuffer): Promise<void>;
  getPlatform(): 'desktop' | 'extension';
}

interface ExtensionMessageResponse {
  success?: boolean;
  error?: string;
  filePath?: string;
}

interface ExtensionMessagingApi {
  runtime?: {
    sendMessage?: (message: object) => Promise<ExtensionMessageResponse | undefined>;
  };
}

function arrayBufferToBase64(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export class DesktopRuntimeAdapter implements RuntimeAdapter {
  async openFileDialog(): Promise<{ canceled: boolean; file?: File; fileName?: string; filePath?: string }> {
    const result = await (window as any).electronAPI.openFile();
    
    if (result.canceled) {
      return { canceled: true };
    }

    const uint8Array = Uint8Array.from(atob(result.fileData), c => c.charCodeAt(0));
    const file = new File([uint8Array], result.fileName, { type: 'application/pdf' });
    
    return { canceled: false, file, fileName: result.fileName, filePath: result.filePath };
  }

  async saveFileDialog(
    defaultName: string,
    data: ArrayBuffer,
    mimeType: 'application/pdf' | 'application/json' | 'image/png' | 'image/jpeg' | 'image/svg+xml' = 'application/pdf'
  ): Promise<{ canceled: boolean; filePath?: string }> {
    const base64 = arrayBufferToBase64(data);
    const result = await (window as any).electronAPI.saveFile(defaultName, base64, mimeType);
    
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
    const base64 = arrayBufferToBase64(data);
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
  async openFileDialog(): Promise<{ canceled: boolean; file?: File; fileName?: string; filePath?: string }> {
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

  async saveFileDialog(
    defaultName: string,
    data: ArrayBuffer,
    mimeType: 'application/pdf' | 'application/json' | 'image/png' | 'image/jpeg' | 'image/svg+xml' = 'application/pdf'
  ): Promise<{ canceled: boolean; filePath?: string }> {
    const extensionGlobal = globalThis as typeof globalThis & {
      chrome?: ExtensionMessagingApi;
      browser?: ExtensionMessagingApi;
    };
    const extensionApi = extensionGlobal.browser ?? extensionGlobal.chrome;

    if (extensionApi?.runtime?.sendMessage) {
      const payload = {
        type: mimeType === 'application/pdf' ? 'EXT_DOWNLOAD_PDF' : 'EXT_DOWNLOAD_FILE',
        fileName: defaultName,
        mimeType,
        dataUrl: `data:${mimeType};base64,${arrayBufferToBase64(data)}`,
      };

      const response = await extensionApi.runtime.sendMessage(payload);
      if (!response?.success) {
        throw new Error(response?.error ?? 'The browser extension could not start the download.');
      }
      return { canceled: false, filePath: response.filePath ?? defaultName };
    }

    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

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
