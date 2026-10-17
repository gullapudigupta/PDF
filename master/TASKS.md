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
| 1: MVP | 45 | 28 | 17 | 0 | 0 |
| 2: Advanced Features | 16 | 0 | 16 | 0 | 0 |
| 3: Enterprise | 9 | 0 | 9 | 0 | 0 |

70 product tasks; 1 separate historical QA execution record.
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
| [P1-S8-003](agent-tasks/processing-export/phase1-tasks.json) | Export Outputs | processing-export | PENDING | HIGH | 16 | P1-S6-003 |
| [P1-S9-001](agent-tasks/viewer-editor/phase1-tasks.json) | Recent Files + Workspace Persistence | viewer-editor | PENDING | MEDIUM | 16 | P1-S2-003 |
| [P1-S9-002](agent-tasks/viewer-editor/phase1-tasks.json) | Accessibility and Keyboard Pass | viewer-editor | PENDING | HIGH | 16 | P1-S5-003, P1-S8-001 |
| [P1-S9-003](agent-tasks/viewer-editor/phase1-tasks.json) | UI Customization and Localization Baseline | viewer-editor | PENDING | MEDIUM | 8 | P1-S3-002 |
| [P1-S10-001](agent-tasks/browser-extension/phase1-tasks.json) | Extension PDF Open/Edit Flow | browser-extension | PENDING | CRITICAL | 24 | P1-S2-002, P1-S6-003 |
| [P1-S10-002](agent-tasks/browser-extension/phase1-tasks.json) | Cross-Browser Compatibility Pass | browser-extension | PENDING | CRITICAL | 16 | P1-S10-001 |
| [P1-S10-003](agent-tasks/browser-extension/phase1-tasks.json) | Extension Permission Hardening | browser-extension | PENDING | HIGH | 8 | P1-S10-001 |
| [P1-S11-001](agent-tasks/quality-delivery/phase1-tasks.json) | Unit Test Expansion (60% target) | quality-delivery | PENDING | CRITICAL | 24 | P1-S1-001, P1-S1-002, P1-S1-003, P1-S1-004, P1-S2-001, P1-S2-002, P1-S2-003, P1-S2-004, P1-S3-001, P1-S3-002, P1-S3-003, P1-S3-004, P1-S4-001, P1-S4-002, P1-S4-003, P1-S5-001, P1-S5-002, P1-S5-003, P1-S6-001, P1-S6-002, P1-S6-003, P1-S7-001, P1-S7-002, P1-S7-003, P1-S8-001, P1-S8-002, P1-S8-003, P1-S9-001, P1-S9-002, P1-S9-003, P1-S10-001, P1-S10-002, P1-S10-003, P1-S3-005, P1-S4-004, P1-S9-004, P1-S7-004, P1-S6-004, P1-S8-004 |
| [P1-S11-002](agent-tasks/quality-delivery/phase1-tasks.json) | Integration and Workflow Tests | quality-delivery | PENDING | HIGH | 16 | P1-S11-001 |
| [P1-S11-003](agent-tasks/quality-delivery/phase1-tasks.json) | Performance and Reliability Pass | quality-delivery | PENDING | HIGH | 16 | P1-S11-002 |
| [P1-S12-001](agent-tasks/quality-delivery/phase1-tasks.json) | Desktop Packaging | quality-delivery | PENDING | CRITICAL | 16 | P1-S11-003 |
| [P1-S12-002](agent-tasks/quality-delivery/phase1-tasks.json) | Extension Packaging | quality-delivery | PENDING | CRITICAL | 16 | P1-S10-002, P1-S11-003 |
| [P1-S12-003](agent-tasks/quality-delivery/phase1-tasks.json) | Release Readiness | quality-delivery | PENDING | CRITICAL | 16 | P1-S12-001, P1-S12-002 |
| [P1-S3-005](agent-tasks/viewer-editor/phase1-tasks.json) | Viewing Modes and Dark Mode Rendering | viewer-editor | PENDING | HIGH | 16 | P1-S3-003 |
| [P1-S4-004](agent-tasks/viewer-editor/phase1-tasks.json) | Link Add/Edit/Remove | viewer-editor | PENDING | MEDIUM | 12 | P1-S4-001, P1-S4-003 |
| [P1-S9-004](agent-tasks/viewer-editor/phase1-tasks.json) | Pinned Favorites and Per-Document View State | viewer-editor | PENDING | MEDIUM | 12 | P1-S9-001 |
| [P1-S7-004](agent-tasks/forms-signatures/phase1-tasks.json) | Form Data Export/Import and Form Autosave | forms-signatures | COMPLETED | HIGH | 16 | P1-S7-001, P1-S2-003 |
| [P1-S6-004](agent-tasks/processing-export/phase1-tasks.json) | Page Rotate and Crop | processing-export | COMPLETED | HIGH | 16 | P1-S6-001 |
| [P1-S8-004](agent-tasks/security-compliance/phase1-tasks.json) | Encrypted PDF Unlock and Secure Temp Storage | security-compliance | PENDING | HIGH | 16 | P1-S8-002 |

## Phase 2 - Advanced Features

| Task | Name | Domain | Status | Priority | Hours | Dependencies |
|---|---|---|---|---|---:|---|
| [P2-S13-001](agent-tasks/processing-export/phase2-tasks.json) | OCR for scanned PDFs | processing-export | PENDING | Unplanned | Unknown | P1-S12-003 |
| [P2-S13-002](agent-tasks/processing-export/phase2-tasks.json) | OCR correction workflow and confidence UX | processing-export | PENDING | Unplanned | Unknown | P1-S12-003 |
| [P2-S14-001](agent-tasks/forms-signatures/phase2-tasks.json) | Advanced form designer (conditional/formula/payment) | forms-signatures | PENDING | Unplanned | Unknown | P1-S12-003 |
| [P2-S14-002](agent-tasks/annotations/phase2-tasks.json) | Advanced annotation set (shapes, underline, strikethrough) | annotations | PENDING | Unplanned | Unknown | P1-S12-003 |
| [P2-S15-001](agent-tasks/processing-export/phase2-tasks.json) | Advanced watermark/header/footer templates | processing-export | PENDING | Unplanned | Unknown | P1-S12-003 |
| [P2-S15-002](agent-tasks/security-compliance/phase2-tasks.json) | Metadata/security enhancements | security-compliance | PENDING | Unplanned | Unknown | P1-S12-003 |
| [P2-S16-001](agent-tasks/security-compliance/phase2-tasks.json) | Redaction suite (text/image/signature) | security-compliance | PENDING | Unplanned | Unknown | P1-S12-003 |
| [P2-S16-002](agent-tasks/security-compliance/phase2-tasks.json) | Irreversible apply + flatten verification | security-compliance | PENDING | Unplanned | Unknown | P1-S12-003 |
| [P2-S17-001](agent-tasks/annotations/phase2-tasks.json) | Compare/review tools baseline | annotations | PENDING | Unplanned | Unknown | P1-S12-003 |
| [P2-S18-001](agent-tasks/quality-delivery/phase2-tasks.json) | Stability + v1.0 release hardening | quality-delivery | PENDING | Unplanned | Unknown | P1-S12-003, P2-S13-003, P2-S13-004, P2-S14-003, P2-S14-004, P2-S14-005, P2-S18-002 |
| [P2-S13-003](agent-tasks/processing-export/phase2-tasks.json) | Search Across OCR Text | processing-export | PENDING | HIGH | 16 | P2-S13-001, P1-S8-001, P1-S12-003 |
| [P2-S13-004](agent-tasks/processing-export/phase2-tasks.json) | Scanned PDF Image and Resolution Analysis | processing-export | PENDING | MEDIUM | 16 | P2-S13-001, P1-S12-003 |
| [P2-S14-003](agent-tasks/forms-signatures/phase2-tasks.json) | Stamp/Seal Library and Reusable Signature Assets | forms-signatures | PENDING | MEDIUM | 24 | P1-S7-003, P1-S12-003 |
| [P2-S14-004](agent-tasks/forms-signatures/phase2-tasks.json) | Advanced Form Data Export (CSV/JSON/XFDF) | forms-signatures | PENDING | MEDIUM | 16 | P1-S7-004, P1-S12-003 |
| [P2-S14-005](agent-tasks/annotations/phase2-tasks.json) | Annotation Filter, Search and Style Presets | annotations | PENDING | MEDIUM | 16 | P1-S5-003, P1-S12-003 |
| [P2-S18-002](agent-tasks/platform/phase2-tasks.json) | Local Diagnostics and Opt-in Crash Report Export | platform | PENDING | MEDIUM | 16 | P1-S12-003 |

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

## Historical Execution Log

- [EXEC-2026-06-16-001](agent-tasks/quality-delivery/phase1-tasks.json): Completed - Completed Requirement QA Pass; COMPLETED; not_reverified.

## Evidence and Navigation

- [Registry guide](agent-tasks/README.md)
- [Master index](agent-tasks/master_tasks_index.json)
- [Completion graph and sequence history](CODE_COMPLETION_GRAPH.md)
- [Original document snapshots and reconciliation notes](agent-tasks/source-snapshot.json)

Original task checklists and source prose are retained on each canonical record; no checklist item is discarded.
