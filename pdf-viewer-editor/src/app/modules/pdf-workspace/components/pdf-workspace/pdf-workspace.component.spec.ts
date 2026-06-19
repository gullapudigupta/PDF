import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';

import { PdfWorkspaceComponent } from './pdf-workspace.component';
import { RuntimeService } from '@core/services/runtime.service';
import { PdfDocumentService } from '../../services/pdf-document.service';
import { PdfRenderService } from '../../services/pdf-render.service';
import { HistoryService } from '../../services/history.service';

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
  const store = jasmine.createSpyObj<Store>('Store', ['dispatch']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PdfWorkspaceComponent],
      imports: [FormsModule],
      providers: [
        { provide: RuntimeService, useValue: runtimeService },
        { provide: PdfDocumentService, useValue: pdfDocumentService },
        { provide: PdfRenderService, useValue: pdfRenderService },
        { provide: Store, useValue: store },
        { provide: HistoryService, useValue: new HistoryService<any>() },
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
    store.dispatch.calls.reset();
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
    const bytes = new Uint8Array([4, 5, 6]);
    component.document = {
      id: 'doc-1',
      name: 'doc.pdf',
      totalPages: 1,
      bytes,
      proxy: {},
    } as any;

    runtimeService.saveFileDialog.and.resolveTo({ canceled: false, filePath: 'doc.pdf' });

    await component.saveFile();

    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith(
      'doc.pdf',
      jasmine.any(ArrayBuffer)
    );

    const callArgs = runtimeService.saveFileDialog.calls.mostRecent().args;
    const savedData = new Uint8Array(callArgs[1] as ArrayBuffer);
    expect(Array.from(savedData)).toEqual([4, 5, 6]);
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

  it('supports copy, cut, and paste for selected overlay object', () => {
    component.overlayWidth = 600;
    component.overlayHeight = 400;
    component.overlayObjects = [
      {
        id: 'obj-1',
        x: 20,
        y: 20,
        width: 120,
        height: 60,
        label: 'Object 1',
      },
    ] as any;
    component.selectedObjectId = 'obj-1';

    component.copySelection();
    expect(component.clipboardObject?.id).toBe('obj-1');

    component.cutSelection();
    expect(component.overlayObjects.length).toBe(0);
    expect(component.selectedObjectId).toBeNull();

    component.pasteClipboard();
    expect(component.overlayObjects.length).toBe(1);
    expect(component.overlayObjects[0].id).not.toBe('obj-1');
    expect(component.overlayObjects[0].label).toContain('copy');
  });

  it('moves selected object while dragging', () => {
    component.overlayWidth = 600;
    component.overlayHeight = 400;
    component.overlayObjects = [
      {
        id: 'obj-1',
        x: 30,
        y: 40,
        width: 100,
        height: 50,
        label: 'Object 1',
      },
    ] as any;

    component.startMove(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }), 'obj-1');
    component.onMouseMove(new MouseEvent('mousemove', { clientX: 40, clientY: 35 }));
    component.onMouseUp();

    expect(component.overlayObjects[0].x).toBe(60);
    expect(component.overlayObjects[0].y).toBe(65);
  });

  it('resizes selected object from southeast handle', () => {
    component.overlayWidth = 600;
    component.overlayHeight = 400;
    component.overlayObjects = [
      {
        id: 'obj-1',
        x: 30,
        y: 40,
        width: 100,
        height: 50,
        label: 'Object 1',
      },
    ] as any;

    component.startResize(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }), 'obj-1', 'se');
    component.onMouseMove(new MouseEvent('mousemove', { clientX: 35, clientY: 30 }));
    component.onMouseUp();

    expect(component.overlayObjects[0].width).toBe(125);
    expect(component.overlayObjects[0].height).toBe(70);
  });

  it('creates and edits text object', () => {
    spyOn(window, 'prompt').and.returnValues('Initial text', 'Edited text');
    component.overlayWidth = 600;
    component.overlayHeight = 400;

    component.addTextObject();
    const created = component.overlayObjects[0] as any;
    expect(created.type).toBe('text');
    expect(created.text).toBe('Initial text');

    component.selectedObjectId = created.id;
    component.editSelection();
    expect(component.overlayObjects[0].text).toBe('Edited text');
  });

  it('creates and edits image object', () => {
    spyOn(window, 'prompt').and.returnValues('https://img/a.png', 'https://img/b.png');
    component.overlayWidth = 600;
    component.overlayHeight = 400;

    component.addImageObject();
    const created = component.overlayObjects[0] as any;
    expect(created.type).toBe('image');
    expect(created.imageSrc).toBe('https://img/a.png');

    component.selectedObjectId = created.id;
    component.editSelection();
    expect(component.overlayObjects[0].imageSrc).toBe('https://img/b.png');
  });

  it('creates and edits link object', () => {
    spyOn(window, 'prompt').and.returnValues(
      'https://example.com',
      'Start label',
      'https://updated.example.com',
      'Updated label'
    );
    component.overlayWidth = 600;
    component.overlayHeight = 400;

    component.addLinkObject();
    const created = component.overlayObjects[0] as any;
    expect(created.type).toBe('link');
    expect(created.url).toBe('https://example.com');
    expect(created.text).toBe('Start label');

    component.selectedObjectId = created.id;
    component.editSelection();
    expect(component.overlayObjects[0].url).toBe('https://updated.example.com');
    expect(component.overlayObjects[0].text).toBe('Updated label');
  });

  it('deletes selected object', () => {
    component.overlayObjects = [
      {
        id: 'obj-1',
        type: 'text',
        x: 20,
        y: 20,
        width: 100,
        height: 40,
        label: 'Text Box',
        text: 'A',
      },
    ] as any;
    component.selectedObjectId = 'obj-1';

    component.deleteSelection();
    expect(component.overlayObjects.length).toBe(0);
    expect(component.selectedObjectId).toBeNull();
  });

  it('supports undo and redo for overlay changes', () => {
    spyOn(window, 'prompt').and.returnValue('A');
    component.overlayWidth = 600;
    component.overlayHeight = 400;

    component.addTextObject();
    expect(component.overlayObjects.length).toBe(1);
    expect(component.canUndo).toBeTrue();

    component.undoEdit();
    expect(component.overlayObjects.length).toBe(0);
    expect(component.canRedo).toBeTrue();

    component.redoEdit();
    expect(component.overlayObjects.length).toBe(1);
  });
});
