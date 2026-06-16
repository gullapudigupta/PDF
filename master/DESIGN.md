# PDF Viewer & Editor - Design Document

**Project**: PDF Viewer & Editor  
**Framework**: Electron 27 + Angular 22 + TypeScript 5  
**Version**: 2.0  
**Date**: June 16, 2026

---

## 1. Architecture Overview

### 1.1 Layered Architecture

1. **Presentation Layer (Angular Components)**  
   Viewer, toolbar, sidebars, forms designer, annotation panel, properties panel.

2. **State Layer (NgRx)**  
   Document state, page state, annotations, forms, security, UI state.

3. **Application Services Layer**  
   PDF loading/rendering/editing, forms, OCR, signatures, redaction, storage, history.

4. **PDF Engine Layer**  
   `PDF.js` for rendering/extraction and `pdf-lib` for manipulation/output.

5. **Desktop Integration Layer (Electron)**  
   File system access, native dialogs, secure IPC, platform integration.

6. **Data Layer**  
   Local JSON/SQLite for preferences, recent files, workspace state, autosave snapshots.

---

## 2. Target Module Structure

```text
src/app/
  core/
    services/
      electron.service.ts
      storage.service.ts
      logger.service.ts
      error-handler.service.ts
      settings.service.ts
  shared/
    components/
    directives/
    pipes/
  modules/pdf-workspace/
    components/
      viewer/
      toolbar/
      sidebar/
      search-panel/
      annotations-panel/
      forms-panel/
      properties-panel/
      redaction-panel/
      signature-panel/
    services/
      pdf-document.service.ts
      pdf-render.service.ts
      pdf-edit.service.ts
      annotation.service.ts
      form-field.service.ts
      signature.service.ts
      redaction.service.ts
      ocr.service.ts
      history.service.ts
      export.service.ts
    models/
      document.model.ts
      page.model.ts
      annotation.model.ts
      form-field.model.ts
      signature.model.ts
      redaction.model.ts
      search.model.ts
    store/
      workspace.state.ts
      workspace.actions.ts
      workspace.reducer.ts
      workspace.effects.ts
      workspace.selectors.ts
```

---

## 3. State Design (NgRx)

```typescript
interface WorkspaceState {
  document: {
    current: PdfDocument | null;
    loading: boolean;
    error: string | null;
    dirty: boolean;
  };
  view: {
    currentPage: number;
    totalPages: number;
    zoom: number;
    rotation: number;
    viewMode: 'single' | 'continuous' | 'facing';
  };
  edit: {
    selection: SelectionState | null;
    clipboard: ClipboardState | null;
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
  };
  annotations: Annotation[];
  forms: FormField[];
  signatures: SignatureAsset[];
  redactions: RedactionMark[];
  search: SearchState;
  security: SecurityState;
  ui: {
    leftSidebarOpen: boolean;
    rightPanelOpen: boolean;
    activeTool: ToolType;
    theme: 'light' | 'dark' | 'system';
  };
}
```

---

## 4. Key Service Responsibilities

### 4.1 `PdfDocumentService`
- Open/load/save/save-as
- Metadata read/write
- Merge/split/insert/delete/reorder pages

### 4.2 `PdfRenderService`
- Render pages and thumbnails using PDF.js
- Text extraction for search/highlight
- Viewport transforms (zoom/rotation)

### 4.3 `PdfEditService`
- Text/image/link/watermark/header/footer edits
- Object placement, move, resize
- Output generation via pdf-lib

### 4.4 `AnnotationService`
- Highlight/comment/drawing CRUD
- Page-scoped annotation queries
- Annotation import/export hooks

### 4.5 `FormFieldService`
- Create/edit/delete form fields
- Field typing (text/checkbox/radio/dropdown/date/signature/formula/payment placeholder)
- Conditional and required rules

### 4.6 `SignatureService`
- Signature asset management (draw/type/upload)
- Placement, scaling, and replacement
- Stamp/seal support

### 4.7 `RedactionService`
- Mark text/image regions
- Preview and irreversible apply
- Flatten output to remove underlying data

### 4.8 `OcrService`
- OCR pipeline for scanned PDFs
- Text layer generation and confidence output
- Optional provider abstraction for future plugins

### 4.9 `HistoryService`
- Unified undo/redo command model
- Transaction batching for complex edits

---

## 5. Primary Data Flows

### 5.1 Open → Render Flow
1. User selects file from toolbar/menu.
2. `ElectronService` returns path + bytes through secure IPC.
3. `PdfDocumentService` initializes PDF model.
4. `PdfRenderService` renders page + text layer.
5. NgRx state updates `document` and `view`.
6. Viewer and sidebar re-render from selectors.

### 5.2 Edit → Save Flow
1. User performs edit (text/image/form/signature/etc).
2. Action dispatched; reducer updates state.
3. `HistoryService` records command.
4. On save, `PdfEditService` composes changes.
5. `pdf-lib` writes updated PDF.
6. `ElectronService` persists bytes to disk.

### 5.3 Redaction Apply Flow
1. User marks redact areas.
2. `RedactionService` stores marks in state.
3. User confirms apply.
4. Service burns redaction overlay and removes source content references.
5. Saved output is irreversible by design.

---

## 6. Security and Desktop Boundaries

- Context isolation enabled in Electron
- Strictly typed preload API (allowlist channels only)
- Validate all IPC payloads
- No remote code execution or `eval`
- Local-only file processing unless explicit integration enabled
- Protected temporary files and cleanup on session end

---

## 7. Performance Strategy

- Angular `OnPush` for heavy viewer components
- Virtualized thumbnail list
- Incremental page rendering (visible pages first)
- Cached text layers/thumbnails with eviction policy
- Debounced search and worker-based OCR pipeline
- Memory guardrails for large documents

---

## 8. Testing Architecture

- **Unit**: services, reducers, selectors, utility transformers
- **Integration**: viewer + toolbar + store workflows
- **E2E**: open/edit/save, annotate, form-fill, redact, sign
- **Performance**: large-file rendering and scrolling benchmarks
- **Security**: IPC contract tests and protected-file scenarios
- **Accessibility**: keyboard navigation and contrast checks

---

## 9. Requirements-to-Design Traceability

Each normalized requirement category is mapped to explicit implementation units:

- Viewing/navigation → `PdfRenderService`, viewer components
- Editing/manipulation → `PdfEditService`, `HistoryService`
- Annotation/review → `AnnotationService`, annotation panel
- Forms/interactive PDF → `FormFieldService`, forms panel
- Signature/stamp/seal → `SignatureService`, signature panel
- OCR/scanned docs → `OcrService`
- Redaction/security → `RedactionService`, security state
- Save/export/convert → `PdfDocumentService`, `ExportService`

---

## 10. Deployment Targets

- Windows: MSI/portable
- macOS: DMG
- Linux: AppImage/DEB
- CI pipeline: lint → unit/integration tests → build → package → artifacts

---

**Design Version**: 2.0  
**Last Updated**: June 16, 2026  
**Next Review**: After Sprint 2 planning lock
