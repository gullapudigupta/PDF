# PDF Viewer & Editor - Task Execution Entry Point

Updated: 2026-10-16. Canonical task objects: [agent-tasks](agent-tasks).

Read [requirements](REQUIREMENTS.md), then [design](DESIGN.md), then execute from this document only.
Do not execute tasks from old reports, source snapshots, framework guides, or graph labels.

## Registry Migration Execution Checklist

- [x] MIG-001: Define migration requirements.
- [x] MIG-002: Define registry design.
- [x] MIG-003: Import all task definitions and historical execution evidence.
- [x] MIG-004: Generate domain/phase indexes and completion graph.
- [x] MIG-005: Validate source coverage, dependency graph, and generated outputs.

## Execution Rules

- Statuses: PENDING, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED.
- Retain original IDs. Canonical JSON is editable; tables, rollups, and graph are generated.
- Resolve `planningRequired` tasks before starting: estimate, priority, deliverables, acceptance criteria, and any feature prerequisites.
- Honor dependency links and the MVP/stable release gates; PENDING does not mean ready.
- A source completion claim is not a new verification pass. Historical unknown dates/models remain null.
- For fresh completion, record actual model/provider, notes, artifacts, completion date, passed verification commands/summary, and complete all prerequisites.
- After each successful update run the sync and validate commands below. This updates this document and advances the graph sequence for a distinct task state.

```powershell
node .\master\tools\task-registry.cjs sync
node .\master\tools\task-registry.cjs validate
```

## Product Progress

| Phase | Tasks | Completed (reported) | Pending | In progress | Blocked |
|---|---:|---:|---:|---:|---:|
| 1: MVP | 46 | 43 | 0 | 0 | 3 |
| 2: Advanced Features | 16 | 0 | 0 | 0 | 16 |
| 3: Enterprise | 9 | 0 | 9 | 0 | 0 |
| 4: AI Workspace MVP | 23 | 22 | 1 | 0 | 0 |

94 product tasks; 1 separate historical QA execution record.
Historical QA is not counted as product delivery. Estimates use 8 planning hours/day where the source specified days; backlog estimates remain unknown.

## Phase 1 - MVP

| Task | Name | Domain | Status | Priority | Hours | Dependencies |
|---|---|---|---|---|---:|---|
| [P1-S1-001](agent-tasks/platform/phase1-tasks.json) | Environment Setup | platform | COMPLETED (inherited) | CRITICAL | 24 | None |
| [P1-S1-002](agent-tasks/platform/phase1-tasks.json) | Workspace Initialization | platform | COMPLETED (inherited) | CRITICAL | 16 | P1-S1-001 |
| [P1-S1-003](agent-tasks/platform/phase1-tasks.json) | Architecture Skeleton | platform | COMPLETED (inherited) | CRITICAL | 16 | P1-S1-002 |
| [P1-S1-004](agent-tasks/platform/phase1-tasks.json) | Requirements Traceability Matrix | platform | COMPLETED | HIGH | 16 | P1-S1-003 |
| [P1-S2-001](agent-tasks/platform/phase1-tasks.json) | Electron Secure IPC Layer | platform | COMPLETED (inherited) | CRITICAL | 16 | P1-S1-002 |
| [P1-S2-002](agent-tasks/platform/phase1-tasks.json) | Browser Extension Runtime Baseline | platform | COMPLETED (inherited) | CRITICAL | 24 | P1-S1-002 |
| [P1-S2-003](agent-tasks/platform/phase1-tasks.json) | No-Backend Persistence Layer | platform | COMPLETED (inherited) | CRITICAL | 24 | P1-S1-003 |
| [P1-S2-004](agent-tasks/platform/phase1-tasks.json) | NgRx Workspace Store Foundation | platform | COMPLETED | CRITICAL | 16 | P1-S1-003 |
| [P1-S3-001](agent-tasks/viewer-editor/phase1-tasks.json) | PDF.js Integration | viewer-editor | COMPLETED | CRITICAL | 24 | P1-S2-001, P1-S2-004 |
| [P1-S3-002](agent-tasks/viewer-editor/phase1-tasks.json) | Viewer + Toolbar Core | viewer-editor | COMPLETED | CRITICAL | 16 | P1-S3-001 |
| [P1-S3-003](agent-tasks/viewer-editor/phase1-tasks.json) | Navigation, Zoom, Rotation | viewer-editor | COMPLETED | CRITICAL | 16 | P1-S3-002 |
| [P1-S3-004](agent-tasks/viewer-editor/phase1-tasks.json) | Thumbnails + Bookmarks Sidebar | viewer-editor | COMPLETED | HIGH | 16 | P1-S3-001 |
| [P1-S4-001](agent-tasks/viewer-editor/phase1-tasks.json) | Editing Overlay and Selection Engine | viewer-editor | COMPLETED | CRITICAL | 24 | P1-S3-002 |
| [P1-S4-002](agent-tasks/viewer-editor/phase1-tasks.json) | Text and Image Editing (MVP Scope) | viewer-editor | COMPLETED | CRITICAL | 24 | P1-S4-001 |
| [P1-S4-003](agent-tasks/viewer-editor/phase1-tasks.json) | Undo/Redo Command History | viewer-editor | COMPLETED | CRITICAL | 16 | P1-S4-001 |
| [P1-S5-001](agent-tasks/annotations/phase1-tasks.json) | Annotation Data Models and Service | annotations | COMPLETED | CRITICAL | 16 | P1-S2-004 |
| [P1-S5-002](agent-tasks/annotations/phase1-tasks.json) | Highlight + Comment Tools | annotations | COMPLETED | CRITICAL | 16 | P1-S5-001 |
| [P1-S5-003](agent-tasks/annotations/phase1-tasks.json) | Draw Tools + Annotation Panel | annotations | COMPLETED | HIGH | 16 | P1-S5-001 |
| [P1-S6-001](agent-tasks/processing-export/phase1-tasks.json) | Page Insert/Delete/Reorder | processing-export | COMPLETED | CRITICAL | 24 | P1-S3-004, P1-S4-003 |
| [P1-S6-002](agent-tasks/processing-export/phase1-tasks.json) | Page Extract/Split/Merge | processing-export | COMPLETED | HIGH | 16 | P1-S6-001 |
| [P1-S6-003](agent-tasks/processing-export/phase1-tasks.json) | Save/Save As/Autosave/Recovery | processing-export | COMPLETED | CRITICAL | 24 | P1-S4-003, P1-S6-001, P1-S2-003 |
| [P1-S7-001](agent-tasks/forms-signatures/phase1-tasks.json) | Interactive Form Fill Support | forms-signatures | COMPLETED | CRITICAL | 24 | P1-S3-001 |
| [P1-S7-002](agent-tasks/forms-signatures/phase1-tasks.json) | Basic Form Field Authoring | forms-signatures | COMPLETED | HIGH | 16 | P1-S7-001 |
| [P1-S7-003](agent-tasks/forms-signatures/phase1-tasks.json) | Signature and Initials Baseline | forms-signatures | COMPLETED | HIGH | 16 | P1-S4-001 |
| [P1-S8-001](agent-tasks/viewer-editor/phase1-tasks.json) | Full Text Search | viewer-editor | COMPLETED | CRITICAL | 16 | P1-S3-001 |
| [P1-S8-002](agent-tasks/security-compliance/phase1-tasks.json) | Metadata, Permissions, and Protection | security-compliance | COMPLETED | HIGH | 16 | P1-S6-003 |
| [P1-S8-003](agent-tasks/processing-export/phase1-tasks.json) | Export Outputs | processing-export | COMPLETED | HIGH | 16 | P1-S6-003 |
| [P1-S9-001](agent-tasks/viewer-editor/phase1-tasks.json) | Recent Files + Workspace Persistence | viewer-editor | COMPLETED | MEDIUM | 16 | P1-S2-003 |
| [P1-S9-002](agent-tasks/viewer-editor/phase1-tasks.json) | Accessibility and Keyboard Pass | viewer-editor | COMPLETED | HIGH | 16 | P1-S5-003, P1-S8-001 |
| [P1-S9-003](agent-tasks/viewer-editor/phase1-tasks.json) | UI Customization and Localization Baseline | viewer-editor | COMPLETED | MEDIUM | 8 | P1-S3-002 |
| [P1-S10-001](agent-tasks/browser-extension/phase1-tasks.json) | Extension PDF Open/Edit Flow | browser-extension | COMPLETED | CRITICAL | 24 | P1-S2-002, P1-S6-003 |
| [P1-S10-002](agent-tasks/browser-extension/phase1-tasks.json) | Cross-Browser Compatibility Pass | browser-extension | COMPLETED | CRITICAL | 16 | P1-S10-001 |
| [P1-S10-003](agent-tasks/browser-extension/phase1-tasks.json) | Extension Permission Hardening | browser-extension | COMPLETED | HIGH | 8 | P1-S10-001 |
| [P1-S11-001](agent-tasks/quality-delivery/phase1-tasks.json) | Unit Test Expansion (60% target) | quality-delivery | COMPLETED | CRITICAL | 24 | P1-S1-001, P1-S1-002, P1-S1-003, P1-S1-004, P1-S2-001, P1-S2-002, P1-S2-003, P1-S2-004, P1-S3-001, P1-S3-002, P1-S3-003, P1-S3-004, P1-S4-001, P1-S4-002, P1-S4-003, P1-S5-001, P1-S5-002, P1-S5-003, P1-S6-001, P1-S6-002, P1-S6-003, P1-S7-001, P1-S7-002, P1-S7-003, P1-S8-001, P1-S8-002, P1-S8-003, P1-S9-001, P1-S9-002, P1-S9-003, P1-S10-001, P1-S10-002, P1-S10-003, P1-S3-005, P1-S4-004, P1-S9-004, P1-S7-004, P1-S6-004, P1-S8-004 |
| [P1-S11-002](agent-tasks/quality-delivery/phase1-tasks.json) | Integration and Workflow Tests | quality-delivery | COMPLETED | HIGH | 16 | P1-S11-001 |
| [P1-S11-003](agent-tasks/quality-delivery/phase1-tasks.json) | Performance and Reliability Pass | quality-delivery | COMPLETED | HIGH | 16 | P1-S11-002 |
| [P1-S12-001](agent-tasks/quality-delivery/phase1-tasks.json) | Desktop Packaging | quality-delivery | BLOCKED | CRITICAL | 16 | P1-S11-003 |
| [P1-S12-002](agent-tasks/quality-delivery/phase1-tasks.json) | Extension Packaging | quality-delivery | BLOCKED | CRITICAL | 16 | P1-S10-002, P1-S11-003 |
| [P1-S12-004](agent-tasks/viewer-editor/phase1-tasks.json) | Modern PDF Editor Workspace UI | viewer-editor | COMPLETED | HIGH | 24 | P1-S3-002, P1-S9-002, P1-S11-003 |
| [P1-S12-003](agent-tasks/quality-delivery/phase1-tasks.json) | Release Readiness | quality-delivery | BLOCKED | CRITICAL | 16 | P1-S12-001, P1-S12-002, P1-S12-004 |
| [P1-S3-005](agent-tasks/viewer-editor/phase1-tasks.json) | Viewing Modes and Dark Mode Rendering | viewer-editor | COMPLETED | HIGH | 16 | P1-S3-003 |
| [P1-S4-004](agent-tasks/viewer-editor/phase1-tasks.json) | Link Add/Edit/Remove | viewer-editor | COMPLETED | MEDIUM | 12 | P1-S4-001, P1-S4-003 |
| [P1-S9-004](agent-tasks/viewer-editor/phase1-tasks.json) | Pinned Favorites and Per-Document View State | viewer-editor | COMPLETED | MEDIUM | 12 | P1-S9-001 |
| [P1-S7-004](agent-tasks/forms-signatures/phase1-tasks.json) | Form Data Export/Import and Form Autosave | forms-signatures | COMPLETED | HIGH | 16 | P1-S7-001, P1-S2-003 |
| [P1-S6-004](agent-tasks/processing-export/phase1-tasks.json) | Page Rotate and Crop | processing-export | COMPLETED | HIGH | 16 | P1-S6-001 |
| [P1-S8-004](agent-tasks/security-compliance/phase1-tasks.json) | Encrypted PDF Unlock and Secure Temp Storage | security-compliance | COMPLETED | HIGH | 16 | P1-S8-002 |

## Phase 2 - Advanced Features

| Task | Name | Domain | Status | Priority | Hours | Dependencies |
|---|---|---|---|---|---:|---|
| [P2-S13-001](agent-tasks/processing-export/phase2-tasks.json) | OCR for scanned PDFs | processing-export | BLOCKED | Unplanned | Unknown | P1-S12-003 |
| [P2-S13-002](agent-tasks/processing-export/phase2-tasks.json) | OCR correction workflow and confidence UX | processing-export | BLOCKED | Unplanned | Unknown | P1-S12-003 |
| [P2-S14-001](agent-tasks/forms-signatures/phase2-tasks.json) | Advanced form designer (conditional/formula/payment) | forms-signatures | BLOCKED | Unplanned | Unknown | P1-S12-003 |
| [P2-S14-002](agent-tasks/annotations/phase2-tasks.json) | Advanced annotation set (shapes, underline, strikethrough) | annotations | BLOCKED | Unplanned | Unknown | P1-S12-003 |
| [P2-S15-001](agent-tasks/processing-export/phase2-tasks.json) | Advanced watermark/header/footer templates | processing-export | BLOCKED | Unplanned | Unknown | P1-S12-003 |
| [P2-S15-002](agent-tasks/security-compliance/phase2-tasks.json) | Metadata/security enhancements | security-compliance | BLOCKED | Unplanned | Unknown | P1-S12-003 |
| [P2-S16-001](agent-tasks/security-compliance/phase2-tasks.json) | Redaction suite (text/image/signature) | security-compliance | BLOCKED | Unplanned | Unknown | P1-S12-003 |
| [P2-S16-002](agent-tasks/security-compliance/phase2-tasks.json) | Irreversible apply + flatten verification | security-compliance | BLOCKED | Unplanned | Unknown | P1-S12-003 |
| [P2-S17-001](agent-tasks/annotations/phase2-tasks.json) | Compare/review tools baseline | annotations | BLOCKED | Unplanned | Unknown | P1-S12-003 |
| [P2-S18-001](agent-tasks/quality-delivery/phase2-tasks.json) | Stability + v1.0 release hardening | quality-delivery | BLOCKED | Unplanned | Unknown | P1-S12-003, P2-S13-003, P2-S13-004, P2-S14-003, P2-S14-004, P2-S14-005, P2-S18-002 |
| [P2-S13-003](agent-tasks/processing-export/phase2-tasks.json) | Search Across OCR Text | processing-export | BLOCKED | HIGH | 16 | P2-S13-001, P1-S8-001, P1-S12-003 |
| [P2-S13-004](agent-tasks/processing-export/phase2-tasks.json) | Scanned PDF Image and Resolution Analysis | processing-export | BLOCKED | MEDIUM | 16 | P2-S13-001, P1-S12-003 |
| [P2-S14-003](agent-tasks/forms-signatures/phase2-tasks.json) | Stamp/Seal Library and Reusable Signature Assets | forms-signatures | BLOCKED | MEDIUM | 24 | P1-S7-003, P1-S12-003 |
| [P2-S14-004](agent-tasks/forms-signatures/phase2-tasks.json) | Advanced Form Data Export (CSV/JSON/XFDF) | forms-signatures | BLOCKED | MEDIUM | 16 | P1-S7-004, P1-S12-003 |
| [P2-S14-005](agent-tasks/annotations/phase2-tasks.json) | Annotation Filter, Search and Style Presets | annotations | BLOCKED | MEDIUM | 16 | P1-S5-003, P1-S12-003 |
| [P2-S18-002](agent-tasks/platform/phase2-tasks.json) | Local Diagnostics and Opt-in Crash Report Export | platform | BLOCKED | MEDIUM | 16 | P1-S12-003 |

## Phase 3 - Enterprise

| Task | Name | Domain | Status | Priority | Hours | Dependencies |
|---|---|---|---|---|---:|---|
| [P3-S19-001](agent-tasks/forms-signatures/phase3-tasks.json) | Digital signature verification and certificate workflows | forms-signatures | PENDING | Unplanned | Unknown | P2-S18-001 |
| [P3-S20-001](agent-tasks/processing-export/phase3-tasks.json) | Batch operations (bulk merge/split/convert/protect) | processing-export | PENDING | Unplanned | Unknown | P2-S18-001 |
| [P3-S21-001](agent-tasks/platform/phase3-tasks.json) | Plugin architecture foundation | platform | PENDING | Unplanned | Unknown | P2-S18-001 |
| [P3-S22-001](agent-tasks/processing-export/phase3-tasks.json) | Advanced conversion pipelines | processing-export | PENDING | Unplanned | Unknown | P2-S18-001 |
| [P3-S23-001](agent-tasks/security-compliance/phase3-tasks.json) | Audit trail and compliance reporting | security-compliance | PENDING | Unplanned | Unknown | P2-S18-001 |
| [P3-S24-001](agent-tasks/quality-delivery/phase3-tasks.json) | Enterprise performance and scale tuning | quality-delivery | PENDING | Unplanned | Unknown | P2-S18-001 |
| [P3-S21-002](agent-tasks/platform/phase3-tasks.json) | Plugin SDK and Extension Points (OCR/Export/Annotation) | platform | PENDING | HIGH | 40 | P3-S21-001, P2-S18-001 |
| [P3-S23-002](agent-tasks/security-compliance/phase3-tasks.json) | Consent-Gated External Sharing Policy | security-compliance | PENDING | HIGH | 24 | P3-S23-001, P2-S18-001 |
| [P3-S25-001](agent-tasks/quality-delivery/phase3-tasks.json) | Extended Test Coverage (80%) and Final Release Validation | quality-delivery | PENDING | CRITICAL | 40 | P3-S24-001, P3-S19-001, P3-S20-001, P3-S22-001, P3-S21-002, P3-S23-002, P2-S18-001 |

## Phase 4 - AI Workspace MVP

| Task | Name | Domain | Status | Priority | Hours | Dependencies |
|---|---|---|---|---|---:|---|
| [P4-AI-001](agent-tasks/viewer-editor/phase4-tasks.json) | Register AI workspace MVP and Phase 4 dependency graph | viewer-editor | COMPLETED | HIGH | 2 | None |
| [P4-AI-002](agent-tasks/viewer-editor/phase4-tasks.json) | Implement user-key OpenAI-compatible transport | viewer-editor | COMPLETED | HIGH | 4 | P4-AI-001 |
| [P4-AI-003](agent-tasks/viewer-editor/phase4-tasks.json) | Implement separate AI chat with PDF preview and copy | viewer-editor | COMPLETED | HIGH | 6 | P4-AI-002 |
| [P4-UI-001](agent-tasks/viewer-editor/phase4-tasks.json) | Integrate responsive left tools and right AI chat | viewer-editor | COMPLETED | HIGH | 5 | P4-AI-003 |
| [P4-UI-002](agent-tasks/viewer-editor/phase4-tasks.json) | Add browser and desktop multiple PDF pickers | viewer-editor | COMPLETED | HIGH | 2 | P4-UI-001 |
| [P4-UI-003](agent-tasks/viewer-editor/phase4-tasks.json) | Add clickable PDF empty state and state-preserving document tabs | viewer-editor | COMPLETED | HIGH | 5 | P4-UI-002 |
| [P4-UI-004](agent-tasks/viewer-editor/phase4-tasks.json) | Add professional Anirdeshya branding and palette | viewer-editor | COMPLETED | HIGH | 2 | P4-UI-003 |
| [P4-EDIT-001](agent-tasks/viewer-editor/phase4-tasks.json) | Add professional point-size and bold PDF text controls | viewer-editor | COMPLETED | HIGH | 4 | P4-UI-003 |
| [P4-UI-005](agent-tasks/viewer-editor/phase4-tasks.json) | Consolidate PDF commands into one compact header row | viewer-editor | COMPLETED | HIGH | 2 | P4-UI-004 |
| [P4-UI-006](agent-tasks/viewer-editor/phase4-tasks.json) | Create a working blank New PDF document command | viewer-editor | COMPLETED | HIGH | 1.5 | P4-UI-005 |
| [P4-UI-007](agent-tasks/viewer-editor/phase4-tasks.json) | Separate modal components for Metadata and Protect PDF | viewer-editor | COMPLETED | HIGH | 2.5 | P4-UI-006 |
| [P4-AI-004](agent-tasks/viewer-editor/phase4-tasks.json) | Visual "How to get an API key" guide in AI assistant | viewer-editor | COMPLETED | HIGH | 2 | P4-AI-003 |
| [P4-AI-005](agent-tasks/viewer-editor/phase4-tasks.json) | AI key storage notice | viewer-editor | COMPLETED | HIGH | 0.5 | P4-AI-004 |
| [P4-UI-008](agent-tasks/viewer-editor/phase4-tasks.json) | Verify all PDF actions with staged status messages | viewer-editor | COMPLETED | HIGH | 4 | P4-UI-007 |
| [P4-RES-001](agent-tasks/viewer-editor/phase4-tasks.json) | Resume builder with four ATS templates and per-section AI drafting | viewer-editor | COMPLETED | HIGH | 10 | P4-UI-008, P4-AI-005 |
| [P4-QA-001](agent-tasks/viewer-editor/phase4-tasks.json) | Verify and document AI workspace MVP | viewer-editor | COMPLETED | HIGH | 3 | P4-UI-005, P4-UI-006, P4-UI-007, P4-UI-008, P4-AI-004, P4-AI-005, P4-EDIT-001, P4-RES-001, P4-UI-009, P4-UI-010 |
| [P4-SEO-001](agent-tasks/viewer-editor/phase4-tasks.json) | Approval-gated search engine discoverability kit (blocked until owner approval) | viewer-editor | COMPLETED | MEDIUM | 4 | P4-RES-001 |
| [P4-UI-009](agent-tasks/viewer-editor/phase4-tasks.json) | Verification follow-up: placement-mode guidance and form-field/import result messages | viewer-editor | COMPLETED | MEDIUM | 2 | P4-UI-008 |
| [P4-UI-010](agent-tasks/viewer-editor/phase4-tasks.json) | Split PDF workspace component template and styles into separate HTML and CSS files | viewer-editor | COMPLETED | MEDIUM | 1 | P4-UI-009 |
| [P4-VIEW-001](agent-tasks/viewer-editor/phase4-tasks.json) | Zoom presets/fit modes/Ctrl+wheel and Ctrl+F search with on-page highlights | viewer-editor | COMPLETED | HIGH | 4 | P4-QA-001 |
| [P4-OCR-001](agent-tasks/viewer-editor/phase4-tasks.json) | Lazy-loaded offline image-to-text (OCR) window in Indian languages | viewer-editor | COMPLETED | HIGH | 6 | P4-QA-001 |
| [P4-SIGN-001](agent-tasks/viewer-editor/phase4-tasks.json) | Certificate-based PKCS#7 digital signing and signature verification panel | viewer-editor | COMPLETED | HIGH | 8 | P4-QA-001 |
| [P4-QA-002](agent-tasks/viewer-editor/phase4-tasks.json) | Phase 4b regression, bundle-size and browser verification | viewer-editor | PENDING | HIGH | 3 | P4-VIEW-001, P4-OCR-001, P4-SIGN-001 |

## Historical Execution Log

- [EXEC-2026-06-16-001](agent-tasks/quality-delivery/phase1-tasks.json): Completed - Completed Requirement QA Pass; COMPLETED; not_reverified.

## Evidence and Navigation

- [Registry guide](agent-tasks/README.md)
- [Master index](agent-tasks/master_tasks_index.json)
- [Completion graph and sequence history](CODE_COMPLETION_GRAPH.md)
- [Original document snapshots and reconciliation notes](agent-tasks/source-snapshot.json)

Original task checklists and source prose are retained on each canonical record; no checklist item is discarded.
