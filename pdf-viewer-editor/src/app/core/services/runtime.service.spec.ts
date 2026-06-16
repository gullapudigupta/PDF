import { RuntimeService } from './runtime.service';

describe('RuntimeService', () => {
  let service: RuntimeService;

  beforeEach(() => {
    service = new RuntimeService();
  });

  it('reports desktop and extension using adapter platform', () => {
    (service as any).adapter = {
      getPlatform: () => 'desktop',
    };
    expect(service.isDesktop()).toBeTrue();
    expect(service.isExtension()).toBeFalse();

    (service as any).adapter = {
      getPlatform: () => 'extension',
    };
    expect(service.isDesktop()).toBeFalse();
    expect(service.isExtension()).toBeTrue();
  });

  it('delegates open and save dialog calls to adapter', async () => {
    const adapter = {
      openFileDialog: jasmine.createSpy().and.resolveTo({ canceled: false, fileName: 'a.pdf' }),
      saveFileDialog: jasmine.createSpy().and.resolveTo({ canceled: false, filePath: 'a.pdf' }),
      readFile: jasmine.createSpy(),
      writeFile: jasmine.createSpy(),
      getPlatform: jasmine.createSpy().and.returnValue('desktop'),
    };

    (service as any).adapter = adapter;

    const openResult = await service.openFileDialog();
    const saveResult = await service.saveFileDialog('a.pdf', new Uint8Array([1]).buffer);

    expect(adapter.openFileDialog).toHaveBeenCalled();
    expect(adapter.saveFileDialog).toHaveBeenCalled();
    expect(openResult.fileName).toBe('a.pdf');
    expect(saveResult.filePath).toBe('a.pdf');
  });
});
