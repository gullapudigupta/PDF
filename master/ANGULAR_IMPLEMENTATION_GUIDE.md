# Angular + Electron PDF Viewer & Editor - Implementation Guide

## Project Decision: Electron + Angular + TypeScript

This document provides the detailed Angular implementation strategy for your PDF viewer and editor project.

---

## 1. ANGULAR TECH STACK FINALIZED

### Core Stack
```
├─ Language: TypeScript 5.x
├─ Framework: Angular 22.x (latest)
├─ UI Framework: Angular Material v22
├─ State Management: NgRx (or Ngxs as lighter alternative)
├─ Build Tool: Angular CLI (Webpack)
├─ Testing: Jasmine + Karma
├─ Package Manager: npm 10+
├─ Node Version: 20 LTS+
└─ Desktop: Electron 27.x
```

### PDF & Supporting Libraries
```
├─ PDF Rendering: PDF.js v4.x
├─ PDF Manipulation: pdf-lib v1.x
├─ HTTP Client: @angular/common/http
├─ Forms: @angular/forms (Reactive Forms)
├─ Routing: @angular/router
├─ State: @ngrx/store (or @ngrx/signals for newer pattern)
└─ Utilities: rxjs, lodash
```

### Development Tools
```
├─ IDE: Visual Studio Code
├─ Extensions: Angular Language Service
├─ Linting: ESLint + Angular rules
├─ Formatting: Prettier
├─ Pre-commit: Husky + lint-staged
├─ Git Hooks: Commit & Push validation
└─ Debugging: Angular DevTools + Chrome DevTools
```

---

## 2. PROJECT INITIALIZATION

### Step 1: Create Angular Project

```bash
# Install Angular CLI globally
npm install -g @angular/cli@22

# Create new Angular project
ng new pdf-viewer-editor --routing --style=scss

# Navigate to project
cd pdf-viewer-editor

# Add Electron support
npm install --save-dev electron electron-builder electron-preload
```

### Step 2: Project Structure

```
pdf-viewer-editor/
├─ src/
│  ├─ app/
│  │  ├─ modules/
│  │  │  ├─ pdf-viewer/
│  │  │  │  ├─ components/
│  │  │  │  │  ├─ viewer/
│  │  │  │  │  ├─ toolbar/
│  │  │  │  │  ├─ sidebar/
│  │  │  │  │  └─ annotations-panel/
│  │  │  │  ├─ services/
│  │  │  │  │  ├─ pdf.service.ts
│  │  │  │  │  └─ annotation.service.ts
│  │  │  │  ├─ models/
│  │  │  │  │  ├─ pdf.model.ts
│  │  │  │  │  └─ annotation.model.ts
│  │  │  │  ├─ store/ (NgRx)
│  │  │  │  │  ├─ pdf.state.ts
│  │  │  │  │  ├─ pdf.actions.ts
│  │  │  │  │  ├─ pdf.reducer.ts
│  │  │  │  │  ├─ pdf.effects.ts
│  │  │  │  │  └─ pdf.selector.ts
│  │  │  │  └─ pdf-viewer.module.ts
│  │  │  │
│  │  │  └─ shared/
│  │  │     ├─ components/
│  │  │     ├─ pipes/
│  │  │     ├─ directives/
│  │  │     └─ shared.module.ts
│  │  │
│  │  ├─ core/
│  │  │  ├─ services/
│  │  │  │  ├─ electron.service.ts
│  │  │  │  ├─ storage.service.ts
│  │  │  │  └─ error-handler.service.ts
│  │  │  ├─ interceptors/
│  │  │  ├─ guards/
│  │  │  └─ core.module.ts
│  │  │
│  │  ├─ app.component.ts
│  │  ├─ app.component.html
│  │  ├─ app.component.scss
│  │  ├─ app.routes.ts
│  │  └─ app.module.ts
│  │
│  ├─ assets/
│  ├─ styles/
│  ├─ main.ts
│  ├─ index.html
│  └─ styles.scss
│
├─ electron/
│  ├─ main.ts (Electron main process)
│  ├─ preload.ts
│  └─ types.ts
│
├─ angular.json
├─ tsconfig.json
├─ tsconfig.app.json
├─ tsconfig.spec.json
├─ package.json
├─ electron-builder.json
└─ README.md
```

### Step 3: Install Dependencies

```bash
# Angular + Material
npm install @angular/material @angular/cdk
ng add @angular/material

# State Management (NgRx)
npm install @ngrx/store @ngrx/effects @ngrx/store-devtools @ngrx/entity
npm install --save-dev @ngrx/schematics
ng config cli.defaultCollection @ngrx/schematics

# PDF Libraries
npm install pdfjs-dist pdf-lib

# Electron IPC
npm install electron-store

# Utilities
npm install lodash-es rxjs
npm install --save-dev @types/lodash-es
```

---

## 3. ANGULAR MODULES ARCHITECTURE

### CoreModule (Singleton Services)

```typescript
// core/core.module.ts
import { NgModule } from '@angular/core';
import { ElectronService } from './services/electron.service';
import { StorageService } from './services/storage.service';
import { ErrorHandlerService } from './services/error-handler.service';

@NgModule({
  providers: [
    ElectronService,
    StorageService,
    ErrorHandlerService,
  ],
})
export class CoreModule {}
```

**Services in CoreModule:**
- `ElectronService` - Communicate with Electron main process
- `StorageService` - SQLite and local storage
- `ErrorHandlerService` - Global error handling
- `LoggerService` - Application logging

---

### SharedModule (Common Components & Pipes)

```typescript
// shared/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule, MatIconModule, MatToolbarModule } from '@angular/material';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { FileSizePipe } from './pipes/file-size.pipe';

@NgModule({
  declarations: [SpinnerComponent, FileSizePipe],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
  ],
  exports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    SpinnerComponent,
    FileSizePipe,
  ],
})
export class SharedModule {}
```

---

### PdfViewerModule (Feature Module)

```typescript
// modules/pdf-viewer/pdf-viewer.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { SharedModule } from '@app/shared/shared.module';

import { PdfViewerComponent } from './components/viewer/viewer.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AnnotationsPanelComponent } from './components/annotations-panel/annotations-panel.component';

import { PdfService } from './services/pdf.service';
import { AnnotationService } from './services/annotation.service';

import { pdfReducer } from './store/pdf.reducer';
import { PdfEffects } from './store/pdf.effects';

@NgModule({
  declarations: [
    PdfViewerComponent,
    ToolbarComponent,
    SidebarComponent,
    AnnotationsPanelComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    StoreModule.forFeature('pdf', pdfReducer),
    EffectsModule.forFeature([PdfEffects]),
  ],
  providers: [PdfService, AnnotationService],
})
export class PdfViewerModule {}
```

---

## 4. NGRX STATE MANAGEMENT

### PDF State Structure

```typescript
// modules/pdf-viewer/store/pdf.state.ts
export interface PdfState {
  // Document
  currentDocument: PdfDocument | null;
  documentList: PdfDocument[];
  loading: boolean;
  error: string | null;

  // Navigation
  currentPage: number;
  totalPages: number;
  zoom: number;
  rotation: number;

  // Annotations
  annotations: Annotation[];
  selectedAnnotationId: string | null;

  // UI
  sidebarOpen: boolean;
  annotationsPanelOpen: boolean;
}

export interface PdfDocument {
  id: string;
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  pages: number;
}

export interface Annotation {
  id: string;
  pageNumber: number;
  type: 'highlight' | 'note' | 'drawing' | 'shape';
  color: string;
  content: string;
  position: { x: number; y: number };
  createdAt: Date;
}
```

### Actions

```typescript
// modules/pdf-viewer/store/pdf.actions.ts
import { createAction, props } from '@ngrx/store';

// Document Actions
export const loadDocument = createAction(
  '[PDF] Load Document',
  props<{ path: string }>()
);

export const loadDocumentSuccess = createAction(
  '[PDF] Load Document Success',
  props<{ document: PdfDocument; pages: number }>()
);

export const loadDocumentError = createAction(
  '[PDF] Load Document Error',
  props<{ error: string }>()
);

// Navigation Actions
export const goToPage = createAction(
  '[PDF] Go To Page',
  props<{ page: number }>()
);

export const setZoom = createAction(
  '[PDF] Set Zoom',
  props<{ zoom: number }>()
);

// Annotation Actions
export const addAnnotation = createAction(
  '[PDF] Add Annotation',
  props<{ annotation: Annotation }>()
);

export const removeAnnotation = createAction(
  '[PDF] Remove Annotation',
  props<{ id: string }>()
);

export const updateAnnotation = createAction(
  '[PDF] Update Annotation',
  props<{ annotation: Annotation }>()
);
```

### Reducer

```typescript
// modules/pdf-viewer/store/pdf.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as PdfActions from './pdf.actions';
import { PdfState } from './pdf.state';

export const initialState: PdfState = {
  currentDocument: null,
  documentList: [],
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 100,
  rotation: 0,
  annotations: [],
  selectedAnnotationId: null,
  sidebarOpen: true,
  annotationsPanelOpen: true,
};

export const pdfReducer = createReducer(
  initialState,

  // Load document
  on(PdfActions.loadDocument, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(PdfActions.loadDocumentSuccess, (state, { document, pages }) => ({
    ...state,
    currentDocument: document,
    totalPages: pages,
    loading: false,
    currentPage: 1,
  })),

  on(PdfActions.loadDocumentError, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Navigation
  on(PdfActions.goToPage, (state, { page }) => ({
    ...state,
    currentPage: Math.min(Math.max(1, page), state.totalPages),
  })),

  on(PdfActions.setZoom, (state, { zoom }) => ({
    ...state,
    zoom: Math.min(Math.max(50, zoom), 400),
  })),

  // Annotations
  on(PdfActions.addAnnotation, (state, { annotation }) => ({
    ...state,
    annotations: [...state.annotations, annotation],
  })),

  on(PdfActions.removeAnnotation, (state, { id }) => ({
    ...state,
    annotations: state.annotations.filter((a) => a.id !== id),
  })),
);
```

### Effects

```typescript
// modules/pdf-viewer/store/pdf.effects.ts
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import * as PdfActions from './pdf.actions';
import { PdfService } from '../services/pdf.service';

@Injectable()
export class PdfEffects {
  loadDocument$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PdfActions.loadDocument),
      switchMap(({ path }) =>
        this.pdfService.loadDocument(path).pipe(
          map((result) =>
            PdfActions.loadDocumentSuccess({
              document: result.document,
              pages: result.pages,
            })
          ),
          catchError((error) =>
            of(PdfActions.loadDocumentError({ error: error.message }))
          )
        )
      )
    )
  );

  constructor(private actions$: Actions, private pdfService: PdfService) {}
}
```

### Selectors

```typescript
// modules/pdf-viewer/store/pdf.selector.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PdfState } from './pdf.state';

export const selectPdfState = createFeatureSelector<PdfState>('pdf');

export const selectCurrentDocument = createSelector(
  selectPdfState,
  (state: PdfState) => state.currentDocument
);

export const selectCurrentPage = createSelector(
  selectPdfState,
  (state: PdfState) => state.currentPage
);

export const selectTotalPages = createSelector(
  selectPdfState,
  (state: PdfState) => state.totalPages
);

export const selectZoom = createSelector(
  selectPdfState,
  (state: PdfState) => state.zoom
);

export const selectAnnotations = createSelector(
  selectPdfState,
  (state: PdfState) => state.annotations
);

export const selectLoading = createSelector(
  selectPdfState,
  (state: PdfState) => state.loading
);
```

---

## 5. SERVICES IMPLEMENTATION

### PdfService (Core PDF Logic)

```typescript
// modules/pdf-viewer/services/pdf.service.ts
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import * as pdfjsLib from 'pdfjs-dist';
import { ElectronService } from '@app/core/services/electron.service';

@Injectable()
export class PdfService {
  private pdfDocument: any = null;

  constructor(private electronService: ElectronService) {
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }

  loadDocument(path: string): Observable<{ document: any; pages: number }> {
    return from(
      (async () => {
        try {
          const pdfData = await this.electronService.readFile(path);
          this.pdfDocument = await pdfjsLib.getDocument({
            data: pdfData,
          }).promise;

          return {
            document: {
              id: Date.now().toString(),
              name: path.split('/').pop() || 'Document',
              path,
              size: pdfData.length,
              createdAt: new Date(),
              modifiedAt: new Date(),
              pages: this.pdfDocument.numPages,
            },
            pages: this.pdfDocument.numPages,
          };
        } catch (error) {
          throw new Error(`Failed to load PDF: ${error.message}`);
        }
      })()
    );
  }

  renderPage(pageNumber: number, scale: number = 1.5): Observable<HTMLCanvasElement> {
    return from(
      (async () => {
        if (!this.pdfDocument) {
          throw new Error('No PDF loaded');
        }

        const page = await this.pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        return canvas;
      })()
    );
  }

  extractText(pageNumber: number): Observable<string> {
    return from(
      (async () => {
        if (!this.pdfDocument) {
          throw new Error('No PDF loaded');
        }

        const page = await this.pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        return textContent.items.map((item: any) => item.str).join(' ');
      })()
    );
  }
}
```

### AnnotationService

```typescript
// modules/pdf-viewer/services/annotation.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Annotation } from '../store/pdf.state';

@Injectable()
export class AnnotationService {
  private annotationsSubject = new BehaviorSubject<Annotation[]>([]);
  public annotations$ = this.annotationsSubject.asObservable();

  addAnnotation(annotation: Annotation): void {
    const current = this.annotationsSubject.value;
    this.annotationsSubject.next([...current, annotation]);
  }

  removeAnnotation(id: string): void {
    const current = this.annotationsSubject.value;
    this.annotationsSubject.next(current.filter((a) => a.id !== id));
  }

  updateAnnotation(annotation: Annotation): void {
    const current = this.annotationsSubject.value;
    const index = current.findIndex((a) => a.id === annotation.id);
    if (index >= 0) {
      const updated = [...current];
      updated[index] = annotation;
      this.annotationsSubject.next(updated);
    }
  }

  getAnnotations(): Observable<Annotation[]> {
    return this.annotations$;
  }
}
```

### ElectronService

```typescript
// core/services/electron.service.ts
import { Injectable } from '@angular/core';
import { ipcRenderer } from 'electron';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  ipcRenderer: typeof ipcRenderer | undefined;

  constructor() {
    if (window && (window as any).electronAPI) {
      this.ipcRenderer = (window as any).electronAPI;
    }
  }

  readFile(path: string): Promise<Uint8Array> {
    return this.ipcRenderer?.invoke('read-file', path) || Promise.reject();
  }

  saveFile(path: string, data: Uint8Array): Promise<void> {
    return this.ipcRenderer?.invoke('save-file', path, data) || Promise.reject();
  }

  showOpenDialog(options: any): Promise<string[]> {
    return this.ipcRenderer?.invoke('show-open-dialog', options) || Promise.reject();
  }

  showSaveDialog(options: any): Promise<string> {
    return this.ipcRenderer?.invoke('show-save-dialog', options) || Promise.reject();
  }
}
```

---

## 6. COMPONENT STRUCTURE

### PdfViewerComponent (Main Container)

```typescript
// modules/pdf-viewer/components/viewer/viewer.component.ts
import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { PdfState } from '../../store/pdf.state';
import * as PdfActions from '../../store/pdf.actions';
import {
  selectCurrentPage,
  selectTotalPages,
  selectZoom,
  selectLoading,
} from '../../store/pdf.selector';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss'],
})
export class PdfViewerComponent implements OnInit {
  currentPage$ = this.store.select(selectCurrentPage);
  totalPages$ = this.store.select(selectTotalPages);
  zoom$ = this.store.select(selectZoom);
  loading$ = this.store.select(selectLoading);

  constructor(private store: Store<PdfState>) {}

  ngOnInit(): void {}

  goToPage(page: number): void {
    this.store.dispatch(PdfActions.goToPage({ page }));
  }

  setZoom(zoom: number): void {
    this.store.dispatch(PdfActions.setZoom({ zoom }));
  }

  openDocument(path: string): void {
    this.store.dispatch(PdfActions.loadDocument({ path }));
  }
}
```

---

## 7. TESTING STRATEGY

### Unit Test Example

```typescript
// modules/pdf-viewer/services/pdf.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { PdfService } from './pdf.service';
import { ElectronService } from '@app/core/services/electron.service';

describe('PdfService', () => {
  let service: PdfService;
  let mockElectronService: jasmine.SpyObj<ElectronService>;

  beforeEach(() => {
    const electronServiceSpy = jasmine.createSpyObj(
      'ElectronService',
      ['readFile']
    );

    TestBed.configureTestingModule({
      providers: [
        PdfService,
        { provide: ElectronService, useValue: electronServiceSpy },
      ],
    });

    service = TestBed.inject(PdfService);
    mockElectronService = TestBed.inject(
      ElectronService
    ) as jasmine.SpyObj<ElectronService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load a PDF document', (done) => {
    const mockPdfData = new Uint8Array([1, 2, 3]);
    mockElectronService.readFile.and.returnValue(Promise.resolve(mockPdfData));

    service.loadDocument('/path/to/file.pdf').subscribe((result) => {
      expect(result.pages).toBeGreaterThan(0);
      done();
    });
  });
});
```

---

## 8. BUILD & DEPLOYMENT

### Building for Electron

```bash
# Build Angular for production
ng build --configuration production

# Package with Electron Builder
npm run electron:build

# Create installers for all platforms
npm run electron:build -- -mwl
```

### electron-builder.json Configuration

```json
{
  "appId": "com.pdf-viewer.app",
  "productName": "PDF Viewer & Editor",
  "directories": {
    "buildResources": "assets",
    "output": "dist"
  },
  "files": [
    "dist/**/*",
    "node_modules/**/*",
    "package.json",
    "electron/**/*"
  ],
  "win": {
    "target": ["msi", "portable"]
  },
  "mac": {
    "target": ["dmg", "zip"]
  },
  "linux": {
    "target": ["AppImage", "deb"]
  }
}
```

---

## 9. MIGRATION FROM REACT (If Needed)

If you ever need to migrate from React to Angular:

✅ **NOT RECOMMENDED** - but if absolutely needed:

1. Run project with React-based prototype
2. Evaluate real performance bottlenecks
3. Only migrate if data-driven results show need
4. Timeline: 2-3 months for migration
5. Alternative: Add Rust/Tauri bridge to React instead

---

## 10. ADVANTAGES OF ANGULAR CHOICE

| Aspect | Angular Benefit |
|--------|-----------------|
| **Structure** | Clear folder organization, no debates on structure |
| **Onboarding** | New developers follow established patterns |
| **Scalability** | Handles 5+ developers easily |
| **Maintenance** | Code stays consistent over years |
| **Type Safety** | TypeScript + strict patterns |
| **Observable Handling** | RxJS built-in, easier reactive patterns |
| **Testing** | Testing infrastructure built-in |
| **IDE Support** | Best Angular Language Service support |
| **Documentation** | Comprehensive official docs |
| **Production Ready** | Used by enterprises worldwide |

---

## Recommended Timeline

- **Weeks 1-2**: Angular project setup, architecture finalization
- **Weeks 3-4**: Create modules and core services
- **Weeks 5-6**: Implement PDF rendering with PDF.js
- **Weeks 7-8**: Build annotation system with NgRx
- **Weeks 9-10**: Page manipulation and navigation
- **Weeks 11-12**: Testing, optimization, and polish
- **Week 13**: Electron packaging and deployment setup

**Total: ~4-5 months to MVP with Angular**

---

## Resources for Angular Development

- Angular Official Docs: https://angular.io/docs
- Angular Material: https://material.angular.io/
- NgRx Store: https://ngrx.io/
- RxJS: https://rxjs.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- Electron + Angular Guide: https://github.com/maximegris/angular-electron
- PDF.js Documentation: https://mozilla.github.io/pdf.js/getting_started/

---

## Success Criteria

✅ Project setup complete with all dependencies  
✅ Angular architecture with modules established  
✅ NgRx store managing PDF state  
✅ PDF rendering working with PDF.js  
✅ Annotation system functional  
✅ Unit tests at 60%+ coverage  
✅ Electron packaging working  
✅ Ready for Phase 2 development  

**This Angular-based approach ensures a professional, maintainable, enterprise-grade PDF application!**
