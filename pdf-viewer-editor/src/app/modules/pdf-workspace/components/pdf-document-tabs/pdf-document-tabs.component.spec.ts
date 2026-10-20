import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PDFDocument } from 'pdf-lib';
import { OpenedPdfFile } from '@core/adapters/runtime.adapter';
import { RuntimeService } from '@core/services/runtime.service';
import { AnnotationService } from '../../services/annotation.service';
import { HistoryService } from '../../services/history.service';
import { PdfDocumentService } from '../../services/pdf-document.service';
import { PdfDocumentTabComponent } from './pdf-document-tab.component';
import { PdfDocumentTabsComponent } from './pdf-document-tabs.component';
import { ResumeBuilderComponent } from '../resume-builder/resume-builder.component';

describe('PdfDocumentTabsComponent', () => {
  let fixture: ComponentFixture<PdfDocumentTabsComponent>;
  let component: PdfDocumentTabsComponent;
  let runtime: jasmine.SpyObj<RuntimeService>;
  const files: OpenedPdfFile[] = [
    { file: new File(['first'], 'one.pdf', { lastModified: 1 }) },
    { file: new File(['second'], 'two.pdf', { lastModified: 2 }) },
  ];

  beforeEach(async () => {
    runtime = jasmine.createSpyObj<RuntimeService>('RuntimeService', [
      'openFileDialog', 'openMultipleFileDialog', 'isDesktop', 'readFile',
    ]);
    runtime.openFileDialog.and.resolveTo({ canceled: false, file: files[0].file });
    runtime.openMultipleFileDialog.and.resolveTo({ canceled: false, files });
    runtime.isDesktop.and.returnValue(false);
    await TestBed.configureTestingModule({
      declarations: [PdfDocumentTabsComponent, PdfDocumentTabComponent],
      imports: [CommonModule, ResumeBuilderComponent],
      providers: [{ provide: RuntimeService, useValue: runtime }],
    }).overrideComponent(PdfDocumentTabComponent, { set: { template: '<ng-container *ngTemplateOutlet="commandTemplate"></ng-container><div>Workspace retained here</div>' } }).compileComponents();
    fixture = TestBed.createComponent(PdfDocumentTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens the resume builder from the top bar and opens an exported resume as a new tab', () => {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(item => item.textContent?.trim() === 'Resume builder') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-resume-builder')).not.toBeNull();
    component.openResume(new File(['%PDF'], 'Priya-Sharma-Resume.pdf', { type: 'application/pdf' }));
    fixture.detectChanges();
    expect(component.tabs.some(tab => tab.file?.file.name === 'Priya-Sharma-Resume.pdf')).toBeTrue();
    expect(component.resumeBuilderOpen).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-resume-builder')).toBeNull();
  });

  it('loads the Image to text window only when requested and closes it again', async () => {
    expect(fixture.nativeElement.querySelector('app-ocr-window')).toBeNull();
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(item => item.textContent?.trim() === 'Image to text') as HTMLButtonElement;
    expect(button).toBeTruthy();
    await component.openOcr();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-ocr-window')).not.toBeNull();
    await component.openOcr();
    expect(fixture.nativeElement.querySelectorAll('app-ocr-window').length).toBe(1);
    component.closeOcr();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-ocr-window')).toBeNull();

    const workspace = { document: {}, canInsertText: true, addTextObjectWithText: jasmine.createSpy('add').and.returnValue(null), renderCurrentPageForOcr: jasmine.createSpy('render') };
    Object.defineProperty(component, 'activeWorkspace', { get: () => workspace });
    await component.openOcr();
    fixture.detectChanges();
    const ocr = fixture.debugElement.query(By.css('app-ocr-window')).componentInstance;
    expect(ocr.canAddToPdf).toBeTrue();
    expect(ocr.pageSource).toEqual(jasmine.any(Function));
    ocr.addToPdf.emit('Scanned text');
    fixture.detectChanges();
    expect(workspace.addTextObjectWithText).toHaveBeenCalledWith('Scanned text');
    expect(fixture.nativeElement.querySelector('app-ocr-window')).toBeNull();

    workspace.addTextObjectWithText.and.returnValue('Switch to Single page view to add text.');
    await component.openOcr();
    fixture.detectChanges();
    const again = fixture.debugElement.query(By.css('app-ocr-window')).componentInstance;
    again.addToPdf.emit('Scanned text');
    expect(again.error).toBe('Switch to Single page view to add text.');
    component.closeOcr();
  });

  it('opens multiple PDFs separately and selects an already-open file without duplicating it', async () => {
    await component.openDocuments({ multiple: true });
    fixture.detectChanges();
    expect(component.tabs.map(tab => tab.file?.file.name)).toEqual(['one.pdf', 'two.pdf']);
    expect(component.activeId).toBe(component.tabs[1].id);
    await component.openDocuments({ multiple: false });
    expect(component.tabs.length).toBe(2);
    expect(component.activeId).toBe(component.tabs[0].id);
  });

  it('retains host instances while switching and scopes document/annotation/history services independently', async () => {
    await component.openDocuments({ multiple: true });
    fixture.detectChanges();
    const hosts = fixture.debugElement.queryAll(By.directive(PdfDocumentTabComponent));
    const first = hosts[0].componentInstance;
    expect(hosts[0].injector.get(PdfDocumentService)).not.toBe(hosts[1].injector.get(PdfDocumentService));
    expect(hosts[0].injector.get(AnnotationService)).not.toBe(hosts[1].injector.get(AnnotationService));
    expect(hosts[0].injector.get(HistoryService)).not.toBe(hosts[1].injector.get(HistoryService));
    const history = hosts[0].injector.get(HistoryService);
    history.capture(['unsaved text']);
    component.selectTab(component.tabs[0].id);
    fixture.detectChanges();
    component.selectTab(component.tabs[1].id);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.directive(PdfDocumentTabComponent))[0].componentInstance).toBe(first);
    expect(history.canUndo()).toBeTrue();
    expect(hosts[1].injector.get(HistoryService).canUndo()).toBeFalse();
    expect(hosts[0].nativeElement.style.display).toBe('none');
    expect(hosts[0].nativeElement.hasAttribute('inert')).toBeTrue();
  });

  it('keeps tabs unchanged on cancellation and exposes picker errors', async () => {
    runtime.openMultipleFileDialog.and.resolveTo({ canceled: true, files: [] });
    await component.openDocuments({ multiple: true });
    expect(component.tabs.length).toBe(1);
    expect(component.tabs[0].file).toBeNull();
    runtime.openMultipleFileDialog.and.rejectWith(new Error('Picker unavailable'));
    await component.openDocuments({ multiple: true });
    expect(component.error).toContain('Picker unavailable');
    expect(component.selecting).toBeFalse();
  });

  it('opens recent desktop files as separate tabs', async () => {
    runtime.isDesktop.and.returnValue(true);
    runtime.readFile.and.resolveTo(new Uint8Array([1, 2]).buffer);
    await component.openDocuments({ multiple: false, recent: {
      id: 'recent', name: 'recent.pdf', path: 'C:\\docs\\recent.pdf', isPinned: false,
      lastOpenedAt: 1,
    } });
    expect(runtime.readFile).toHaveBeenCalledWith('C:\\docs\\recent.pdf');
    expect(component.tabs[0].file?.filePath).toBe('C:\\docs\\recent.pdf');
    expect(runtime.openFileDialog).not.toHaveBeenCalled();
  });

  it('requires close confirmation, preserves failed closes, and replaces the last closed tab with an empty workspace', async () => {
    await component.openDocuments({ multiple: false });
    fixture.detectChanges();
    const host = component.hosts?.first;
    if (!host) throw new Error('Expected a document host');
    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    const close = spyOn(host, 'close').and.resolveTo(true);
    const id = component.tabs[0].id;
    await component.closeTab(id);
    expect(close).not.toHaveBeenCalled();
    confirm.and.returnValue(true);
    close.and.resolveTo(false);
    await component.closeTab(id);
    expect(component.tabs[0].id).toBe(id);
    close.and.resolveTo(true);
    await component.closeTab(id);
    expect(component.tabs.length).toBe(1);
    expect(component.tabs[0].file).toBeNull();
    expect(component.tabs[0].id).not.toBe(id);
  });

  it('creates blank A4 PDFs in editable tabs with unique names, reusing the empty tab', async () => {
    expect(fixture.nativeElement.querySelector('[role="tab"]').textContent.trim()).toBe('Empty');
    (fixture.nativeElement.querySelector('button.new-pdf') as HTMLButtonElement).click();
    for (let i = 0; i < 100 && (component.selecting || !component.tabs[0].file); i++) await new Promise(r => setTimeout(r, 10));
    await component.createBlankDocument();
    fixture.detectChanges();
    expect(component.tabs.map(tab => tab.file?.file.name)).toEqual(['Untitled-1.pdf', 'Untitled-2.pdf']);
    expect(component.activeId).toBe(component.tabs[1].id);
    expect(component.tabs[0].file?.filePath).toBeUndefined();
    const pdf = await PDFDocument.load(await component.tabs[0].file!.file.arrayBuffer());
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]);
    expect(runtime.openFileDialog).not.toHaveBeenCalled();
  });

  it('supports roving keyboard navigation between document tabs', async () => {
    await component.openDocuments({ multiple: true });
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
    component.onTabKeydown(event, 1);
    expect(component.activeId).toBe(component.tabs[0].id);
    expect(event.defaultPrevented).toBeTrue();
    expect(document.activeElement?.id).toBe(`pdf-tab-${component.activeId}`);
  });
});
