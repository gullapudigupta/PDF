# PDF Viewer & Editor - Design Document

**Project**: PDF Viewer & Editor  
**Framework**: Electron + Angular + TypeScript  
**Version**: 1.0  
**Date**: June 16, 2026

---

## 📐 Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                      │
│                    (Angular Components)                      │
├─────────────────────────────────────────────────────────────┤
│ • Viewer Component    • Toolbar Component                   │
│ • Sidebar Component   • Annotations Panel Component         │
└─────────────────────────────────────────────────────────────┘
                              ↑↓
┌─────────────────────────────────────────────────────────────┐
│                  STATE MANAGEMENT LAYER                      │
│                        (NgRx Store)                          │
├─────────────────────────────────────────────────────────────┤
│ • Store: PDF State        • Selectors: Query State          │
│ • Actions: Dispatch Calls  • Reducers: State Updates        │
│ • Effects: Side Effects    • Devtools: Debugging            │
└─────────────────────────────────────────────────────────────┘
                              ↑↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVICES LAYER                            │
│              (Business Logic & Integration)                  │
├─────────────────────────────────────────────────────────────┤
│ • PdfService           • AnnotationService                  │
│ • ElectronService      • StorageService                     │
│ • ErrorHandlerService  • LoggerService                      │
└─────────────────────────────────────────────────────────────┘
                              ↑↓
┌─────────────────────────────────────────────────────────────┐
│                   PDF PROCESSING LAYER                       │
│              (PDF.js, pdf-lib Libraries)                    │
├─────────────────────────────────────────────────────────────┤
│ • PDF Rendering       • PDF Manipulation                    │
│ • Text Extraction     • Annotation Embedding                │
│ • Page Operations     • Metadata Handling                   │
└─────────────────────────────────────────────────────────────┘
                              ↑↓
┌─────────────────────────────────────────────────────────────┐
│                  ELECTRON LAYER                              │
│           (Desktop Integration & File System)               │
├─────────────────────────────────────────────────────────────┤
│ • Main Process        • IPC Communication                   │
│ • File Operations     • Window Management                   │
│ • System Integration  • Native Dialogs                      │
└─────────────────────────────────────────────────────────────┘
                              ↑↓
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                 │
│              (SQLite, File System)                          │
├─────────────────────────────────────────────────────────────┤
│ • Local Database      • File I/O                            │
│ • Settings Storage    • Cache Management                    │
│ • Document Storage    • Temporary Files                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Project Structure

### Folder Organization

```
pdf-viewer-editor/
│
├── src/
│   ├── app/
│   │   ├── core/                    # Singleton services
│   │   │   ├── services/
│   │   │   │   ├── electron.service.ts
│   │   │   │   ├── storage.service.ts
│   │   │   │   ├── error-handler.service.ts
│   │   │   │   └── logger.service.ts
│   │   │   ├── interceptors/
│   │   │   ├── guards/
│   │   │   └── core.module.ts
│   │   │
│   │   ├── shared/                 # Reusable components
│   │   │   ├── components/
│   │   │   │   ├── spinner/
│   │   │   │   ├── dialog/
│   │   │   │   └── confirm-dialog/
│   │   │   ├── pipes/
│   │   │   │   ├── file-size.pipe.ts
│   │   │   │   └── date-format.pipe.ts
│   │   │   ├── directives/
│   │   │   └── shared.module.ts
│   │   │
│   │   ├── modules/                # Feature modules
│   │   │   └── pdf-viewer/
│   │   │       ├── components/
│   │   │       │   ├── viewer/     # Main PDF canvas
│   │   │       │   ├── toolbar/    # Controls
│   │   │       │   ├── sidebar/    # Thumbnails
│   │   │       │   ├── annotations-panel/
│   │   │       │   ├── search/
│   │   │       │   └── pagination/
│   │   │       ├── services/
│   │   │       │   ├── pdf.service.ts
│   │   │       │   └── annotation.service.ts
│   │   │       ├── models/
│   │   │       │   ├── pdf.model.ts
│   │   │       │   └── annotation.model.ts
│   │   │       ├── store/          # NgRx state
│   │   │       │   ├── pdf.state.ts
│   │   │       │   ├── pdf.actions.ts
│   │   │       │   ├── pdf.reducer.ts
│   │   │       │   ├── pdf.effects.ts
│   │   │       │   └── pdf.selector.ts
│   │   │       └── pdf-viewer.module.ts
│   │   │
│   │   ├── app.component.ts        # Root component
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.routes.ts
│   │   └── app.module.ts
│   │
│   ├── assets/                     # Static assets
│   ├── styles/
│   │   └── styles.scss             # Global styles
│   ├── main.ts
│   └── index.html
│
├── electron/                       # Electron main process
│   ├── main.ts                     # Entry point
│   ├── preload.ts                  # Preload script
│   └── types.ts                    # IPC types
│
├── angular.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── package.json
├── electron-builder.json
├── README.md
├── REQUIREMENTS.md
├── ARCHITECTURE.md
├── DESIGN.md                       # This file
├── TASKS.md                        # Task list
├── CODE_COMPLETION_GRAPH.md
└── .gitignore
```

---

## 🔄 Data Flow

### PDF Loading Flow

```
User Action: Click "Open File"
    ↓
ToolbarComponent → ElectronService.showOpenDialog()
    ↓
Electron Main Process → File Dialog
    ↓
User Selects File → File Path Returned
    ↓
ToolbarComponent → Dispatch loadDocument Action
    ↓
NgRx Store → Action Received
    ↓
PdfEffects → Intercept loadDocument
    ↓
PdfService.loadDocument(path)
    ↓
ElectronService.readFile(path)
    ↓
Electron Main → File System Read
    ↓
File Data → PdfService
    ↓
PDF.js.getDocument() → Parse PDF
    ↓
Success → Dispatch loadDocumentSuccess Action
    ↓
Reducer Updates State:
  - currentDocument
  - totalPages
  - loading = false
    ↓
Component Selects State:
  - selectCurrentDocument
  - selectTotalPages
    ↓
ViewerComponent → detectChanges()
    ↓
Call renderPage(1)
    ↓
PdfService → PDF.js getPage(1)
    ↓
Render Canvas
    ↓
Update View
```

### Annotation Flow

```
User Highlights Text
    ↓
ViewerComponent → mouseUp Event
    ↓
Get Selected Text & Position
    ↓
Dispatch addAnnotation Action
    ↓
Action: { annotation: Annotation }
    ↓
Reducer → Add to annotations array
    ↓
State Updated
    ↓
AnnotationsPanelComponent → Receive updated annotations
    ↓
Display new annotation
    ↓
ViewerComponent → Render highlight on canvas
    ↓
Show visual feedback to user
```

---

## 🔐 Module Relationships

### CoreModule
**Purpose**: Provide singleton services to entire application

**Services**:
- `ElectronService`: IPC communication with main process
- `StorageService`: SQLite database operations
- `ErrorHandlerService`: Global error handling
- `LoggerService`: Application logging

**Imported By**: `AppModule`  
**Imports**: Nothing (lowest level)

---

### SharedModule
**Purpose**: Provide reusable components and utilities

**Exports**:
- Reusable components
- Custom pipes
- Custom directives
- Material modules
- CommonModule

**Imported By**: `PdfViewerModule`, other feature modules  
**Imports**: `CommonModule`, Material modules

---

### PdfViewerModule
**Purpose**: Main PDF viewing and editing feature

**Components**:
- `PdfViewerComponent`: Main container
- `ToolbarComponent`: Control buttons
- `SidebarComponent`: Thumbnails
- `AnnotationsPanelComponent`: Annotation management
- `PaginationComponent`: Page navigation
- `SearchComponent`: Text search

**Services**:
- `PdfService`: PDF operations
- `AnnotationService`: Annotation management

**State**:
- `PdfState`: Redux state shape
- `PdfActions`: Action creators
- `PdfReducer`: State updates
- `PdfEffects`: Side effects
- `PdfSelectors`: State queries

**Imported By**: `AppModule`  
**Imports**: `SharedModule`, `StoreModule`, `EffectsModule`

---

## 📊 State Management (NgRx)

### PDF State Structure

```typescript
interface PdfState {
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
```

### Actions

**Document Actions**:
- `loadDocument`: Load PDF from file
- `loadDocumentSuccess`: Document loaded successfully
- `loadDocumentError`: Document load failed
- `saveDocument`: Save modified PDF
- `saveDocumentSuccess`: Save completed
- `closeDocument`: Close current document

**Navigation Actions**:
- `goToPage`: Navigate to specific page
- `setZoom`: Change zoom level
- `rotatePages`: Rotate pages

**Annotation Actions**:
- `addAnnotation`: Add new annotation
- `removeAnnotation`: Delete annotation
- `updateAnnotation`: Modify annotation
- `selectAnnotation`: Select for editing

**UI Actions**:
- `toggleSidebar`: Show/hide sidebar
- `toggleAnnotationsPanel`: Show/hide panel

---

## 🔄 Service Architecture

### PdfService

**Responsibilities**:
- PDF document loading
- Page rendering to canvas
- Text extraction
- Metadata retrieval

**Key Methods**:
```typescript
loadDocument(path: string): Observable<PdfDocument>
renderPage(pageNumber: number, scale: number): Observable<HTMLCanvasElement>
extractText(pageNumber: number): Observable<string>
getDocumentMetadata(): Observable<Metadata>
searchText(query: string): Observable<SearchResult[]>
```

---

### AnnotationService

**Responsibilities**:
- Annotation CRUD operations
- Annotation storage
- Annotation retrieval by page

**Key Methods**:
```typescript
addAnnotation(annotation: Annotation): void
removeAnnotation(id: string): void
updateAnnotation(annotation: Annotation): void
getAnnotations(): Observable<Annotation[]>
getAnnotationsByPage(pageNumber: number): Annotation[]
```

---

### ElectronService

**Responsibilities**:
- IPC communication
- File operations
- Native dialogs

**Key Methods**:
```typescript
readFile(path: string): Promise<Uint8Array>
saveFile(path: string, data: Uint8Array): Promise<void>
showOpenDialog(options: any): Promise<string[]>
showSaveDialog(options: any): Promise<string>
ipcInvoke(channel: string, ...args: any[]): Promise<any>
```

---

## 🎨 UI Components Hierarchy

```
AppComponent
├── ToolbarComponent
├── SidebarComponent
│   └── ThumbnailListComponent
│       └── ThumbnailItemComponent (virtualized)
├── MainContentComponent
│   └── ViewerComponent
│       ├── CanvasComponent (PDF rendering)
│       └── AnnotationOverlayComponent
├── AnnotationsPanelComponent
│   └── AnnotationListComponent
│       └── AnnotationItemComponent
└── SearchComponent (modal)
```

---

## 🔗 Inter-Component Communication

### Communication Patterns

1. **Parent → Child**: `@Input()` properties
2. **Child → Parent**: `@Output()` EventEmitter
3. **Any ↔ Any**: NgRx Store
4. **Service-based**: Dependency injection

### Example: Page Navigation

```
ToolbarComponent (has Next/Prev buttons)
  ↓ User clicks Next
  ↓ Dispatch NgRx Action: goToPage(2)
  ↓ Store updates currentPage
  ↓ ViewerComponent subscribes to selectCurrentPage
  ↓ ViewerComponent calls renderPage(2)
  ↓ Page displays
```

---

## 📁 File I/O Architecture

### Read PDF File

```
User selects file
  ↓
ElectronService.showOpenDialog()
  ↓
Electron preload script → IPC invoke
  ↓
Main process → fs.readFile()
  ↓
Send back Uint8Array
  ↓
PdfService.loadDocument()
  ↓
PDF.js processes document
  ↓
Ready for rendering
```

### Save Modified PDF

```
User clicks Save
  ↓
Dispatch NgRx saveDocument action
  ↓
Effects intercept
  ↓
Collect all annotations and modifications
  ↓
PdfService.generateModifiedPdf()
  ↓
pdf-lib creates new PDF
  ↓
Embeds annotations
  ↓
Returns Uint8Array
  ↓
ElectronService.saveFile()
  ↓
IPC invoke main process
  ↓
Main writes to file system
  ↓
Success notification
```

---

## 🔒 Security Considerations

### IPC Security

- **Preload Script**: Limited API exposure
- **Validation**: All IPC inputs validated
- **Sandboxing**: Context isolation enabled
- **Permissions**: Principle of least privilege

### File Handling

- **No Network**: All file operations local
- **No External Scripts**: No eval() usage
- **Content Security Policy**: Strict CSP headers
- **Input Validation**: All user inputs sanitized

---

## ⚡ Performance Optimizations

### Change Detection Strategy

```typescript
@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

- Use `OnPush` strategy globally
- Manual change detection when needed
- Minimize change detection runs

### Virtual Scrolling

- Thumbnail list uses CDK virtual scroll
- Only visible items rendered
- ~1000 page PDF uses ~50MB vs 500MB

### Lazy Loading

- Module-level code splitting
- Load features on demand
- Faster initial load time

### Observable Optimization

- Use `shareReplay()` for repeated queries
- Unsubscribe in `ngOnDestroy`
- Use `async` pipe for auto-unsubscribe

---

## 🧪 Testing Strategy

### Unit Tests (PdfService)

```typescript
describe('PdfService', () => {
  it('should load PDF document', (done) => {
    service.loadDocument('test.pdf').subscribe(doc => {
      expect(doc.pages).toBeGreaterThan(0);
      done();
    });
  });
});
```

### Integration Tests (PdfViewerModule)

```typescript
describe('PDF Loading Workflow', () => {
  it('should load and render PDF', (done) => {
    store.dispatch(loadDocument({ path: 'test.pdf' }));
    store.select(selectCurrentPage).subscribe(page => {
      expect(page).toBe(1);
      done();
    });
  });
});
```

### E2E Tests (User Workflows)

```typescript
describe('User highlights text', () => {
  it('should create annotation', () => {
    openPdf('test.pdf');
    selectText('Sample text');
    highlightText('Yellow');
    expect(annotation).toBeDefined();
  });
});
```

---

## 📦 Build & Deployment

### Development Build

```bash
ng serve
# or for Electron
npm run electron:serve
```

### Production Build

```bash
ng build --configuration production
npm run electron:build
```

### Distribution Formats

- **Windows**: MSI installer, Portable EXE
- **macOS**: DMG package
- **Linux**: AppImage, DEB package

---

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
- Trigger: Push to main
- Jobs:
  1. Install dependencies
  2. Run linting
  3. Run tests
  4. Build for production
  5. Create installers
  6. Upload to releases
```

---

## 📈 Scalability Considerations

### For Team Growth

- Clear module structure enables parallel development
- Service layer abstracts implementation details
- State management (NgRx) prevents prop drilling
- Dependency injection enables easy testing

### For Feature Growth

- Modular architecture supports new feature modules
- Store extensible with new slices
- Service layer can add new methods
- Components composable

---

## 🎓 Developer Guidelines

### Naming Conventions

- **Components**: `*.component.ts` (PascalCase)
- **Services**: `*.service.ts` (PascalCase)
- **Modules**: `*.module.ts` (PascalCase)
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

### Folder Organization

- Keep components with their templates and styles
- Services grouped by module
- Store files in dedicated store folder
- Models/interfaces in models folder

### Code Style

- Use strict TypeScript mode
- Follow Angular styleguide
- Use functional programming where possible
- Avoid side effects in services

---

## 📝 Documentation Standards

### Code Comments

```typescript
/**
 * Load PDF document from file system
 * @param path - Full file path to PDF
 * @returns Observable with loaded document
 * @throws Error if file not found or invalid PDF
 */
loadDocument(path: string): Observable<PdfDocument>
```

### README Sections

- Project overview
- Technology stack
- Setup instructions
- Running the application
- Testing
- Building for distribution
- Contributing guidelines

---

## 🚀 Deployment Checklist

Before releasing version 1.0:

- ✅ All tests passing (60%+ coverage)
- ✅ Code reviewed and approved
- ✅ Documentation complete
- ✅ Performance tested and optimized
- ✅ Security audit completed
- ✅ Cross-platform testing done
- ✅ Release notes prepared
- ✅ Installers created and tested
- ✅ Auto-update mechanism working
- ✅ Crash reporting configured

---

**Design Version**: 1.0  
**Last Updated**: June 16, 2026  
**Next Review**: After Sprint 2 Completion
