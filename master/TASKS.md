**Project**: PDF Viewer & Editor  
**Framework**: Electron + Angular 22 + TypeScript 5 + WebExtensions  
**Status**: 🟢 Ready for Execution  
**Last Updated**: June 16, 2026

---
# PDF Viewer & Editor - Master Task List

**Project**: PDF Viewer & Editor  
**Framework**: Electron + Angular 22 + TypeScript 5 + WebExtensions  
**Status**: 🟢 Ready for Execution  
**Last Updated**: June 16, 2026

---

## 1. Task Management Rules

### 1.1 Naming
`[PHASE-SPRINT-TASK]` (example: `[P1-S1-001]`)

### 1.2 Status
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Completed
- 🔵 Blocked
- 🟠 On Hold

### 1.3 Priority
- 🔴 Critical
- 🟠 High
- 🟡 Medium
- 🟢 Low

---

## 2. Phase 1 (MVP) - Sprints 1 to 12

## Sprint 1 - Setup, Baseline, and Requirement Traceability

### [P1-S1-001] 🟢 Environment Setup
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: None
- [x] Node.js 20 LTS installed
- [x] Angular CLI 22 installed
- [x] Repo + hooks + editor baseline configured

### [P1-S1-002] 🟢 Workspace Initialization
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S1-001]
- [x] Initialize Angular workspace and Electron shell
- [x] Install Angular Material, NgRx, PDF.js, pdf-lib
- [x] Configure strict TypeScript + ESLint + Prettier
- [x] Add run/build scripts for desktop and extension targets

### [P1-S1-003] 🟢 Architecture Skeleton
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S1-002]
- [x] Create `core`, `shared`, `modules/pdf-workspace` structure
- [x] Add runtime adapter interfaces (desktop/extension)
- [x] Add placeholder services/components/store files

### [P1-S1-004] 🔴 Requirements Traceability Matrix
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S1-003]
- [ ] Create normalized matrix (`raw phrase -> action/target/phase`)
- [ ] Map PDF + extension requirements
- [ ] Tag MVP vs Phase 2 vs Phase 3
- [ ] Add QA test-case IDs

---

## Sprint 2 - Core Platform and Persistence

### [P1-S2-001] 🟢 Electron Secure IPC Layer
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S1-002]
- [x] Implement preload allowlist API
- [x] Add validated channels for open/read/save dialogs
- [x] Add secure error propagation and logging

### [P1-S2-002] 🟢 Browser Extension Runtime Baseline
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S1-002]
- [x] Add extension manifests (Chrome/Edge MV3 + Firefox variant)
- [x] Create background/service worker skeleton
- [x] Add popup/entry UI bootstrap
- [x] Implement extension messaging bridge service

### [P1-S2-003] 🟢 No-Backend Persistence Layer
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S1-003]
- [x] Implement `PersistenceService` contract
- [x] Implement `LocalStoragePersistenceAdapter` for desktop
- [x] Implement `IndexedDBPersistenceAdapter` for extension runtime
- [x] Implement autosave and recent files support

### [P1-S2-004] 🟢 NgRx Workspace Store Foundation
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S1-003]
- [x] Create workspace state/actions/reducer/selectors/effects
- [x] Add runtime slice (`desktop`/`extension`)
- [x] Configure devtools for development mode

---

## Sprint 3 - PDF Loading and Rendering

### [P1-S3-001] 🟢 PDF.js Integration
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S2-001], [P1-S2-004]
- [x] Implement `PdfDocumentService` + `PdfRenderService`
- [x] Configure worker and first-page render
- [x] Preserve aspect ratio in render pipeline

### [P1-S3-002] 🟢 Viewer + Toolbar Core
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S3-001]
- [x] Build viewer canvas host and toolbar shell
- [x] Add open/save/search entry points
- [x] Add loading/error UI states

### [P1-S3-003] 🟢 Navigation, Zoom, Rotation
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S3-002]
- [x] Implement page navigation actions
- [x] Implement zoom presets + custom zoom
- [x] Implement page rotation controls

### [P1-S3-004] 🔴 Thumbnails + Bookmarks Sidebar
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S3-001]
- [ ] Generate thumbnail previews
- [ ] Add virtualized list
- [ ] Add bookmark navigation baseline

---

## Sprint 4 - Editing Foundations

### [P1-S4-001] 🔴 Editing Overlay and Selection Engine
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S3-002]
- [ ] Add overlay layer for editable objects
- [ ] Implement selection, move, resize handles
- [ ] Add cut/copy/paste baseline

### [P1-S4-002] 🔴 Text and Image Editing (MVP Scope)
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S4-001]
- [ ] Add text box create/edit/delete
- [ ] Add image insert/move/resize/delete
- [ ] Add link insertion and edit baseline

### [P1-S4-003] 🔴 Undo/Redo Command History
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S4-001]
- [ ] Implement `HistoryService`
- [ ] Integrate with store actions
- [ ] Add keyboard shortcuts

---

## Sprint 5 - Annotation Layer

### [P1-S5-001] 🔴 Annotation Data Models and Service
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S2-004]
- [ ] Create annotation models
- [ ] Implement annotation CRUD service

### [P1-S5-002] 🔴 Highlight + Comment Tools
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S5-001]
- [ ] Text highlight create/edit/delete
- [ ] Comment/sticky note create/edit/delete
- [ ] Color and opacity controls

### [P1-S5-003] 🔴 Draw Tools + Annotation Panel
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S5-001]
- [ ] Freehand draw tool
- [ ] Annotation list with filters
- [ ] Annotation jump-to-position support

---

## Sprint 6 - Page Operations and Save Pipeline

### [P1-S6-001] 🔴 Page Insert/Delete/Reorder
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S3-004], [P1-S4-003]
- [ ] Delete page with confirmation
- [ ] Reorder pages via drag-drop
- [ ] Insert page(s) workflow

### [P1-S6-002] 🔴 Page Extract/Split/Merge
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S6-001]
- [ ] Extract page ranges to new PDF
- [ ] Merge multiple PDFs
- [ ] Split by page range

### [P1-S6-003] 🔴 Save/Save As/Autosave/Recovery
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S4-003], [P1-S6-001], [P1-S2-003]
- [ ] Consolidate edited state to `pdf-lib` output
- [ ] Save + Save As workflows
- [ ] Autosave snapshots + crash recovery

---

## Sprint 7 - Forms and Signatures

### [P1-S7-001] 🔴 Interactive Form Fill Support
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S3-001]
- [ ] Detect and fill existing PDF forms
- [ ] Support text/checkbox/radio/dropdown/date
- [ ] Persist + auto-save form data

### [P1-S7-002] 🔴 Basic Form Field Authoring
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S7-001]
- [ ] Create/edit/delete text + checkbox + dropdown fields
- [ ] Required and conditional baseline support

### [P1-S7-003] 🔴 Signature and Initials Baseline
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S4-001]
- [ ] Draw/type/upload signature
- [ ] Place/move/resize signature/initials
- [ ] Save reusable signature assets locally

---

## Sprint 8 - Search, Security, and Metadata

### [P1-S8-001] 🔴 Full Text Search
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S3-001]
- [ ] Index extracted text
- [ ] Search with page navigation + highlight
- [ ] Case-sensitive + regex modes

### [P1-S8-002] 🔴 Metadata, Permissions, and Protection
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S6-003]
- [ ] Edit metadata (title/author/subject/keywords)
- [ ] Password protection and permission presets
- [ ] Open authorized protected PDFs

### [P1-S8-003] 🔴 Export Outputs
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S6-003]
- [ ] Export pages to PNG/JPEG/SVG
- [ ] Roadmap hooks for Word/Excel export adapters

---

## Sprint 9 - UX, Accessibility, and Storage Hardening

### [P1-S9-001] 🔴 Recent Files + Workspace Persistence
**Priority**: 🟡 Medium | **Duration**: 2 days | **Dependencies**: [P1-S2-003]
- [ ] Recent files CRUD and pinning
- [ ] Restore last view state (page/zoom/theme)
- [ ] Validate SQLite migration and fallback behavior

### [P1-S9-002] 🔴 Accessibility and Keyboard Pass
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S5-003], [P1-S8-001]
- [ ] Keyboard navigation coverage
- [ ] Contrast and focus states
- [ ] Screen-reader label pass

### [P1-S9-003] 🔴 UI Customization and Localization Baseline
**Priority**: 🟡 Medium | **Duration**: 1 day | **Dependencies**: [P1-S3-002]
- [ ] Toolbar customization baseline
- [ ] Tooltip/help baseline
- [ ] i18n scaffolding

---

## Sprint 10 - Browser Extension Productization

### [P1-S10-001] 🔴 Extension PDF Open/Edit Flow
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S2-002], [P1-S6-003]
- [ ] Open PDF from browser context/menu
- [ ] Render/edit flow in extension surface
- [ ] Save/download flow in extension runtime

### [P1-S10-002] 🔴 Cross-Browser Compatibility Pass
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S10-001]
- [ ] Validate Chrome + Edge (MV3)
- [ ] Validate Firefox variant
- [ ] Validate latest Chromium-based install path

### [P1-S10-003] 🔴 Extension Permission Hardening
**Priority**: 🟠 High | **Duration**: 1 day | **Dependencies**: [P1-S10-001]
- [ ] Enforce least-privilege permissions
- [ ] Add permission documentation and audit checklist

---

## Sprint 11 - Quality Engineering

### [P1-S11-001] 🔴 Unit Test Expansion (60% target)
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: Core feature completion
- [ ] Service/reducer/selector coverage
- [ ] Persistence adapter coverage
- [ ] Extension bridge tests

### [P1-S11-002] 🔴 Integration and Workflow Tests
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S11-001]
- [ ] Desktop open-edit-save workflow
- [ ] Extension open-edit-download workflow
- [ ] Form and signature workflows

### [P1-S11-003] 🔴 Performance and Reliability Pass
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S11-002]
- [ ] Rendering and memory profiling
- [ ] Recovery and large-document testing

---

## Sprint 12 - Packaging and Release

### [P1-S12-001] 🔴 Desktop Packaging
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S11-003]
- [ ] Configure `electron-builder`
- [ ] Build Windows/macOS/Linux artifacts

### [P1-S12-002] 🔴 Extension Packaging
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S10-002], [P1-S11-003]
- [ ] Build signed extension artifacts for Chrome/Edge
- [ ] Build Firefox add-on package
- [ ] Prepare store metadata/assets

### [P1-S12-003] 🔴 Release Readiness
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S12-001], [P1-S12-002]
- [ ] Validate MVP acceptance checklist
- [ ] Prepare release notes
- [ ] Publish desktop + extension release candidates

---

## 3. Phase 2 Backlog (Advanced Features)

### [P2-S13-001] OCR for scanned PDFs
### [P2-S13-002] OCR correction workflow and confidence UX
### [P2-S14-001] Advanced form designer (conditional/formula/payment)
### [P2-S14-002] Advanced annotation set (shapes, underline, strikethrough)
### [P2-S15-001] Advanced watermark/header/footer templates
### [P2-S15-002] Metadata/security enhancements
### [P2-S16-001] Redaction suite (text/image/signature)
### [P2-S16-002] Irreversible apply + flatten verification
### [P2-S17-001] Compare/review tools baseline
### [P2-S18-001] Stability + v1.0 release hardening

---

## 4. Phase 3 Backlog (Enterprise)

### [P3-S19-001] Digital signature verification and certificate workflows
### [P3-S20-001] Batch operations (bulk merge/split/convert/protect)
### [P3-S21-001] Plugin architecture foundation
### [P3-S22-001] Advanced conversion pipelines
### [P3-S23-001] Audit trail and compliance reporting
### [P3-S24-001] Enterprise performance and scale tuning

---

## 5. Task Statistics

- **Total Phase 1 Tasks**: 39 (detailed)
- **Completed**: 10 (P1-S1-001, P1-S1-002, P1-S1-003, P1-S2-001, P1-S2-002, P1-S2-003, P1-S2-004, P1-S3-001, P1-S3-002, P1-S3-003)
- **In Progress**: 0
- **Not Started**: 29
- **Overall Progress**: 26% of Phase 1
- **MVP Target**: End of Sprint 12

---

## 6. Execution Notes

- `TASKS.md` and `CODE_COMPLETION_GRAPH.md` must be updated after every completed task.
- Requirement matrix updates are mandatory for newly introduced PDF and extension features.
- No Phase 2 implementation starts before MVP acceptance sign-off.

## 7. Execution Log

### [EXEC-2026-06-16-001] 🟢 Completed - Completed Requirement QA Pass
- Scope basis: completed tasks from this document (`P1-S1-001` to `P1-S3-003` where status is 🟢).
- Delivered traceability test matrix: `specs/pdf-viewer-editor/traceability.md`.
- Added automated tests for completed implementation scope:
	- Persistence adapter behavior
	- Runtime service delegation/helpers
	- Workspace reducer/selectors/effects
	- PDF document/render services
	- Workspace component open/save/search/navigation flows
- Defect resolved:
	- `pdf-viewer-editor/src/app/modules/pdf-workspace/components/pdf-workspace/pdf-workspace.component.ts`
	- Fixed `renderPageToCanvas` invocation to pass `(bytes, pageNumber, canvas, options)`.

---

**Document Version**: 3.0  
**Last Updated**: June 16, 2026  
**Next Review**: End of Sprint 1
