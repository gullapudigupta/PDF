import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { PdfWorkspaceComponent } from './pdf-workspace.component';
import { RuntimeService } from '@core/services/runtime.service';
import { PdfDocumentService } from '../../services/pdf-document.service';
import { PdfRenderService } from '../../services/pdf-render.service';

describe('PdfWorkspaceComponent', () => {
  let fixture: ComponentFixture<PdfWorkspaceComponent>;
  let component: PdfWorkspaceComponent;

  const runtimeService = jasmine.createSpyObj<RuntimeService>('RuntimeService', ['openFileDialog', 'saveFileDialog']);
  const pdfDocumentService = jasmine.createSpyObj<PdfDocumentService>('PdfDocumentService', [
    'loadFromFile',
    'extractText',
    'getPage',
  ]);
  const pdfRenderService = jasmine.createSpyObj<PdfRenderService>('PdfRenderService', ['renderPageToCanvas']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PdfWorkspaceComponent],
      imports: [FormsModule],
      providers: [
        { provide: RuntimeService, useValue: runtimeService },
        { provide: PdfDocumentService, useValue: pdfDocumentService },
        { provide: PdfRenderService, useValue: pdfRenderService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PdfWorkspaceComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    runtimeService.openFileDialog.calls.reset();
    runtimeService.saveFileDialog.calls.reset();
    pdfDocumentService.loadFromFile.calls.reset();
    pdfDocumentService.extractText.calls.reset();
    pdfRenderService.renderPageToCanvas.calls.reset();
  });

  it('loads and renders first page when opening a file', async () => {
    const file = new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' });
    const loadedDoc = {
      id: 'doc-1',
      name: 'doc.pdf',
      totalPages: 2,
      bytes: new Uint8Array([1, 2]),
      proxy: {},
    };

    runtimeService.openFileDialog.and.resolveTo({ canceled: false, file });
    pdfDocumentService.loadFromFile.and.resolveTo(loadedDoc as any);
    pdfRenderService.renderPageToCanvas.and.resolveTo();

    fixture.detectChanges();
    await component.openFile();

    expect(component.document?.name).toBe('doc.pdf');
    expect(component.currentPage).toBe(1);
    expect(pdfRenderService.renderPageToCanvas).toHaveBeenCalledWith(
      loadedDoc.bytes,
      1,
      jasmine.any(HTMLCanvasElement),
      jasmine.objectContaining({ zoom: 1, rotation: 0 })
    );
  });

  it('moves between pages within bounds', async () => {
    component.document = {
      id: 'doc-1',
      name: 'doc.pdf',
      totalPages: 3,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    component.totalPages = 3;
    component.currentPage = 2;
    fixture.detectChanges();

    pdfRenderService.renderPageToCanvas.and.resolveTo();

    await component.nextPage();
    expect(component.currentPage).toBe(3);

    await component.nextPage();
    expect(component.currentPage).toBe(3);

    await component.previousPage();
    expect(component.currentPage).toBe(2);
  });

  it('forwards Save As to runtime with document bytes', async () => {
    component.document = {
      id: 'doc-1',
      name: 'doc.pdf',
      totalPages: 1,
      bytes: new Uint8Array([4, 5, 6]),
      proxy: {},
    } as any;

    runtimeService.saveFileDialog.and.resolveTo({ canceled: false, filePath: 'doc.pdf' });

    await component.saveFile();

    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith(
      'doc.pdf',
      component.document.bytes.buffer
    );
  });

  it('finds text and updates search message', async () => {
    component.document = {
      id: 'doc-1',
      name: 'doc.pdf',
      totalPages: 2,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    component.searchQuery = 'target';

    pdfDocumentService.extractText.and.callFake(async (page: number) => (page === 2 ? 'target text' : 'other'));
    pdfRenderService.renderPageToCanvas.and.resolveTo();

    fixture.detectChanges();
    await component.searchInDocument();

    expect(component.currentPage).toBe(2);
    expect(component.searchMessage).toBe('Found on page 2');
  });
});
