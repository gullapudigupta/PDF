import { DesktopRuntimeAdapter, ExtensionRuntimeAdapter } from './runtime.adapter';

describe('ExtensionRuntimeAdapter', () => {
  const extensionGlobal = globalThis as typeof globalThis & {
    chrome?: { runtime?: { sendMessage?: jasmine.Spy } };
    browser?: { runtime?: { sendMessage?: jasmine.Spy } };
  };
  let originalChrome: typeof extensionGlobal.chrome;
  let originalBrowser: typeof extensionGlobal.browser;
  const desktopWindow = window as Window & {
    electronAPI?: {
      openFile: jasmine.Spy;
      saveFile: jasmine.Spy;
      readFile: jasmine.Spy;
      writeFile: jasmine.Spy;
    };
  };
  let originalElectronApi: typeof desktopWindow.electronAPI;

  beforeEach(() => {
    originalChrome = extensionGlobal.chrome;
    originalBrowser = extensionGlobal.browser;
    originalElectronApi = desktopWindow.electronAPI;
    extensionGlobal.chrome = undefined;
    extensionGlobal.browser = undefined;
    delete desktopWindow.electronAPI;
  });

  afterEach(() => {
    if (originalChrome === undefined) {
      delete extensionGlobal.chrome;
    } else {
      extensionGlobal.chrome = originalChrome;
    }
    if (originalBrowser === undefined) {
      delete extensionGlobal.browser;
    } else {
      extensionGlobal.browser = originalBrowser;
    }
    if (originalElectronApi === undefined) {
      delete desktopWindow.electronAPI;
    } else {
      desktopWindow.electronAPI = originalElectronApi;
    }
  });

  function createDesktopApi() {
    return {
      openFile: jasmine.createSpy('openFile').and.resolveTo({ canceled: true }),
      saveFile: jasmine.createSpy('saveFile').and.resolveTo({ canceled: true }),
      readFile: jasmine.createSpy('readFile').and.resolveTo({ success: true, data: '' }),
      writeFile: jasmine.createSpy('writeFile').and.resolveTo({ success: true }),
    };
  }

  it('decodes desktop file selections and preserves cancelled selections', async () => {
    const api = createDesktopApi();
    desktopWindow.electronAPI = api;
    const adapter = new DesktopRuntimeAdapter();

    api.openFile.and.resolveTo({
      canceled: false,
      fileData: btoa(String.fromCharCode(1, 2, 3)),
      fileName: 'opened.pdf',
      filePath: 'C:\\documents\\opened.pdf',
    });
    const result = await adapter.openFileDialog();

    expect(result.canceled).toBeFalse();
    expect(result.fileName).toBe('opened.pdf');
    expect(result.filePath).toBe('C:\\documents\\opened.pdf');
    expect(Array.from(new Uint8Array(await result.file!.arrayBuffer()))).toEqual([1, 2, 3]);

    api.openFile.and.resolveTo({ canceled: true });
    expect(await adapter.openFileDialog()).toEqual({ canceled: true });
  });

  it('encodes desktop saves and reads and writes files with explicit failures', async () => {
    const api = createDesktopApi();
    desktopWindow.electronAPI = api;
    const adapter = new DesktopRuntimeAdapter();
    const bytes = new Uint8Array([4, 5]).buffer;

    api.saveFile.and.resolveTo({ canceled: false, filePath: 'saved.pdf' });
    expect(await adapter.saveFileDialog('saved.pdf', bytes)).toEqual({
      canceled: false,
      filePath: 'saved.pdf',
    });
    expect(api.saveFile).toHaveBeenCalledWith('saved.pdf', 'BAU=', 'application/pdf');

    api.readFile.and.resolveTo({ success: true, data: 'BAU=' });
    expect(Array.from(new Uint8Array(await adapter.readFile('saved.pdf')))).toEqual([4, 5]);
    api.readFile.and.resolveTo({ success: false, error: 'Read denied' });
    await expectAsync(adapter.readFile('saved.pdf')).toBeRejectedWithError('Read denied');

    await adapter.writeFile('saved.pdf', bytes);
    expect(api.writeFile).toHaveBeenCalledWith('saved.pdf', 'BAU=');
    api.writeFile.and.resolveTo({ success: false, error: 'Write denied' });
    await expectAsync(adapter.writeFile('saved.pdf', bytes)).toBeRejectedWithError('Write denied');
  });

  it('sends exported files to the extension download handler', async () => {
    const sendMessage = jasmine.createSpy('sendMessage').and.resolveTo({
      success: true,
      filePath: 'edited.pdf',
    });
    extensionGlobal.browser = { runtime: { sendMessage } };
    const adapter = new ExtensionRuntimeAdapter();

    const result = await adapter.saveFileDialog(
      'edited.pdf',
      new Uint8Array([1, 2, 3]).buffer
    );

    expect(result).toEqual({ canceled: false, filePath: 'edited.pdf' });
    expect(sendMessage).toHaveBeenCalledWith(jasmine.objectContaining({
      type: 'EXT_DOWNLOAD_PDF',
      fileName: 'edited.pdf',
      mimeType: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,AQID',
    }));
  });

  it('opens the extension PDF picker and handles both selection and cancellation', async () => {
    const adapter = new ExtensionRuntimeAdapter();
    const createElement = spyOn(document, 'createElement').and.callThrough();
    spyOn(HTMLInputElement.prototype, 'click').and.stub();

    const selectedPromise = adapter.openFileDialog();
    const selectedInput = createElement.calls.mostRecent().returnValue as HTMLInputElement;
    expect(selectedInput.accept).toBe('application/pdf');
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array([1])], 'selected.pdf', { type: 'application/pdf' }));
    selectedInput.files = transfer.files;
    selectedInput.dispatchEvent(new Event('change'));
    const selected = await selectedPromise;
    expect(selected.fileName).toBe('selected.pdf');
    expect(selected.canceled).toBeFalse();

    const cancelledPromise = adapter.openFileDialog();
    const cancelledInput = createElement.calls.mostRecent().returnValue as HTMLInputElement;
    cancelledInput.dispatchEvent(new Event('cancel'));
    expect(await cancelledPromise).toEqual({ canceled: true });
  });

  it('uses a local browser download fallback when extension messaging is unavailable', async () => {
    const createObjectUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:pdf-export');
    const revokeObjectUrl = spyOn(URL, 'revokeObjectURL');
    const click = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
    const adapter = new ExtensionRuntimeAdapter();
    jasmine.clock().install();
    try {
      expect(await adapter.saveFileDialog('edited.pdf', new Uint8Array([1]).buffer)).toEqual({
        canceled: false,
        filePath: 'edited.pdf',
      });
      expect(createObjectUrl).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      jasmine.clock().tick(1000);
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:pdf-export');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('rejects extension file-system operations and reports its platform', async () => {
    const adapter = new ExtensionRuntimeAdapter();
    expect(adapter.getPlatform()).toBe('extension');
    await expectAsync(adapter.readFile('private.pdf')).toBeRejectedWithError(
      'Direct file system access not supported in extension runtime'
    );
    await expectAsync(adapter.writeFile('private.pdf', new ArrayBuffer(0))).toBeRejectedWithError(
      'Direct file system access not supported in extension runtime'
    );
  });

  it('surfaces extension download failures instead of reporting a fallback success', async () => {
    const sendMessage = jasmine.createSpy('sendMessage').and.resolveTo({
      success: false,
      error: 'Download permission denied',
    });
    extensionGlobal.browser = { runtime: { sendMessage } };
    const adapter = new ExtensionRuntimeAdapter();

    await expectAsync(adapter.saveFileDialog(
      'edited.pdf',
      new Uint8Array([1]).buffer
    )).toBeRejectedWithError('Download permission denied');
  });
});
