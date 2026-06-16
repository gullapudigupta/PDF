**Last Updated**: June 16, 2026
**Project**: PDF Viewer & Editor  
**Framework**: Electron + Angular 22 + TypeScript 5  
**Status**: 🟢 Ready for Execution  
**Last Updated**: June 16, 2026

---
# PDF Viewer & Editor - Master Task List

**Project**: PDF Viewer & Editor  
**Framework**: Electron + Angular 22 + TypeScript 5  
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

### [P1-S1-002] 🔴 Workspace Initialization
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S1-001]  
- [ ] Initialize Angular workspace and Electron shell
- [ ] Install Angular Material, NgRx, PDF.js, pdf-lib
- [ ] Configure strict TypeScript + ESLint + Prettier
- [ ] Add run/build scripts for Electron development

### [P1-S1-003] 🔴 Architecture Skeleton
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S1-002]  
- [ ] Create `core`, `shared`, `modules/pdf-workspace` structure
- [ ] Add placeholder services/components/store files
- [ ] Wire app routing and module bootstrap

### [P1-S1-004] 🔴 Requirements Traceability Matrix
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S1-003]  
- [ ] Create normalized matrix (`raw phrase -> action/target/phase`)
- [ ] Map all PDF-related provided phrases to features
- [ ] Tag MVP vs Phase 2 vs Phase 3
- [ ] Add QA test-case IDs for each normalized feature group

---

## Sprint 2 - Core Platform Services

### [P1-S2-001] 🔴 Electron Secure IPC Layer
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S1-002]  
- [ ] Implement preload allowlist API
- [ ] Add validated channels for open/read/save dialogs
- [ ] Add secure error propagation and logging

### [P1-S2-002] 🔴 Core Services Implementation
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S1-003]  
- [ ] Implement `ElectronService`, `StorageService`, `SettingsService`
- [ ] Implement `LoggerService`, `ErrorHandlerService`
- [ ] Add unit tests for core services

### [P1-S2-003] 🔴 NgRx Workspace Store Foundation
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S1-003]  
- [ ] Create workspace state/actions/reducer/selectors/effects
- [ ] Add document/view/ui slices
- [ ] Configure store devtools in development

---

## Sprint 3 - PDF Loading and Rendering

### [P1-S3-001] 🔴 PDF.js Integration
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S2-001], [P1-S2-003]  
- [ ] Implement `PdfDocumentService` + `PdfRenderService`
- [ ] Configure worker and first-page render
- [ ] Handle load errors and invalid file states

### [P1-S3-002] 🔴 Viewer + Toolbar Core
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S3-001]  
- [ ] Build viewer canvas host and toolbar shell
- [ ] Add open/save/search entry points
- [ ] Add loading/error UI states

### [P1-S3-003] 🔴 Navigation, Zoom, Rotation
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S3-002]  
- [ ] Implement page navigation actions
- [ ] Implement zoom presets + custom zoom
- [ ] Implement page rotation controls

### [P1-S3-004] 🔴 Thumbnails + Bookmarks Sidebar
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S3-001]  
- [ ] Generate thumbnail previews
- [ ] Add virtualized list
- [ ] Add bookmark navigation panel baseline

---

## Sprint 4 - Editing Foundations

### [P1-S4-001] 🔴 Editing Overlay and Selection Engine
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S3-002]  
- [ ] Add overlay layer for editable objects
- [ ] Implement selection, move, resize handles
- [ ] Add clipboard actions (cut/copy/paste base)

### [P1-S4-002] 🔴 Text and Image Editing (MVP Scope)
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S4-001]  
- [ ] Add text box create/edit/delete
- [ ] Add image insert/move/resize/delete
- [ ] Add link insertion and edit baseline

### [P1-S4-003] 🔴 Undo/Redo Command History
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S4-001]  
- [ ] Implement `HistoryService`
- [ ] Integrate with store actions
- [ ] Add keyboard shortcuts (Ctrl+Z / Ctrl+Y)

---

## Sprint 5 - Annotation Layer

### [P1-S5-001] 🔴 Annotation Data Models and Service
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S2-003]  
- [ ] Create annotation models (highlight/comment/draw)
- [ ] Implement annotation CRUD service

### [P1-S5-002] 🔴 Highlight + Comment Tools
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S5-001]  
- [ ] Text highlight create/edit/delete
- [ ] Comment/sticky note create/edit/delete
- [ ] Color and opacity controls

### [P1-S5-003] 🔴 Draw Tools + Annotation Panel
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S5-001]  
- [ ] Freehand draw tool
- [ ] Annotation list panel with filters
- [ ] Annotation jump-to-position support

---

## Sprint 6 - Page Operations and Document Structure

### [P1-S6-001] 🔴 Page Insert/Delete/Reorder
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S3-004], [P1-S4-003]  
- [ ] Delete page with confirmation
- [ ] Reorder pages via drag-drop
- [ ] Insert page(s) workflow

### [P1-S6-002] 🔴 Page Extract/Split/Merge (Baseline)
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S6-001]  
- [ ] Extract page ranges to new PDF
- [ ] Merge multiple PDFs
- [ ] Split by page range

### [P1-S6-003] 🔴 Header/Footer/Page Number Baseline
**Priority**: 🟡 Medium | **Duration**: 1 day | **Dependencies**: [P1-S4-002]  
- [ ] Add page number rendering options
- [ ] Add simple header/footer text placement

---

## Sprint 7 - Forms and Signatures (MVP Level)

### [P1-S7-001] 🔴 Interactive Form Fill Support
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S3-001]  
- [ ] Detect and fill existing PDF form fields
- [ ] Support text/checkbox/radio/dropdown/date
- [ ] Persist form data on save

### [P1-S7-002] 🔴 Basic Form Field Authoring
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S7-001]  
- [ ] Create/edit/delete text + checkbox + dropdown fields
- [ ] Required field toggle

### [P1-S7-003] 🔴 Signature and Initials Baseline
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S4-001]  
- [ ] Draw/type/upload signature
- [ ] Place/move/resize signature/initials
- [ ] Save reusable signature asset locally

---

## Sprint 8 - Search, Metadata, Save/Export

### [P1-S8-001] 🔴 Full Text Search
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S3-001]  
- [ ] Index extracted text
- [ ] Search with page navigation + highlight
- [ ] Case-sensitive option

### [P1-S8-002] 🔴 Save/Save As/Autosave/Recovery
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: [P1-S4-003], [P1-S6-001], [P1-S7-001]  
- [ ] Consolidate edited state to pdf-lib output
- [ ] Save and Save As workflows
- [ ] Autosave snapshots + recovery prompt

### [P1-S8-003] 🔴 Export and Metadata Editing
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S8-002]  
- [ ] Export pages to PNG/JPEG/SVG
- [ ] Edit metadata (title/author/subject/keywords)
- [ ] Basic watermark add/edit/delete

---

## Sprint 9 - Security, UX, Accessibility

### [P1-S9-001] 🔴 Protect/Unlock Baseline
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S8-002]  
- [ ] Password protect output PDF
- [ ] Permission presets baseline
- [ ] Open authorized protected PDFs

### [P1-S9-002] 🔴 Recent Files + Workspace Persistence
**Priority**: 🟡 Medium | **Duration**: 1 day | **Dependencies**: [P1-S2-002]  
- [ ] Recent files CRUD and pinning
- [ ] Restore last view state (page/zoom/theme)

### [P1-S9-003] 🔴 Accessibility and Keyboard Pass
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S5-003], [P1-S8-001]  
- [ ] Keyboard navigation coverage
- [ ] Contrast and focus states
- [ ] Screen-reader label pass on key controls

---

## Sprint 10 - Quality Engineering

### [P1-S10-001] 🔴 Unit Test Expansion (60% target)
**Priority**: 🔴 Critical | **Duration**: 3 days | **Dependencies**: Core feature completion  
- [ ] Service/reducer/selector coverage
- [ ] Editing and annotation logic tests

### [P1-S10-002] 🔴 Integration and Workflow Tests
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S10-001]  
- [ ] Open-edit-save workflow
- [ ] Form fill-save workflow
- [ ] Signature workflow

### [P1-S10-003] 🔴 Security and Error Recovery Tests
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S9-001]  
- [ ] Protected file handling tests
- [ ] Crash recovery and autosave tests

---

## Sprint 11 - Performance and Stability

### [P1-S11-001] 🔴 Performance Optimization
**Priority**: 🟠 High | **Duration**: 3 days | **Dependencies**: [P1-S10-002]  
- [ ] Rendering optimization and caching
- [ ] Thumbnail virtualization tuning
- [ ] Memory profiling and leak fixes

### [P1-S11-002] 🔴 Reliability Hardening
**Priority**: 🟠 High | **Duration**: 2 days | **Dependencies**: [P1-S11-001]  
- [ ] Large file handling improvements
- [ ] Better error messages + retry flows

---

## Sprint 12 - Packaging and Release

### [P1-S12-001] 🔴 Electron Packaging
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S11-002]  
- [ ] Configure `electron-builder`
- [ ] Build Windows/macOS/Linux artifacts

### [P1-S12-002] 🔴 Release Readiness
**Priority**: 🔴 Critical | **Duration**: 2 days | **Dependencies**: [P1-S12-001]  
- [ ] Validate MVP acceptance checklist
- [ ] Prepare release notes and installers
- [ ] Publish alpha release package

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

- **Total Phase 1 Tasks**: 34 (detailed)
- **Completed**: 1
- **In Progress**: 0
- **Not Started**: 33
- **MVP Target**: End of Sprint 12

---

## 6. Execution Notes

- `TASKS.md` and `CODE_COMPLETION_GRAPH.md` must be updated after every completed task.
- Requirement matrix updates are mandatory for any newly introduced PDF feature.
- No Phase 2 implementation starts before MVP acceptance is signed off.

---

**Document Version**: 2.0  
**Last Updated**: June 16, 2026  
**Next Review**: End of Sprint 1
