# PDF Viewer & Editor - Design Document

**Project**: PDF Viewer & Editor  
**Framework**: Electron 27 + Angular 22 + TypeScript 5 + WebExtensions  
**Version**: 3.0  
**Date**: June 16, 2026

---

## 1. Architecture Overview

### 1.1 Platform Strategy
The product is delivered on two runtime surfaces using one shared feature core:

1. **Desktop App** (`Electron + Angular`)  
2. **Browser Extension App** (`Chrome`, `Edge`, `Firefox`, latest Chromium-based browsers)

A shared domain layer prevents duplicated PDF business logic across runtimes.

### 1.2 Layered Architecture

1. **Presentation Layer (Angular UI)**  
   Viewer, toolbar, sidebar, forms panel, annotation panel, properties panel.

2. **State Layer (NgRx)**  
   Workspace/document/view/edit/search/security/form/annotation/signature state.

3. **Application Services Layer**  
   PDF loading/rendering/editing, forms, signatures, redaction, OCR, history, export.

4. **Platform Adapter Layer**  
   - Desktop adapter: file dialogs, filesystem, native shell integration.  
   - Browser adapter: extension APIs, background/service worker messaging, tab/context integration.

5. **PDF Engine Layer**  
   `PDF.js` for rendering/text extraction, `pdf-lib` for manipulation/output.

6. **Persistence Layer (No Backend)**  
   Local-only persistence with portable storage adapters.

---

## 2. No-Backend Persistence Design

### 2.1 Primary Storage Choices
- **Desktop primary**: `SQLite` (portable embedded DB) for settings, recents, session snapshots, lightweight metadata indexes.
- **Desktop fallback**: local JSON file storage if SQLite module is unavailable.
- **Extension primary**: browser `IndexedDB`/`storage.local` for settings/session state.
- **Cross-runtime optional**: `sql.js` (WASM SQLite) for a shared query model where needed.

### 2.2 Data Domains
- Preferences (theme, keyboard options, UI layout)
- Recent files and pinned docs
- Workspace restore state (page, zoom, tool)
- Auto-save snapshots
- Signature assets (encrypted at rest where applicable)

### 2.3 Adapter Contract
`PersistenceService` should expose a stable contract:
- `getSetting/setSetting`
- `saveSession/loadSession`
- `saveRecent/listRecent/pinRecent`
- `saveSnapshot/loadSnapshot/clearSnapshot`

Implementations:
- `SqlitePersistenceAdapter` (desktop)
- `BrowserStorageAdapter` (extension)
- `JsonPersistenceAdapter` (desktop fallback)

---

## 3. Target Module Structure

```text
src/app/
  core/
    adapters/
      runtime.adapter.ts
      desktop-runtime.adapter.ts
      extension-runtime.adapter.ts
      persistence.adapter.ts
      sqlite-persistence.adapter.ts
      browser-storage.adapter.ts
      json-persistence.adapter.ts
    services/
      electron.service.ts
      extension-bridge.service.ts
      storage.service.ts
      settings.service.ts
      logger.service.ts
      error-handler.service.ts
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
    store/
      workspace.state.ts
      workspace.actions.ts
      workspace.reducer.ts
      workspace.effects.ts
      workspace.selectors.ts
extension/
  manifest.chrome.json
  manifest.firefox.json
  background.ts
  content-script.ts
  popup/
```

---

## 4. State Design (NgRx)

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
  runtime: {
    platform: 'desktop' | 'extension';
    browser?: 'chrome' | 'edge' | 'firefox' | 'chromium';
  };
  ui: {
    leftSidebarOpen: boolean;
    rightPanelOpen: boolean;
    activeTool: ToolType;
    theme: 'light' | 'dark' | 'system';
  };
}
```

---

## 5. Key Service Responsibilities

### 5.1 `PdfDocumentService`
- Open/load/save/save-as
- Metadata read/write
- Merge/split/insert/delete/reorder pages

### 5.2 `PdfRenderService`
- Render pages and thumbnails with aspect ratio preservation
- Text extraction for search/highlight
- Case-sensitive + regex search preparation support

### 5.3 `PdfEditService`
- Text/image/link/watermark/header/footer edits
- Object placement, move, resize
- Output generation through `pdf-lib`

### 5.4 `FormFieldService`
- Create/edit/delete form fields
- Support required/conditional fields
- Auto-save form data via persistence adapter

### 5.5 `ExtensionBridgeService`
- Wrap browser extension messaging API
- Handle background/service-worker requests
- Route context-menu/tab-level open actions

### 5.6 `StorageService`
- Runtime selection of persistence adapter
- SQLite-backed persistence in desktop runtime
- IndexedDB/storage.local-backed persistence in extension runtime

### 5.7 `HistoryService`
- Unified undo/redo command model
- Transaction batching for complex edits

---

## 6. Primary Data Flows

### 6.1 Desktop Open → Render
1. User chooses file.
2. `ElectronService` obtains bytes.
3. `PdfDocumentService` parses and loads.
4. `PdfRenderService` renders page + text layer.
5. State updates and UI refreshes.

### 6.2 Extension Open → Render
1. User triggers extension on PDF URL/tab.
2. `ExtensionBridgeService` requests fetch/access via extension permissions.
3. Bytes streamed to `PdfDocumentService`.
4. Viewer renders and edits in extension UI.

### 6.3 Save/Autosave Flow (Both Runtimes)
1. User changes document state.
2. `HistoryService` records command.
3. Auto-save snapshot persisted via selected adapter.
4. Save action composes final PDF bytes using `pdf-lib`.
5. Desktop writes file directly; extension initiates download/save flow.

---

## 7. Security Boundaries

- Context isolation and strict preload API in Electron
- Least-privilege browser extension permissions
- No wildcard host permissions unless feature-justified
- Validate all IPC/message payloads
- No `eval` or remote code execution patterns
- Local-only processing by default, no cloud upload without explicit consent

---

## 8. Performance Strategy

- Angular `OnPush` for viewer-heavy components
- Virtualized thumbnails
- Incremental page rendering for current viewport
- Text layer and thumbnail cache with eviction
- Debounced search and background worker OCR
- Memory guardrails for large document loads

---

## 9. Testing Architecture

- **Unit**: services, reducers, selectors, adapter implementations
- **Integration**: desktop flow and extension flow separately
- **E2E**: open/edit/save, annotate, form-fill, redact, sign
- **Compatibility**: Chrome, Edge, Firefox extension behavior tests
- **Performance**: large-file rendering and memory envelope checks
- **Security**: IPC and extension permission contract tests

---

## 10. Requirements-to-Design Traceability

- Viewing/navigation → `PdfRenderService`, viewer/sidebar
- Editing/manipulation → `PdfEditService`, `HistoryService`
- Forms/interactive PDF → `FormFieldService`, forms panel
- Signatures/stamps → `SignatureService`
- OCR/scanned docs → `OcrService`
- Redaction/security → `RedactionService`, security state
- Save/export/convert → `PdfDocumentService`, `ExportService`
- Browser extension support → `ExtensionBridgeService`, runtime adapter layer
- No-backend data persistence → persistence adapters (`SQLite`, browser storage)

---

## 11. Deployment Targets

### Desktop
- Windows: MSI/portable
- macOS: DMG
- Linux: AppImage/DEB

### Browser Extensions
- Chrome Web Store package
- Edge Add-ons package
- Firefox Add-ons (AMO) package
- Chromium-compatible zip package for manual install

### CI Pipeline
lint → test → desktop build → extension build → package → release artifacts

---

**Design Version**: 3.0  
**Last Updated**: June 16, 2026  
**Next Review**: After Sprint 2 planning lock
