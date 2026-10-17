# PDF Viewer & Editor Requirements Traceability

This matrix normalizes each product requirement as raw phrase -> action / target / context, links it to canonical work in [master/TASKS.md](../../master/TASKS.md), and assigns stable QA case IDs. "Existing" means a matching automated test is present; "Planned" means the case is a traceability target and is not yet claimed as tested. Desktop and extension coverage are identified separately.

| ID | Raw requirement phrase | Normalized action / target / context | Phase | Task IDs | Runtime | QA case ID and status |
|---|---|---|---:|---|---|---|
| REQ-VIEW-01 | Open/load PDF from local file system | open / document / PDF | 1 | P1-S3-001, P1-S3-002 | Desktop + extension | QA-PDF-001 Existing: open and render first page |
| REQ-VIEW-02 | Render pages accurately while maintaining aspect ratio | render / page / PDF | 1 | P1-S3-001 | Desktop + extension | QA-PDF-002 Existing: render scale and preserve aspect ratio |
| REQ-VIEW-03 | Multi-page navigation and page controls | navigate / page / PDF | 1 | P1-S3-003 | Desktop + extension | QA-PDF-003 Existing: page navigation bounds |
| REQ-VIEW-04 | Zoom, rotation, single/continuous/facing modes | zoom/rotate/select / page view / PDF | 1 | P1-S3-003, P1-S3-005 | Desktop + extension | QA-PDF-004 Existing: zoom bounds and rotation wrap; QA-PDF-005 Planned: view modes |
| REQ-VIEW-05 | Thumbnails sidebar and bookmarks/outline | navigate / thumbnail and bookmark / PDF | 1 | P1-S3-004 | Desktop + extension | QA-PDF-006 Planned: thumbnail and outline navigation |
| REQ-EDIT-01 | Edit/add/delete text objects where PDF structure allows | add/edit/delete / text / PDF | 1 | P1-S4-001, P1-S4-002, P1-S6-003 | Desktop + extension | QA-PDF-007 Existing: text overlay CRUD; QA-PDF-008 Planned: saved PDF content |
| REQ-EDIT-02 | Insert/replace/delete images and logos | add/replace/delete / image / PDF | 1 | P1-S4-001, P1-S4-002, P1-S6-003 | Desktop + extension | QA-PDF-009 Existing: image overlay controls; QA-PDF-010 Planned: saved PDF content |
| REQ-EDIT-03 | Add/edit/remove links | add/edit/delete / link / PDF | 1 | P1-S4-004, P1-S6-003 | Desktop + extension | QA-PDF-011 Existing: link overlay create/edit; QA-PDF-012 Planned: persisted PDF links |
| REQ-EDIT-04 | Undo/redo across editing workflows | undo/redo / edits / PDF | 1 | P1-S4-003 | Desktop + extension | QA-PDF-013 Existing: history service and keyboard undo/redo |
| REQ-ANNOT-01 | Highlight, underline, strikethrough, comments, and drawing | annotate / text, page, comment / PDF | 1-2 | P1-S5-001, P1-S5-002, P1-S5-003, P2-S14-002 | Desktop + extension | QA-PDF-014 Planned: annotation CRUD and rendering |
| REQ-ANNOT-02 | Annotation list filter/search and style controls | filter/search/style / annotation / PDF | 2 | P2-S14-005 | Desktop + extension | QA-PDF-015 Planned: annotation panel filtering and presets |
| REQ-PAGE-01 | Insert, delete, reorder, extract, split, and merge pages | insert/delete/reorder/extract/split/merge / page / PDF | 1 | P1-S6-001, P1-S6-002 | Desktop | QA-PDF-016 Planned: page operation integration |
| REQ-PAGE-02 | Rotate and crop pages | rotate/crop / page / PDF | 1 | P1-S6-004 | Desktop | QA-PDF-017 Planned: crop bounds and saved page box |
| REQ-FORM-01 | Fill interactive forms and persist values | fill/save / form field / PDF | 1 | P1-S7-001, P1-S7-004 | Desktop + extension | QA-PDF-018 Planned: form fill, save, and restore |
| REQ-FORM-02 | Create fields including conditional/formula/payment fields | create/evaluate / form field / PDF | 1-2 | P1-S7-002, P2-S14-001 | Desktop | QA-PDF-019 Planned: field authoring and rules |
| REQ-SIGN-01 | Draw/type/upload and place signatures/initials | create/place / signature and initials / PDF | 1 | P1-S7-003 | Desktop + extension | QA-PDF-020 Planned: signature appearance and placement |
| REQ-SIGN-02 | Verify digital signatures and certificates | verify / signature certificate / PDF | 3 | P3-S19-001 | Desktop | QA-PDF-021 Planned: certificate verification |
| REQ-OCR-01 | OCR scanned PDFs, generate text layer, correct recognition | OCR/correct / scanned page text / PDF | 2 | P2-S13-001, P2-S13-002, P2-S13-003, P2-S13-004 | Desktop | QA-PDF-022 Planned: OCR extraction, correction, search |
| REQ-SEC-01 | Password protection, permissions, and authorized unlock | protect/unlock / document / PDF | 1-2 | P1-S8-002, P1-S8-004, P2-S15-002 | Desktop | QA-PDF-023 Planned: password and permission round-trip |
| REQ-SEC-02 | Redact text/image/signature irreversibly | redact/flatten / sensitive content / PDF | 2 | P2-S16-001, P2-S16-002 | Desktop | QA-PDF-024 Planned: text/image removal and recovery checks |
| REQ-SEC-03 | Local-first processing; no cloud upload without consent | restrict/share / document data / PDF | 1-3 | P1-S2-003, P2-S18-002, P3-S23-002 | Desktop + extension | QA-PDF-025 Planned: no-network and consent policy |
| REQ-SAVE-01 | Save, Save As, autosave, crash recovery | save/recover / document / PDF | 1 | P1-S6-003 | Desktop + extension | QA-PDF-026 Existing: Save As preserves original bytes; QA-PDF-027 Planned: edited save and recovery |
| REQ-EXPORT-01 | Export PDF pages to PNG/JPEG/SVG and convert documents | export/convert / page and document / PDF | 1-3 | P1-S8-003, P3-S22-001 | Desktop | QA-PDF-028 Planned: export formats and conversion fidelity |
| REQ-WORKSPACE-01 | Recent files, pinned favorites, and session restore | list/pin/restore / workspace / PDF | 1 | P1-S9-001, P1-S9-004 | Desktop + extension | QA-PDF-029 Planned: recent and pinned document restore |
| REQ-ACCESS-01 | Accessibility, keyboard shortcuts, and localization | navigate/customize / UI / PDF editor | 1 | P1-S9-002, P1-S9-003 | Desktop + extension | QA-PDF-030 Planned: keyboard and accessibility audit |
| REQ-EXT-01 | Open/edit/download PDFs in supported browsers | open/edit/download / document / PDF | 1 | P1-S10-001, P1-S10-002, P1-S10-003 | Chrome/Edge/Firefox | QA-PDF-031 Planned: browser matrix and least-privilege check |
| REQ-REVIEW-01 | Compare/review documents | compare/review / document changes / PDF | 2 | P2-S17-001 | Desktop | QA-PDF-032 Planned: text and annotation comparison |
| REQ-BATCH-01 | Batch merge/split/convert/protect | batch-process / documents / PDF | 3 | P3-S20-001 | Desktop | QA-PDF-033 Planned: batch queue and failure recovery |
| REQ-PLUGIN-01 | Plugin SDK and extension points | extend / OCR, export, annotation / PDF | 3 | P3-S21-001, P3-S21-002 | Desktop | QA-PDF-034 Planned: plugin permissions and compatibility |
| REQ-COMPLIANCE-01 | Audit trail and compliance reporting | audit/report / document operations / PDF | 3 | P3-S23-001 | Desktop | QA-PDF-035 Planned: tamper-evident audit event coverage |
| REQ-QUALITY-01 | Unit/integration/performance tests and release validation | verify / application / PDF editor | 1-3 | P1-S11-001, P1-S11-002, P1-S11-003, P1-S12-001, P1-S12-002, P1-S12-003, P2-S18-001, P3-S24-001, P3-S25-001 | Desktop + extension | QA-PDF-036 Planned: coverage, performance, release gates |

## Current test locations

- pdf-viewer-editor/src/app/modules/pdf-workspace/components/pdf-workspace/pdf-workspace.component.spec.ts
- pdf-viewer-editor/src/app/modules/pdf-workspace/services/pdf-document.service.spec.ts
- pdf-viewer-editor/src/app/modules/pdf-workspace/services/pdf-render.service.spec.ts
- pdf-viewer-editor/src/app/modules/pdf-workspace/services/history.service.spec.ts

The status column is deliberately explicit: planned IDs do not imply tests or implementation exist. Update this matrix as task work adds test cases; the canonical task record and [TASKS.md](../../master/TASKS.md) remain the execution source of truth.