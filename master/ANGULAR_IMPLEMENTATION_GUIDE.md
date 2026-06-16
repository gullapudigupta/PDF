# Angular + Electron + WebExtensions PDF Viewer & Editor - Implementation Guide

## Project Decision: Electron + Angular + TypeScript + Browser Extensions

This document defines the implementation strategy for a unified PDF viewer/editor delivered as:
- Desktop app (`Electron + Angular`)
- Browser extensions (`Chrome`, `Edge`, `Firefox`, latest Chromium-based browsers)

All feature logic is shared through a common Angular domain layer with runtime adapters.

---

## 1. FINALIZED STACK

### Core Stack
```text
Language: TypeScript 5.x
Framework: Angular 22.x
Desktop Runtime: Electron 27.x
Extension Runtime: WebExtensions (Chrome/Edge Manifest V3 + Firefox-compatible variant)
State Management: NgRx
UI: Angular Material
Build: Angular CLI + extension packaging scripts
Testing: Jasmine + Karma + integration/E2E
Node: 20 LTS+
```

### PDF & Processing Libraries
```text
PDF Rendering: PDF.js v4.x
PDF Editing: pdf-lib v1.x
Utilities: RxJS, lodash-es
```

### No-Backend Persistence
```text
Desktop Primary: SQLite (portable embedded database)
Desktop Fallback: JSON file storage
Extension Storage: IndexedDB / browser storage.local
Optional Shared SQL Layer: sql.js (WASM SQLite) if needed
```

---

## 2. PROJECT INITIALIZATION

### Step 1: Initialize Angular Workspace
```bash
npm install -g @angular/cli@22
ng new pdf-viewer-editor --routing --style=scss
cd pdf-viewer-editor
```

### Step 2: Install Desktop + Extension + Core Dependencies
```bash
# Angular + UI
ng add @angular/material
npm install @angular/cdk

# NgRx
npm install @ngrx/store @ngrx/effects @ngrx/entity @ngrx/store-devtools

# PDF
npm install pdfjs-dist pdf-lib

# Desktop
npm install --save-dev electron electron-builder

# Persistence
npm install better-sqlite3
npm install idb

# Quality
npm install --save-dev eslint prettier husky lint-staged
```

### Step 3: Extension Tooling Baseline
```bash
# Example (choose your preferred extension packaging flow)
npm install --save-dev web-ext
```

---

## 3. TARGET STRUCTURE

```text
pdf-viewer-editor/
├─ src/
│  ├─ app/
│  │  ├─ core/
│  │  │  ├─ adapters/
│  │  │  │  ├─ runtime.adapter.ts
│  │  │  │  ├─ desktop-runtime.adapter.ts
│  │  │  │  ├─ extension-runtime.adapter.ts
│  │  │  │  ├─ persistence.adapter.ts
│  │  │  │  ├─ sqlite-persistence.adapter.ts
│  │  │  │  ├─ browser-storage.adapter.ts
│  │  │  │  └─ json-persistence.adapter.ts
│  │  │  ├─ services/
│  │  │  │  ├─ electron.service.ts
│  │  │  │  ├─ extension-bridge.service.ts
│  │  │  │  ├─ storage.service.ts
│  │  │  │  ├─ settings.service.ts
│  │  │  │  ├─ error-handler.service.ts
│  │  │  │  └─ logger.service.ts
│  │  │  └─ core.module.ts
│  │  ├─ shared/
│  │  └─ modules/pdf-workspace/
│  │     ├─ components/
│  │     ├─ services/
│  │     ├─ models/
│  │     └─ store/
├─ electron/
│  ├─ main.ts
│  └─ preload.ts
├─ extension/
│  ├─ manifest.chrome.json
│  ├─ manifest.firefox.json
│  ├─ background.ts
│  ├─ content-script.ts
│  └─ popup/
└─ package.json
```

---

## 4. MODULE IMPLEMENTATION GUIDANCE

### `CoreModule`
Provide singleton services and adapter bindings:
- `ElectronService`
- `ExtensionBridgeService`
- `StorageService`
- `SettingsService`
- `ErrorHandlerService`
- `LoggerService`

### `SharedModule`
Reusable components/pipes/directives and Material modules.

### `PdfWorkspaceModule`
Main feature module containing viewer, editing, forms, signatures, redaction, and search workflows.

---

## 5. NGRX STATE MODEL (RUNTIME-AWARE)

```typescript
export interface WorkspaceState {
  document: DocumentState;
  view: ViewState;
  edit: EditState;
  annotations: AnnotationState;
  forms: FormState;
  signatures: SignatureState;
  security: SecurityState;
  search: SearchState;
  runtime: {
    platform: 'desktop' | 'extension';
    browser?: 'chrome' | 'edge' | 'firefox' | 'chromium';
  };
  ui: UiState;
}
```

Key actions should include runtime-aware flows for open/save/download.

---

## 6. RUNTIME ADAPTER PATTERN

Use adapter interfaces to keep feature code shared:

- `RuntimeAdapter`:
  - openPdf()
  - savePdf()
  - downloadPdf()
  - showDialog() (desktop only)

- `PersistenceAdapter`:
  - getSetting()/setSetting()
  - saveSession()/loadSession()
  - saveRecent()/listRecent()/pinRecent()
  - saveSnapshot()/loadSnapshot()

Implementations:
- Desktop: `ElectronRuntimeAdapter` + `SqlitePersistenceAdapter`
- Extension: `ExtensionRuntimeAdapter` + `BrowserStorageAdapter`
- Fallback: `JsonPersistenceAdapter`

---

## 7. SECURITY BASELINE

### Desktop
- Context isolation enabled
- Strict preload allowlist API
- Validate all IPC payloads

### Extension
- Least-privilege permissions
- MV3 service worker architecture for Chromium browsers
- Firefox-compatible manifest variant
- Avoid broad host permissions unless required

### General
- No cloud upload without explicit consent
- Local-first processing
- Secure temporary data handling

---

## 8. BUILD & RELEASE COMMANDS (REFERENCE)

```bash
# Angular dev
ng serve

# Desktop dev
npm run electron:serve

# Extension dev (example)
npx web-ext run -s extension --target=firefox-desktop

# Desktop build
npm run electron:build

# Extension package (example)
npx web-ext build -s extension
```

(Exact scripts should be finalized in `package.json` during Sprint 1/2.)

---

## 9. TESTING STRATEGY

- **Unit**: reducers/selectors/services/adapters
- **Integration**: desktop open-edit-save and extension open-edit-download
- **Compatibility**: Chrome + Edge + Firefox verification
- **Performance**: rendering and memory constraints
- **Security**: IPC contract and extension permission audits

---

## 10. MVP SUCCESS CRITERIA

- Desktop + extension both open/render PDFs
- Core edit/annotate/save flow works
- Forms + signature baseline supported
- Autosave + recovery implemented
- Local persistence adapters operational
- Cross-browser extension validation complete

---

**Guide Version**: 2.0  
**Last Updated**: June 16, 2026  
**Status**: Synced with `REQUIREMENTS.md`, `DESIGN.md`, `TASKS.md`, `ROADMAP.md`
