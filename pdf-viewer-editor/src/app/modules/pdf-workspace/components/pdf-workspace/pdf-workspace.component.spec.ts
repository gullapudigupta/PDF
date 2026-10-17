import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { PasswordResponses } from 'pdfjs-dist';

import { PdfWorkspaceComponent } from './pdf-workspace.component';
import { RuntimeService } from '@core/services/runtime.service';
import { PdfDocumentService } from '../../services/pdf-document.service';
import { PdfRenderService } from '../../services/pdf-render.service';
import { HistoryService } from '../../services/history.service';
import { PdfPageOperationsService } from '../../services/pdf-page-operations.service';
import { PdfEditSerializationService } from '../../services/pdf-edit-serialization.service';
import { PdfFormService } from '../../services/pdf-form.service';
import { PdfSecurityService } from '../../services/pdf-security.service';
import { PdfPageExportService } from '../../services/pdf-page-export.service';
import { PersistenceService } from '@core/services/persistence.service';
import { ExtensionRuntimeAdapter } from '@core/adapters/runtime.adapter';

describe('PdfWorkspaceComponent', () => {
  let fixture: ComponentFixture<PdfWorkspaceComponent>;
  let component: PdfWorkspaceComponent;

  const runtimeService = jasmine.createSpyObj<RuntimeService>('RuntimeService', [
    'openFileDialog',
    'saveFileDialog',
    'isDesktop',
    'writeFile',
    'readFile',
  ]);
  const pdfDocumentService = jasmine.createSpyObj<PdfDocumentService>('PdfDocumentService', [
    'loadFromFile',
    'loadFromBytes',
    'extractText',
    'getPage',
    'replaceCurrentDocumentBytes',
    'closeCurrent',
  ]);
  const pdfRenderService = jasmine.createSpyObj<PdfRenderService>('PdfRenderService', ['renderPageToCanvas', 'renderLoadedPageToCanvas']);
  const pdfPageOperationsService = jasmine.createSpyObj<PdfPageOperationsService>('PdfPageOperationsService', [
    'deletePage',
    'reorderPage',
    'insertPages',
    'extractPages',
    'mergePdfs',
    'splitByPageRanges',
    'rotatePages',
    'cropPage',
  ]);
  const pdfEditSerializationService = jasmine.createSpyObj<PdfEditSerializationService>(
    'PdfEditSerializationService',
    ['flattenEdits']
  );
  const pdfFormService = jasmine.createSpyObj<PdfFormService>('PdfFormService', [
    'getFields',
    'updateField',
    'exportFormData',
    'importFormData',
    'createField',
    'updateFieldDefinition',
    'deleteField',
  ]);
  const pdfSecurityService = jasmine.createSpyObj<PdfSecurityService>('PdfSecurityService', [
    'getMetadata',
    'updateMetadata',
    'protect',
  ]);
  const pdfPageExportService = jasmine.createSpyObj<PdfPageExportService>('PdfPageExportService', ['exportPage']);
  const persistenceService = jasmine.createSpyObj<PersistenceService>('PersistenceService', [
    'getSetting',
    'setSetting',
    'getAutosaveData',
    'saveAutosave',
    'clearAutosave',
    'listRecentFileRecords',
    'recordRecentFile',
    'setRecentFilePinned',
    'removeRecentFileRecord',
  ]);
  const store = jasmine.createSpyObj<Store>('Store', ['dispatch']);

  beforeEach(async () => {
    runtimeService.isDesktop.and.returnValue(false);
    runtimeService.saveFileDialog.and.resolveTo({ canceled: false });
    pdfEditSerializationService.flattenEdits.and.callFake(async (bytes: Uint8Array) => bytes.slice());
    pdfFormService.getFields.and.resolveTo([]);
    pdfSecurityService.getMetadata.and.resolveTo({ title: '', author: '', subject: '', keywords: '' });
    pdfSecurityService.updateMetadata.and.callFake(async (_bytes, metadata) => new TextEncoder().encode(metadata.title));
    pdfSecurityService.protect.and.resolveTo(new Uint8Array([1, 2, 3]));
    pdfPageExportService.exportPage.and.resolveTo({
      bytes: new Uint8Array([8, 9]).buffer,
      mimeType: 'image/png',
      extension: 'png',
    });
    persistenceService.getSetting.and.resolveTo(null);
    persistenceService.setSetting.and.resolveTo();
    persistenceService.getAutosaveData.and.resolveTo(null);
    persistenceService.saveAutosave.and.resolveTo();
    persistenceService.clearAutosave.and.resolveTo();
    persistenceService.listRecentFileRecords.and.resolveTo([]);
    persistenceService.recordRecentFile.and.resolveTo();
    persistenceService.setRecentFilePinned.and.resolveTo();
    persistenceService.removeRecentFileRecord.and.resolveTo();
    await TestBed.configureTestingModule({
      declarations: [PdfWorkspaceComponent],
      imports: [FormsModule],
      providers: [
        { provide: RuntimeService, useValue: runtimeService },
        { provide: PdfDocumentService, useValue: pdfDocumentService },
        { provide: PdfRenderService, useValue: pdfRenderService },
        { provide: PdfPageOperationsService, useValue: pdfPageOperationsService },
        { provide: PdfEditSerializationService, useValue: pdfEditSerializationService },
        { provide: PdfFormService, useValue: pdfFormService },
        { provide: PdfSecurityService, useValue: pdfSecurityService },
        { provide: PdfPageExportService, useValue: pdfPageExportService },
        { provide: PersistenceService, useValue: persistenceService },
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
    pdfDocumentService.replaceCurrentDocumentBytes.calls.reset();
    pdfDocumentService.closeCurrent.calls.reset();
    pdfRenderService.renderPageToCanvas.calls.reset();
    pdfRenderService.renderLoadedPageToCanvas.calls.reset();
    pdfPageOperationsService.deletePage.calls.reset();
    pdfPageOperationsService.reorderPage.calls.reset();
    pdfPageOperationsService.insertPages.calls.reset();
    pdfPageOperationsService.extractPages.calls.reset();
    pdfPageOperationsService.mergePdfs.calls.reset();
    pdfPageOperationsService.splitByPageRanges.calls.reset();
    pdfPageOperationsService.rotatePages.calls.reset();
    pdfPageOperationsService.cropPage.calls.reset();
    pdfEditSerializationService.flattenEdits.calls.reset();
    pdfFormService.getFields.calls.reset();
    pdfFormService.updateField.calls.reset();
    pdfFormService.exportFormData.calls.reset();
    pdfFormService.importFormData.calls.reset();
    pdfFormService.createField.calls.reset();
    pdfFormService.updateFieldDefinition.calls.reset();
    pdfFormService.deleteField.calls.reset();
    pdfSecurityService.getMetadata.calls.reset();
    pdfSecurityService.updateMetadata.calls.reset();
    pdfSecurityService.protect.calls.reset();
    pdfPageExportService.exportPage.calls.reset();
    persistenceService.getAutosaveData.calls.reset();
    persistenceService.getSetting.calls.reset();
    persistenceService.setSetting.calls.reset();
    persistenceService.listRecentFileRecords.calls.reset();
    persistenceService.recordRecentFile.calls.reset();
    persistenceService.setRecentFilePinned.calls.reset();
    persistenceService.removeRecentFileRecord.calls.reset();
    persistenceService.saveAutosave.calls.reset();
    persistenceService.clearAutosave.calls.reset();
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
    expect(persistenceService.recordRecentFile).toHaveBeenCalledWith(jasmine.objectContaining({
      id: loadedDoc.id,
      name: loadedDoc.name,
      path: null,
    }));
  });

  it('restores and persists the current page and zoom for a document', async () => {
    const file = new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' });
    const loadedDoc = {
      id: 'doc-1',
      name: 'doc.pdf',
      totalPages: 3,
      bytes: new Uint8Array([1, 2]),
      proxy: {},
    };
    persistenceService.getSetting.and.callFake(async <T>(key: string): Promise<T | null> =>
      key === 'workspaceView:doc-1'
        ? { page: 2, zoom: 1.5, viewingMode: 'facing', theme: 'dark', darkPageRendering: true } as T
        : null
    );
    runtimeService.openFileDialog.and.resolveTo({ canceled: false, file });
    pdfDocumentService.loadFromFile.and.resolveTo(loadedDoc as any);
    pdfRenderService.renderPageToCanvas.and.resolveTo();

    await component.openFile();
    expect(component.currentPage).toBe(2);
    expect(component.zoom).toBe(1.5);
    expect(component.viewingMode).toBe('facing');
    expect(component.theme).toBe('dark');
    expect(component.darkPageRendering).toBeTrue();

    await component.nextPage();
    expect(persistenceService.setSetting).toHaveBeenCalledWith('workspaceView:doc-1', {
      page: 3,
      zoom: 1.5,
      viewingMode: 'facing',
      theme: 'dark',
      darkPageRendering: true,
    });
  });

  it('restores saved per-document view state when reopening a recent PDF', async () => {
    const recent = {
      id: 'recent-doc',
      name: 'recent.pdf',
      path: 'C:\\documents\\recent.pdf',
      lastOpenedAt: 1,
      isPinned: true,
    };
    const loadedDoc = {
      id: recent.id,
      name: recent.name,
      totalPages: 4,
      bytes: new Uint8Array([1, 2]),
      proxy: {},
    };
    runtimeService.isDesktop.and.returnValue(true);
    runtimeService.readFile.and.resolveTo(new Uint8Array([1, 2]).buffer);
    pdfDocumentService.loadFromBytes.and.resolveTo(loadedDoc as any);
    pdfRenderService.renderLoadedPageToCanvas.and.resolveTo();
    persistenceService.getSetting.and.callFake(async <T>(key: string): Promise<T | null> =>
      key === 'workspaceView:recent-doc'
        ? { page: 3, zoom: 1.75, viewingMode: 'single', theme: 'dark', darkPageRendering: true } as T
        : null
    );

    await component.openRecentFile(recent);

    expect(component.currentPage).toBe(3);
    expect(component.zoom).toBe(1.75);
    expect(component.theme).toBe('dark');
    expect(component.darkPageRendering).toBeTrue();
    expect(runtimeService.readFile).toHaveBeenCalledWith(recent.path);
    expect(persistenceService.recordRecentFile).toHaveBeenCalledWith(jasmine.objectContaining({ path: recent.path }));
  });

  it('persists viewing mode and theme preferences per app and document', async () => {
    component.document = {
      id: 'doc-views',
      name: 'views.pdf',
      totalPages: 4,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    component.totalPages = 4;
    pdfRenderService.renderLoadedPageToCanvas.and.resolveTo();

    await component.setTheme('dark');
    await component.setDarkPageRendering(true);
    await component.setViewingMode('facing');

    expect(component.viewingPages).toEqual([1, 2]);
    expect(persistenceService.setSetting).toHaveBeenCalledWith('workspacePreferences', {
      theme: 'dark',
      darkPageRendering: true,
      viewingMode: 'facing',
      toolbarVisibility: { editing: true, search: true, navigation: true, annotations: true },
    });
    expect(persistenceService.setSetting).toHaveBeenCalledWith('workspaceView:doc-views', {
      page: 1,
      zoom: 1,
      viewingMode: 'facing',
      theme: 'dark',
      darkPageRendering: true,
    });
  });

  it('saves toolbar visibility customization as an app preference', async () => {
    await component.setToolbarVisibility('search', false);

    expect(component.toolbarVisibility.search).toBeFalse();
    expect(persistenceService.setSetting).toHaveBeenCalledWith('workspacePreferences', jasmine.objectContaining({
      toolbarVisibility: { editing: true, search: false, navigation: true, annotations: true },
    }));
  });

  it('shows customization controls while hiding selected toolbar groups', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.toolbar-customization input[type="checkbox"]').length).toBe(4);
    await component.setToolbarVisibility('search', false);
    await component.setToolbarVisibility('editing', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.toolbar-right')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pdf-toolbar-actions')).toBeNull();
    expect(fixture.nativeElement.querySelector('.toolbar-customization')).not.toBeNull();
  });

  it('restores saved toolbar visibility while retaining defaults for unspecified groups', async () => {
    persistenceService.getSetting.and.resolveTo({
      toolbarVisibility: { search: false, annotations: false },
    });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.toolbarVisibility).toEqual({
      editing: true,
      search: false,
      navigation: true,
      annotations: false,
    });
  });

  it('renders a bounded window of pages in continuous mode', async () => {
    component.document = {
      id: 'doc-continuous',
      name: 'long.pdf',
      totalPages: 20,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    component.totalPages = 20;
    component.currentPage = 10;
    component.viewingMode = 'continuous';
    pdfRenderService.renderLoadedPageToCanvas.and.resolveTo();

    fixture.detectChanges();
    await fixture.whenStable();

    const renderedPages = pdfRenderService.renderLoadedPageToCanvas.calls.allArgs().map(args => args[1]);
    expect(renderedPages).toEqual([8, 9, 10, 11, 12]);
  });

  it('pins and removes a recent PDF record', async () => {
    const recent = {
      id: 'doc-1',
      name: 'doc.pdf',
      path: null,
      lastOpenedAt: 1,
      isPinned: false,
    };
    await component.toggleRecentPin(recent);
    await component.removeRecentFile(recent);

    expect(persistenceService.setRecentFilePinned).toHaveBeenCalledWith('doc-1', true);
    expect(persistenceService.removeRecentFileRecord).toHaveBeenCalledWith('doc-1');
  });

  it('updates PDF metadata on the active document', async () => {
    const original = { id: 'metadata-doc', name: 'metadata.pdf', totalPages: 1, bytes: new Uint8Array([1]), proxy: {} };
    const updatedBytes = new Uint8Array([2, 3]);
    const updated = { ...original, bytes: updatedBytes };
    component.document = original as any;
    component.metadata = { title: 'Title', author: 'Author', subject: 'Subject', keywords: 'one, two' };
    pdfSecurityService.updateMetadata.and.resolveTo(updatedBytes);
    pdfDocumentService.replaceCurrentDocumentBytes.and.resolveTo(updated as any);
    spyOn<any>(component, 'renderCurrentPage').and.resolveTo();

    await component.saveMetadata();

    expect(pdfSecurityService.updateMetadata).toHaveBeenCalledWith(original.bytes, component.metadata);
    expect(component.document?.bytes).toEqual(updatedBytes);
    expect(component.metadataDialogOpen).toBeFalse();
    expect(component.error).toBeNull();
  });

  it('exports an encrypted copy using confirmed passwords and the selected permissions', async () => {
    const sourceBytes = new Uint8Array([4, 5]);
    component.document = {
      id: 'protect-doc', name: 'sample.pdf', totalPages: 1, bytes: sourceBytes, proxy: {},
    } as any;
    component.protectionUserPassword = 'reader-password';
    component.protectionUserPasswordConfirm = 'reader-password';
    component.protectionOwnerPassword = 'owner-password';
    component.protectionOwnerPasswordConfirm = 'owner-password';
    component.permissionPreset = 'print';

    await component.protectCurrentPdf();

    expect(pdfSecurityService.protect).toHaveBeenCalledWith(sourceBytes, {
      userPassword: 'reader-password',
      ownerPassword: 'owner-password',
      permissionPreset: 'print',
    });
    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith('sample-protected.pdf', jasmine.any(ArrayBuffer));
    expect(component.protectionUserPassword).toBe('');
    expect(component.protectionOwnerPassword).toBe('');
  });

  it('exports the current page in the selected image format', async () => {
    component.document = {
      id: 'page-export', name: 'sample.pdf', totalPages: 3, bytes: new Uint8Array([4]), proxy: {},
    } as any;
    component.currentPage = 2;
    component.pageExportFormat = 'jpeg';
    pdfPageExportService.exportPage.and.resolveTo({
      bytes: new Uint8Array([8, 9]).buffer,
      mimeType: 'image/jpeg',
      extension: 'jpeg',
    });

    await component.exportCurrentPage();

    expect(pdfPageExportService.exportPage).toHaveBeenCalledWith(component.document!.bytes, 2, 'jpeg');
    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith(
      'sample-page-2.jpeg',
      jasmine.any(ArrayBuffer),
      'image/jpeg'
    );
  });

  it('does not save or autosave an opened protected PDF', async () => {
    pdfEditSerializationService.flattenEdits.calls.reset();
    persistenceService.saveAutosave.calls.reset();
    component.document = {
      id: 'protected-doc', name: 'protected.pdf', totalPages: 1, bytes: new Uint8Array([1]), proxy: {}, isEncrypted: true,
    } as any;

    await component.saveFile();
    await component.autosaveNow();

    expect(pdfEditSerializationService.flattenEdits).not.toHaveBeenCalled();
    expect(persistenceService.saveAutosave).not.toHaveBeenCalled();
  });

  it('opens a protected PDF through its authorized proxy without persisting bytes or passwords', async () => {
    const file = new File([new Uint8Array([1, 2])], 'protected.pdf', { type: 'application/pdf' });
    const proxy = { getPage: jasmine.createSpy(), destroy: jasmine.createSpy() };
    const protectedDocument = {
      id: 'protected-id',
      name: 'protected.pdf',
      totalPages: 1,
      bytes: new Uint8Array([1, 2]),
      proxy,
      isEncrypted: true,
    };
    runtimeService.openFileDialog.and.resolveTo({ canceled: false, file });
    pdfDocumentService.loadFromFile.and.resolveTo(protectedDocument as any);
    pdfRenderService.renderLoadedPageToCanvas.and.resolveTo();

    await component.openFile();

    expect(component.document?.isEncrypted).toBeTrue();
    expect(pdfRenderService.renderLoadedPageToCanvas).toHaveBeenCalledWith(
      proxy,
      1,
      jasmine.any(HTMLCanvasElement),
      jasmine.any(Object)
    );
    expect(persistenceService.getAutosaveData).not.toHaveBeenCalled();
    expect(persistenceService.saveAutosave).not.toHaveBeenCalled();
    const recentRecord = persistenceService.recordRecentFile.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(recentRecord, 'bytes')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(recentRecord, 'password')).toBeFalse();
    await component.closeDocument();
    expect(pdfDocumentService.closeCurrent).toHaveBeenCalled();
  });

  it('closes the open document and releases its PDF.js proxy', async () => {
    component.document = {
      id: 'close-doc',
      name: 'close.pdf',
      totalPages: 1,
      bytes: new Uint8Array([1]),
      proxy: {},
      isEncrypted: true,
    } as any;
    component.totalPages = 1;

    await component.closeDocument();

    expect(pdfDocumentService.closeCurrent).toHaveBeenCalled();
    expect(component.document).toBeNull();
    expect(component.totalPages).toBe(0);
  });

  it('prompts for protected PDF passwords and resolves cancellation explicitly', async () => {
    const requestPassword = (component as any).requestPdfPassword(PasswordResponses.NEED_PASSWORD) as Promise<string | null>;
    expect(component.passwordPrompt).toBeTrue();
    component.pdfPasswordInput = 'reader-secret';
    component.submitPasswordPrompt();
    await expectAsync(requestPassword).toBeResolvedTo('reader-secret');
    expect(component.pdfPasswordInput).toBe('');

    const cancelledRequest = (component as any).requestPdfPassword(PasswordResponses.INCORRECT_PASSWORD) as Promise<string | null>;
    expect(component.passwordPromptMessage).toContain('incorrect');
    component.cancelPasswordPrompt();
    await expectAsync(cancelledRequest).toBeResolvedTo(null);
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

  it('bounds zoom and wraps rotation controls', async () => {
    component.document = {
      id: 'doc-1', name: 'doc.pdf', totalPages: 1, bytes: new Uint8Array([1]), proxy: {},
    } as any;
    component.zoom = 2.95;
    component.rotation = 0;
    fixture.detectChanges();
    pdfRenderService.renderPageToCanvas.and.resolveTo();

    await component.zoomIn();
    expect(component.zoom).toBe(3);
    component.zoom = 0.55;
    await component.zoomOut();
    expect(component.zoom).toBe(0.5);

    await component.rotateLeft();
    expect(component.rotation).toBe(270);
    await component.rotateRight();
    expect(component.rotation).toBe(0);
  });

  it('creates page highlights with selected color and opacity', () => {
    component.loading = false;
    component.document = { id: 'doc-annotations', name: 'doc.pdf', totalPages: 2, bytes: new Uint8Array([1]), proxy: {} } as any;
    component.currentPage = 2;
    component.overlayWidth = 500;
    component.overlayHeight = 500;
    component.annotationColor = '#00ff00';
    component.annotationOpacity = 0.7;
    fixture.detectChanges();
    const bounds = component.annotationLayer!.nativeElement.getBoundingClientRect();
    component.setAnnotationTool('highlight');
    component.startAnnotation(new MouseEvent('mousedown', { button: 0, clientX: bounds.left + 20, clientY: bounds.top + 30 }));
    component.moveAnnotation(new MouseEvent('mousemove', { clientX: bounds.left + 120, clientY: bounds.top + 50 }));
    component.finishAnnotation();

    expect(component.annotations.length).toBe(1);
    expect(component.annotations[0].type).toBe('highlight');
    expect(component.annotations[0].page).toBe(2);
    expect(component.annotations[0].style).toEqual({ color: '#00ff00', opacity: 0.7 });
    expect(component.pageAnnotations.length).toBe(1);
  });

  it('creates comments and filters, edits, and deletes annotations', () => {
    spyOn(window, 'prompt').and.returnValues('Review this section', 'Updated review');
    component.loading = false;
    component.document = { id: 'doc-comments', name: 'doc.pdf', totalPages: 2, bytes: new Uint8Array([1]), proxy: {} } as any;
    component.overlayWidth = 500;
    component.overlayHeight = 500;
    fixture.detectChanges();
    const bounds = component.annotationLayer!.nativeElement.getBoundingClientRect();
    component.setAnnotationTool('comment');
    component.startAnnotation(new MouseEvent('mousedown', { button: 0, clientX: bounds.left + 10, clientY: bounds.top + 10 }));
    component.moveAnnotation(new MouseEvent('mousemove', { clientX: bounds.left + 80, clientY: bounds.top + 60 }));
    component.finishAnnotation();

    const comment = component.annotations[0];
    expect(comment.type).toBe('comment');
    expect(comment.content).toBe('Review this section');
    component.annotationFilter = 'draw';
    expect(component.visibleAnnotations.length).toBe(0);
    component.annotationFilter = 'comment';
    component.annotationSearch = 'review';
    expect(component.visibleAnnotations.length).toBe(1);
    component.editAnnotation(comment);
    expect(component.annotations[0].content).toBe('Updated review');
    component.deleteAnnotation(component.annotations[0]);
    expect(component.annotations.length).toBe(0);
  });

  it('creates freehand drawing paths and jumps from the panel to their page', async () => {
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    component.loading = false;
    component.document = { id: 'doc-draw', name: 'doc.pdf', totalPages: 3, bytes: new Uint8Array([1]), proxy: {} } as any;
    component.overlayWidth = 500;
    component.overlayHeight = 500;
    fixture.detectChanges();
    const bounds = component.annotationLayer!.nativeElement.getBoundingClientRect();
    component.setAnnotationTool('draw');
    component.startAnnotation(new MouseEvent('mousedown', { button: 0, clientX: bounds.left + 100, clientY: bounds.top + 100 }));
    component.moveAnnotation(new MouseEvent('mousemove', { clientX: bounds.left + 50, clientY: bounds.top + 80 }));
    component.moveAnnotation(new MouseEvent('mousemove', { clientX: bounds.left + 20, clientY: bounds.top + 40 }));
    component.finishAnnotation();

    expect(component.annotations.length).toBe(1);
    expect(component.annotations[0].type).toBe('draw');
    expect(component.annotations[0].content).toContain('0,0');
    await component.jumpToAnnotation({ ...component.annotations[0], page: 3 });
    expect(component.currentPage).toBe(3);
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

  it('serializes editable state for Save As and uses the saved path for subsequent Save', async () => {
    const sourceBytes = new Uint8Array([1, 2]);
    const editedBytes = new Uint8Array([3, 4, 5]);
    component.document = { id: 'doc-save', name: 'doc.pdf', totalPages: 1, bytes: sourceBytes, proxy: {} } as any;
    component.overlayWidth = 400;
    component.overlayHeight = 500;
    component.overlayObjects = [{
      id: 'text-1', type: 'text', x: 10, y: 20, width: 100, height: 40, label: 'Text', text: 'Edited',
    }];
    pdfEditSerializationService.flattenEdits.and.resolveTo(editedBytes);
    runtimeService.isDesktop.and.returnValue(true);
    runtimeService.saveFileDialog.and.resolveTo({ canceled: false, filePath: 'C:\\docs\\doc.pdf' });

    await component.saveFileAs();
    expect(pdfEditSerializationService.flattenEdits).toHaveBeenCalledWith(
      sourceBytes,
      1,
      400,
      500,
      component.overlayObjects,
      component.annotations
    );
    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith('doc.pdf', jasmine.any(ArrayBuffer));
    expect(persistenceService.clearAutosave).toHaveBeenCalledWith('doc-save');

    runtimeService.writeFile.and.resolveTo();
    await component.saveFile();
    expect(runtimeService.writeFile).toHaveBeenCalledWith('C:\\docs\\doc.pdf', jasmine.any(ArrayBuffer));
  });

  it('completes a desktop open-edit-save workflow', async () => {
    const file = new File([new Uint8Array([1, 2])], 'workflow.pdf', { type: 'application/pdf' });
    const sourceBytes = new Uint8Array([1, 2]);
    const editedBytes = new Uint8Array([3, 4, 5]);
    const filePath = 'C:\\documents\\workflow.pdf';
    runtimeService.isDesktop.and.returnValue(true);
    runtimeService.openFileDialog.and.resolveTo({ canceled: false, file, filePath });
    runtimeService.saveFileDialog.and.resolveTo({ canceled: false, filePath });
    runtimeService.writeFile.and.resolveTo();
    pdfDocumentService.loadFromFile.and.resolveTo({
      id: 'workflow-doc',
      name: file.name,
      totalPages: 1,
      bytes: sourceBytes,
      proxy: {},
    } as any);
    pdfEditSerializationService.flattenEdits.and.resolveTo(editedBytes);
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    spyOn(window, 'prompt').and.returnValue('Desktop workflow edit');

    await component.openFile();
    component.overlayWidth = 400;
    component.overlayHeight = 600;
    component.addTextObject();
    await component.saveFileAs();
    await component.saveFile();

    expect(component.document?.id).toBe('workflow-doc');
    expect(component.overlayObjects[0].text).toBe('Desktop workflow edit');
    expect(pdfEditSerializationService.flattenEdits).toHaveBeenCalledWith(
      sourceBytes,
      1,
      400,
      600,
      component.overlayObjects,
      component.annotations
    );
    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith('workflow.pdf', jasmine.any(ArrayBuffer));
    expect(runtimeService.writeFile).toHaveBeenCalledWith(filePath, jasmine.any(ArrayBuffer));
  });

  it('completes an extension open-edit-download workflow through the extension runtime', async () => {
    const extensionGlobal = globalThis as typeof globalThis & {
      browser?: { runtime?: { sendMessage?: jasmine.Spy } };
    };
    const previousBrowser = extensionGlobal.browser;
    const sendMessage = jasmine.createSpy('sendMessage').and.resolveTo({
      success: true,
      filePath: 'browser-workflow.pdf',
    });
    extensionGlobal.browser = { runtime: { sendMessage } };
    const file = new File([new Uint8Array([1, 2])], 'browser-workflow.pdf', { type: 'application/pdf' });
    const sourceBytes = new Uint8Array([1, 2]);
    runtimeService.isDesktop.and.returnValue(false);
    runtimeService.openFileDialog.and.resolveTo({ canceled: false, file });
    runtimeService.saveFileDialog.and.callFake((name, data, mimeType) =>
      new ExtensionRuntimeAdapter().saveFileDialog(name, data, mimeType)
    );
    pdfDocumentService.loadFromFile.and.resolveTo({
      id: 'browser-workflow-doc',
      name: file.name,
      totalPages: 1,
      bytes: sourceBytes,
      proxy: {},
    } as any);
    pdfEditSerializationService.flattenEdits.and.resolveTo(new Uint8Array([3, 4, 5]));
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    spyOn(window, 'prompt').and.returnValue('Extension workflow edit');

    try {
      await component.openFile();
      component.overlayWidth = 400;
      component.overlayHeight = 600;
      component.addTextObject();
      await component.saveFile();

      expect(component.document?.id).toBe('browser-workflow-doc');
      expect(component.overlayObjects[0].text).toBe('Extension workflow edit');
      expect(sendMessage).toHaveBeenCalledWith(jasmine.objectContaining({
        type: 'EXT_DOWNLOAD_PDF',
        fileName: 'browser-workflow.pdf',
        mimeType: 'application/pdf',
        dataUrl: 'data:application/pdf;base64,AwQF',
      }));
    } finally {
      if (previousBrowser === undefined) delete extensionGlobal.browser;
      else extensionGlobal.browser = previousBrowser;
    }
  });

  it('stores autosave snapshots and offers crash recovery for a reopened document', async () => {
    const sourceBytes = new Uint8Array([1]);
    const snapshotBytes = new Uint8Array([9, 8, 7]);
    const snapshotBuffer = snapshotBytes.buffer.slice(0);
    const recoveredDocument = {
      id: 'stable-document-id',
      name: 'doc.pdf',
      totalPages: 2,
      bytes: snapshotBytes,
      proxy: {},
    };
    component.document = {
      id: 'stable-document-id',
      name: 'doc.pdf',
      totalPages: 1,
      bytes: sourceBytes,
      proxy: {},
    } as any;
    component.overlayWidth = 400;
    component.overlayHeight = 500;
    component.overlayObjects = [{
      id: 'text-1', type: 'text', x: 10, y: 20, width: 100, height: 40, label: 'Text', text: 'Recovered edit',
    }];
    pdfEditSerializationService.flattenEdits.and.resolveTo(snapshotBytes);
    await component.autosaveNow();
    expect(persistenceService.saveAutosave).toHaveBeenCalledWith('stable-document-id', jasmine.any(ArrayBuffer));

    const file = new File([sourceBytes], 'doc.pdf', { type: 'application/pdf' });
    runtimeService.openFileDialog.and.resolveTo({ canceled: false, file, fileName: 'doc.pdf' });
    pdfDocumentService.loadFromFile.and.resolveTo({
      id: 'stable-document-id', name: 'doc.pdf', totalPages: 1, bytes: sourceBytes, proxy: {},
    } as any);
    persistenceService.getAutosaveData.and.resolveTo(snapshotBuffer);
    pdfDocumentService.replaceCurrentDocumentBytes.and.resolveTo(recoveredDocument as any);
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.detectChanges();

    await component.openFile();

    expect(pdfDocumentService.replaceCurrentDocumentBytes).toHaveBeenCalledWith(snapshotBytes);
    expect(component.document?.bytes).toEqual(snapshotBytes);
    expect(component.totalPages).toBe(2);
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
    expect(component.searchMessage).toBe('Found 1 match on 1 page');
    expect(component.searchResults).toEqual([{ page: 2, count: 1, excerpt: 'target text' }]);
    expect(component.searchResultParts('target text')).toEqual([
      { text: 'target', match: true },
      { text: ' text', match: false },
    ]);
  });

  it('indexes page text once and supports case-sensitive regex search and result navigation', async () => {
    component.document = {
      id: 'doc-search-index',
      name: 'doc.pdf',
      totalPages: 2,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    pdfDocumentService.extractText.and.callFake(async (page: number) =>
      page === 1 ? 'Alpha alpha alphabet' : 'Beta alpha'
    );
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    component.searchQuery = 'alpha';
    fixture.detectChanges();

    await component.searchInDocument();
    expect(component.searchResults.map(result => result.count)).toEqual([3, 1]);
    expect(pdfDocumentService.extractText).toHaveBeenCalledTimes(2);
    await component.nextSearchResult();
    expect(component.currentPage).toBe(2);
    await component.previousSearchResult();
    expect(component.currentPage).toBe(1);

    component.searchCaseSensitive = true;
    await component.searchInDocument();
    expect(component.searchResults.map(result => result.count)).toEqual([2, 1]);
    component.searchRegexMode = true;
    component.searchQuery = '^Beta';
    await component.searchInDocument();
    expect(component.searchResults.map(result => result.page)).toEqual([2]);
    expect(pdfDocumentService.extractText).toHaveBeenCalledTimes(2);
  });

  it('reports invalid regular expressions and clears prior result rows', async () => {
    component.document = {
      id: 'doc-invalid-regex',
      name: 'doc.pdf',
      totalPages: 1,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    component.searchQuery = '[';
    component.searchRegexMode = true;
    fixture.detectChanges();

    await component.searchInDocument();

    expect(component.searchMessage).toContain('Invalid regular expression:');
    expect(component.searchResults).toEqual([]);
    expect(pdfDocumentService.extractText).not.toHaveBeenCalled();
  });

  it('bounds thumbnail memory for large documents', async () => {
    const bytes = new Uint8Array([1]);
    component.document = { id: 'doc-thumbnails', name: 'large.pdf', totalPages: 5000, bytes, proxy: {} } as any;
    component.totalPages = 5000;
    component.updateThumbnailWindow(0, 360);
    component.viewingMode = 'continuous';
    component.currentPage = 2500;
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    pdfRenderService.renderLoadedPageToCanvas.and.resolveTo();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.viewingPages.length).toBe(5);
    expect(fixture.nativeElement.querySelectorAll('[data-view-page]').length).toBe(5);
    expect(pdfRenderService.renderLoadedPageToCanvas.calls.count()).toBe(5);

    component.onMultiPageScroll({
      currentTarget: { scrollTop: 3500 * (component.estimatedPageHeight + 42) },
    } as unknown as Event);
    expect(component.currentPage).toBe(3501);
    expect(component.viewingPages).toContain(3501);

    expect(component.visibleThumbnailPages.length).toBeLessThan(20);
    expect(component.thumbnailSources.size).toBeGreaterThan(0);
    expect(pdfRenderService.renderPageToCanvas).toHaveBeenCalledWith(
      bytes,
      jasmine.any(Number),
      jasmine.any(HTMLCanvasElement),
      jasmine.objectContaining({ fitWidth: 120, fitHeight: 104 })
    );

    const viewport = fixture.nativeElement.querySelector('.thumbnail-viewport') as HTMLElement;
    viewport.scrollTop = 5000;
    viewport.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.visibleThumbnailPages).toContain(37);

    await component.goToPage(37);
    expect(component.currentPage).toBe(37);

    viewport.scrollTop = 4000 * component.thumbnailItemHeight;
    viewport.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    await fixture.whenStable();

    const visiblePages = new Set(component.visibleThumbnailPages);
    expect(component.visibleThumbnailPages).toContain(4001);
    expect([...component.thumbnailSources.keys()].every(page => visiblePages.has(page))).toBeTrue();
    expect([...component.thumbnailRenderStates.keys()].every(page => visiblePages.has(page))).toBeTrue();
    expect(component.thumbnailSources.size).toBeLessThanOrEqual(component.visibleThumbnailPages.length);
  });

  it('loads nested named and direct PDF bookmarks and navigates to their pages', async () => {
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    component.document = {
      id: 'doc-bookmarks',
      name: 'bookmarks.pdf',
      totalPages: 5,
      bytes: new Uint8Array([1]),
      proxy: {
        getOutline: async () => [
          { title: 'Chapter 1', dest: [{ ref: 'page-one' }], items: [
            { title: 'Section 1.1', dest: 'section-one' },
          ] },
        ],
        getDestination: async () => [{ ref: 'page-five' }],
        getPageIndex: async (reference: { ref: string }) => reference.ref === 'page-five' ? 4 : 0,
      },
    } as any;
    fixture.detectChanges();

    await component.loadBookmarks();

    expect(component.bookmarks).toEqual([
      { title: 'Chapter 1', page: 1, depth: 0 },
      { title: 'Section 1.1', page: 5, depth: 1 },
    ]);
    await component.navigateToBookmark(component.bookmarks[1]);
    expect(component.currentPage).toBe(5);
  });

  it('requires confirmation before deleting and reloads updated document bytes', async () => {
    const originalBytes = new Uint8Array([1]);
    const updatedBytes = new Uint8Array([2]);
    const updatedDocument = { id: 'doc-pages', name: 'doc.pdf', totalPages: 2, bytes: updatedBytes, proxy: {} };
    component.document = { id: 'doc-pages', name: 'doc.pdf', totalPages: 3, bytes: originalBytes, proxy: {} } as any;
    component.totalPages = 3;
    component.currentPage = 2;
    spyOn(window, 'confirm').and.returnValue(false);
    await component.deleteCurrentPage();
    expect(pdfPageOperationsService.deletePage).not.toHaveBeenCalled();

    (window.confirm as jasmine.Spy).and.returnValue(true);
    pdfPageOperationsService.deletePage.and.resolveTo(updatedBytes);
    pdfDocumentService.replaceCurrentDocumentBytes.and.resolveTo(updatedDocument as any);
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    await component.deleteCurrentPage();

    expect(pdfPageOperationsService.deletePage).toHaveBeenCalledWith(originalBytes, 2);
    expect(pdfDocumentService.replaceCurrentDocumentBytes).toHaveBeenCalledWith(updatedBytes);
    expect(component.totalPages).toBe(2);
    expect(component.currentPage).toBe(2);
  });

  it('inserts pages after the current page and reorders dragged thumbnails', async () => {
    const originalBytes = new Uint8Array([1]);
    const updatedBytes = new Uint8Array([2]);
    const updatedDocument = { id: 'doc-pages', name: 'doc.pdf', totalPages: 5, bytes: updatedBytes, proxy: {} };
    component.document = { id: 'doc-pages', name: 'doc.pdf', totalPages: 3, bytes: originalBytes, proxy: {} } as any;
    component.totalPages = 3;
    component.currentPage = 1;
    pdfPageOperationsService.insertPages.and.resolveTo(updatedBytes);
    pdfPageOperationsService.reorderPage.and.resolveTo(updatedBytes);
    pdfDocumentService.replaceCurrentDocumentBytes.and.resolveTo(updatedDocument as any);
    pdfRenderService.renderPageToCanvas.and.resolveTo();

    const file = new File([new Uint8Array([9])], 'insert.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    const change = new Event('change');
    Object.defineProperty(change, 'target', { value: input });
    await component.insertPagesFromFile(change);
    expect(pdfPageOperationsService.insertPages).toHaveBeenCalledWith(originalBytes, new Uint8Array([9]), 1);
    expect(component.currentPage).toBe(2);

    component.startPageDrag(new Event('dragstart') as DragEvent, 1);
    await component.dropPage(new Event('drop') as DragEvent, 3);
    expect(pdfPageOperationsService.reorderPage).toHaveBeenCalledWith(updatedBytes, 1, 3);
    expect(component.currentPage).toBe(3);
  });

  it('extracts the selected page range and saves a new PDF', async () => {
    const sourceBytes = new Uint8Array([1]);
    const extractedBytes = new Uint8Array([2, 3]);
    component.document = { id: 'doc-export', name: 'source.pdf', totalPages: 3, bytes: sourceBytes, proxy: {} } as any;
    spyOn(window, 'prompt').and.returnValue('1,3');
    pdfPageOperationsService.extractPages.and.resolveTo(extractedBytes);

    await component.extractSelectedPages();

    expect(pdfPageOperationsService.extractPages).toHaveBeenCalledWith(sourceBytes, '1,3');
    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith(
      'source-extracted.pdf',
      jasmine.any(ArrayBuffer)
    );
  });

  it('merges the open PDF with selected PDFs and saves split ranges separately', async () => {
    const sourceBytes = new Uint8Array([1]);
    const outputBytes = new Uint8Array([2]);
    component.document = { id: 'doc-export', name: 'source.pdf', totalPages: 4, bytes: sourceBytes, proxy: {} } as any;
    pdfPageOperationsService.mergePdfs.and.resolveTo(outputBytes);
    const file = new File([new Uint8Array([9])], 'other.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    const change = new Event('change');
    Object.defineProperty(change, 'target', { value: input });

    await component.mergePdfsFromFiles(change);
    expect(pdfPageOperationsService.mergePdfs).toHaveBeenCalledWith([sourceBytes, new Uint8Array([9])]);
    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith('source-merged.pdf', jasmine.any(ArrayBuffer));

    spyOn(window, 'prompt').and.returnValue('1-2,3-4');
    pdfPageOperationsService.splitByPageRanges.and.resolveTo([outputBytes, outputBytes]);
    await component.splitSelectedPages();
    expect(pdfPageOperationsService.splitByPageRanges).toHaveBeenCalledWith(sourceBytes, '1-2,3-4');
    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith('source-part-1.pdf', jasmine.any(ArrayBuffer));
    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith('source-part-2.pdf', jasmine.any(ArrayBuffer));
  });

  it('rotates selected pages and includes page transforms in undo and redo', async () => {
    const originalBytes = new Uint8Array([1]);
    const rotatedBytes = new Uint8Array([2]);
    const originalDocument = { id: 'doc-transform', name: 'doc.pdf', totalPages: 3, bytes: originalBytes, proxy: {} };
    const rotatedDocument = { ...originalDocument, bytes: rotatedBytes };
    component.document = originalDocument as any;
    component.totalPages = 3;
    component.currentPage = 2;
    component.selectedPages = [1, 3];
    pdfPageOperationsService.rotatePages.and.resolveTo(rotatedBytes);
    pdfDocumentService.replaceCurrentDocumentBytes.and.returnValues(
      Promise.resolve(rotatedDocument as any),
      Promise.resolve(originalDocument as any),
      Promise.resolve(rotatedDocument as any)
    );
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    fixture.detectChanges();

    await component.rotateSelectedPages(90);
    expect(pdfPageOperationsService.rotatePages).toHaveBeenCalledWith(originalBytes, [1, 3], 90);
    expect(component.canUndo).toBeTrue();
    await component.undoEdit();
    expect(pdfDocumentService.replaceCurrentDocumentBytes.calls.argsFor(1)[0]).toEqual(originalBytes);
    expect(component.canRedo).toBeTrue();
    await component.redoEdit();
    expect(pdfDocumentService.replaceCurrentDocumentBytes.calls.argsFor(2)[0]).toEqual(rotatedBytes);
  });

  it('draws a visual crop selection and applies it to the current page', async () => {
    const originalBytes = new Uint8Array([1]);
    const croppedBytes = new Uint8Array([2]);
    component.loading = false;
    component.document = { id: 'doc-crop', name: 'doc.pdf', totalPages: 1, bytes: originalBytes, proxy: {} } as any;
    component.totalPages = 1;
    component.overlayWidth = 200;
    component.overlayHeight = 200;
    pdfPageOperationsService.cropPage.and.resolveTo(croppedBytes);
    pdfDocumentService.replaceCurrentDocumentBytes.and.resolveTo({
      id: 'doc-crop', name: 'doc.pdf', totalPages: 1, bytes: croppedBytes, proxy: {},
    } as any);
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    fixture.detectChanges();
    const bounds = component.annotationLayer!.nativeElement.getBoundingClientRect();
    component.setCropMode(true);
    component.startCrop(new MouseEvent('mousedown', { button: 0, clientX: bounds.left + 20, clientY: bounds.top + 30 }));
    component.moveCrop(new MouseEvent('mousemove', { clientX: bounds.left + 120, clientY: bounds.top + 130 }));
    component.finishCrop();

    expect(Math.abs(component.cropSelection!.x - 20)).toBeLessThan(1);
    expect(Math.abs(component.cropSelection!.y - 30)).toBeLessThan(1);
    expect(component.cropSelection?.width).toBeCloseTo(100, 1);
    expect(component.cropSelection?.height).toBeCloseTo(100, 1);
    component.startCropResize(new MouseEvent('mousedown', {
      button: 0,
      clientX: bounds.left + 20,
      clientY: bounds.top + 30,
    }), 'nw');
    component.moveCrop(new MouseEvent('mousemove', {
      clientX: bounds.left + 40,
      clientY: bounds.top + 50,
    }));
    component.finishCrop();
    expect(Math.abs(component.cropSelection!.x - 40)).toBeLessThan(1);
    expect(Math.abs(component.cropSelection!.y - 50)).toBeLessThan(1);
    expect(component.cropSelection?.width).toBeCloseTo(80, 1);
    expect(component.cropSelection?.height).toBeCloseTo(80, 1);
    await component.applyCropSelection();
    const appliedCrop = pdfPageOperationsService.cropPage.calls.mostRecent().args[4];
    expect(pdfPageOperationsService.cropPage).toHaveBeenCalledWith(originalBytes, 1, 200, 200, appliedCrop);
    expect(Math.abs(appliedCrop.x - 40)).toBeLessThan(1);
    expect(component.cropMode).toBeFalse();
    expect(component.canUndo).toBeTrue();
  });

  it('renders detected form widgets and autosaves updated field values', async () => {
    const originalBytes = new Uint8Array([1]);
    const updatedBytes = new Uint8Array([2]);
    const annotations = [{
      id: 'widget-name',
      subtype: 'Widget',
      fieldName: 'applicant.name',
      fieldType: 'Tx',
      fieldFlags: 0,
      rect: [40, 400, 140, 450],
      isReadonly: false,
    }];
    const page = {
      getViewport: () => ({
        width: 400,
        height: 500,
        convertToViewportRectangle: (rect: number[]) => [rect[0], 500 - rect[3], rect[2], 500 - rect[1]],
      }),
      getAnnotations: async () => annotations,
    };
    const proxy = { getPage: async () => page };
    const originalDocument = { id: 'form-doc', name: 'form.pdf', totalPages: 1, bytes: originalBytes, proxy };
    const updatedDocument = { ...originalDocument, bytes: updatedBytes };
    component.loading = false;
    component.document = originalDocument as any;
    component.totalPages = 1;
    pdfFormService.getFields.and.resolveTo([
      { name: 'applicant.name', type: 'text', value: 'Before', options: [], required: false },
    ]);
    pdfFormService.updateField.and.resolveTo(updatedBytes);
    pdfDocumentService.replaceCurrentDocumentBytes.and.resolveTo(updatedDocument as any);
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    fixture.detectChanges();
    const canvas = component.viewerCanvas!.nativeElement;
    canvas.width = 200;
    canvas.height = 250;

    await component.goToPage(1);
    fixture.detectChanges();
    expect(component.formWidgets).toEqual([jasmine.objectContaining({
      name: 'applicant.name',
      type: 'text',
      x: 20,
      y: 25,
      width: 50,
      height: 25,
      value: 'Before',
    })]);
    const widget = component.formWidgets[0];
    await component.updateFormField(widget, 'After');
    expect(pdfFormService.updateField).toHaveBeenCalledWith(originalBytes, 'applicant.name', 'After');
    await new Promise(resolve => setTimeout(resolve, 900));
    expect(persistenceService.saveAutosave).toHaveBeenCalledWith('form-doc', jasmine.any(ArrayBuffer));
  });

  it('persists and applies per-document field visibility rules', async () => {
    const fields = [
      { name: 'applicant.consent', type: 'text' as const, value: 'yes', options: [], required: false },
      { name: 'applicant.details', type: 'text' as const, value: '', options: [], required: true },
    ];
    const annotations = fields.map((field, index) => ({
      id: field.name,
      subtype: 'Widget',
      fieldName: field.name,
      fieldType: 'Tx',
      fieldFlags: 0,
      rect: [20, 400 - index * 30, 180, 420 - index * 30],
      isReadonly: false,
    }));
    const page = {
      getViewport: () => ({
        width: 400,
        height: 500,
        convertToViewportRectangle: (rect: number[]) => [rect[0], 500 - rect[3], rect[2], 500 - rect[1]],
      }),
      getAnnotations: async () => annotations,
    };
    component.loading = false;
    component.document = {
      id: 'conditional-form',
      name: 'form.pdf',
      totalPages: 1,
      bytes: new Uint8Array([1]),
      proxy: { getPage: async () => page },
    } as any;
    component.totalPages = 1;
    component.overlayWidth = 400;
    component.overlayHeight = 500;
    component.formFields = fields;
    component.selectedFormFieldName = 'applicant.details';
    pdfFormService.getFields.and.resolveTo(fields);
    const rule = { targetFieldName: 'applicant.details', sourceFieldName: 'applicant.consent', equalsValue: 'yes' };
    persistenceService.getSetting.and.resolveTo([rule]);
    const prompt = spyOn(window, 'prompt').and.returnValues('applicant.consent', 'yes');
    fixture.detectChanges();

    await component.setSelectedFieldCondition();
    expect(prompt).toHaveBeenCalledTimes(2);
    expect(persistenceService.setSetting).toHaveBeenCalledWith('pdf-form-visibility:conditional-form', [rule]);
    expect(component.formWidgets.map(widget => widget.name)).toEqual(['applicant.consent', 'applicant.details']);

    pdfFormService.getFields.and.resolveTo([
      { ...fields[0], value: 'no' },
      fields[1],
    ]);
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    await component.goToPage(1);
    expect(component.formWidgets.map(widget => widget.name)).toEqual(['applicant.consent']);
  });

  it('exports form values as JSON and imports values into the open PDF', async () => {
    const originalBytes = new Uint8Array([1]);
    const importedBytes = new Uint8Array([2]);
    const originalDocument = { id: 'form-transfer', name: 'sample.pdf', totalPages: 1, bytes: originalBytes, proxy: {} };
    const importedDocument = { ...originalDocument, bytes: importedBytes };
    component.loading = false;
    component.document = originalDocument as any;
    component.totalPages = 1;
    pdfFormService.exportFormData.and.resolveTo('{"schemaVersion":1,"fields":[]}');
    pdfFormService.importFormData.and.resolveTo(importedBytes);
    pdfDocumentService.replaceCurrentDocumentBytes.and.resolveTo(importedDocument as any);
    pdfRenderService.renderPageToCanvas.and.resolveTo();
    fixture.detectChanges();

    await component.exportFormData();
    expect(runtimeService.saveFileDialog).toHaveBeenCalledWith(
      'sample-form-data.json',
      jasmine.any(ArrayBuffer),
      'application/json'
    );

    const json = '{"schemaVersion":1,"fields":[]}';
    const input = globalThis.document.createElement('input');
    Object.defineProperty(input, 'files', {
      value: [new File([json], 'sample-form-data.json', { type: 'application/json' })],
    });
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: input });
    await component.importFormDataFile(event);
    expect(pdfFormService.importFormData).toHaveBeenCalledWith(originalBytes, json);
    expect(component.document?.bytes).toEqual(importedBytes);
  });

  it('draws, types, uploads, places, and saves reusable signatures locally', async () => {
    component.loading = false;
    component.document = {
      id: 'signature-doc',
      name: 'signature.pdf',
      totalPages: 1,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    component.overlayWidth = 600;
    component.overlayHeight = 800;
    persistenceService.getSetting.and.resolveTo([]);
    fixture.detectChanges();

    await component.openSignatureDialog('signature');
    fixture.detectChanges();
    const canvas = component.signatureCanvas!.nativeElement;
    component.startSignatureStroke(new PointerEvent('pointerdown', { clientX: 10, clientY: 10 }));
    component.continueSignatureStroke(new PointerEvent('pointermove', { clientX: 120, clientY: 80 }));
    component.finishSignatureStroke();
    expect(component.signatureReady).toBeTrue();
    component.placeCurrentSignature();
    expect(component.overlayObjects[0].label).toBe('Signature');
    expect(component.overlayObjects[0].imageSrc).toMatch(/^data:image\/png;base64,/);

    await component.openSignatureDialog('initials');
    component.setSignatureMode('type');
    component.signatureText = 'JD';
    spyOn(window, 'prompt').and.returnValue('Jordan initials');
    await component.saveReusableSignature();
    expect(persistenceService.setSetting).toHaveBeenCalledWith(
      'pdf-signature-assets',
      jasmine.arrayContaining([jasmine.objectContaining({ name: 'Jordan initials', kind: 'initials' })])
    );
    const typedAsset = component.signatureAssets[0];
    component.placeSignatureAsset(typedAsset);
    expect(component.overlayObjects[1].label).toBe('Initials');

    await component.openSignatureDialog('signature');
    component.setSignatureMode('upload');
    const fileInput = globalThis.document.createElement('input');
    Object.defineProperty(fileInput, 'files', {
      value: [new File([new Uint8Array([1, 2, 3])], 'signature.png', { type: 'image/png' })],
    });
    const uploadEvent = new Event('change');
    Object.defineProperty(uploadEvent, 'target', { value: fileInput });
    await component.loadSignatureFile(uploadEvent);
    expect(component.signatureReady).toBeTrue();
    component.placeCurrentSignature();
    expect(component.overlayObjects[2].imageSrc).toMatch(/^data:image\/png;base64,/);
    expect(canvas.width).toBe(420);
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

  it('creates, edits, removes, and navigates internal page links with undo and redo', async () => {
    spyOn(window, 'prompt').and.returnValues('page:2', 'Go to page 2', 'page:3', 'Go to page 3');
    component.totalPages = 3;
    component.overlayWidth = 600;
    component.overlayHeight = 400;

    component.addLinkObject();
    const created = component.overlayObjects[0];
    expect(created.pageNumber).toBe(2);
    expect(created.url).toBeUndefined();

    component.selectedObjectId = created.id;
    component.editSelection();
    expect(component.overlayObjects[0].pageNumber).toBe(3);
    await component.undoEdit();
    expect(component.overlayObjects[0].pageNumber).toBe(2);
    await component.redoEdit();
    expect(component.overlayObjects[0].pageNumber).toBe(3);

    component.document = {
      id: 'doc-internal-link',
      name: 'links.pdf',
      totalPages: 3,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    const clickEvent = new MouseEvent('click', { cancelable: true });
    component.activateLink(clickEvent, component.overlayObjects[0]);
    expect(clickEvent.defaultPrevented).toBeTrue();
    expect(component.currentPage).toBe(3);

    component.selectedObjectId = component.overlayObjects[0].id;
    component.deleteSelection();
    expect(component.overlayObjects).toHaveSize(0);
    await component.undoEdit();
    expect(component.overlayObjects[0].pageNumber).toBe(3);
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

  it('supports undo and redo keyboard shortcuts', () => {
    spyOn(window, 'prompt').and.returnValue('Keyboard edit');
    component.overlayWidth = 600;
    component.overlayHeight = 400;
    component.addTextObject();

    const undo = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    component.onKeydown(undo);
    expect(undo.defaultPrevented).toBeTrue();
    expect(component.overlayObjects.length).toBe(0);

    const redo = new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, cancelable: true });
    component.onKeydown(redo);
    expect(redo.defaultPrevented).toBeTrue();
    expect(component.overlayObjects.length).toBe(1);
  });

  it('supports page and zoom keyboard controls without hijacking form input keys', () => {
    component.document = {
      id: 'keyboard-doc',
      name: 'keyboard.pdf',
      totalPages: 3,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    component.totalPages = 3;
    component.overlayObjects = [{
      id: 'selected-object',
      type: 'text',
      x: 10,
      y: 10,
      width: 100,
      height: 40,
      label: 'Text',
    }];
    component.selectedObjectId = 'selected-object';

    const pageDown = new KeyboardEvent('keydown', { key: 'PageDown', cancelable: true });
    component.onKeydown(pageDown);
    expect(pageDown.defaultPrevented).toBeTrue();
    expect(component.currentPage).toBe(2);

    const zoomIn = new KeyboardEvent('keydown', { key: '+', cancelable: true });
    component.onKeydown(zoomIn);
    expect(zoomIn.defaultPrevented).toBeTrue();
    expect(component.zoom).toBeCloseTo(1.1);

    const input = document.createElement('input');
    const deleteFromInput = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true });
    Object.defineProperty(deleteFromInput, 'target', { value: input });
    component.onKeydown(deleteFromInput);
    expect(deleteFromInput.defaultPrevented).toBeFalse();
    expect(component.overlayObjects).toHaveSize(1);
  });

  it('exposes accessible labels for the page canvas and navigation controls', () => {
    component.document = {
      id: 'a11y-doc',
      name: 'accessible.pdf',
      totalPages: 2,
      bytes: new Uint8Array([1]),
      proxy: {},
    } as any;
    component.totalPages = 2;
    fixture.detectChanges();

    const canvas = fixture.nativeElement.querySelector('canvas[role="img"]') as HTMLCanvasElement;
    expect(canvas.getAttribute('aria-label')).toBe('PDF page 1 of 2');
    expect(canvas.getAttribute('aria-describedby')).toBe('viewer-keyboard-help');
    expect(fixture.nativeElement.querySelector('[aria-label="Previous page"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Next page"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Page layout"]')).not.toBeNull();
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
