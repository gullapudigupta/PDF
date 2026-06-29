# Kiro Spec - Requirements

## Traceability
- Analysis inputs: [technical-analysis.md](technical-analysis.md), [gap-analysis.md](gap-analysis.md), [ui-analysis.md](ui-analysis.md)
- Design source: [design.md](design.md)
- Task source: [tasks.md](tasks.md)

## 1. Product Overview
Gallery Cleaner is a cross-surface application for detecting and removing junk media while preserving useful photos.
Runtime targets:
- Angular web
- Ionic mobile
- Browser extension

## 2. Functional Requirements
### 2.1 Ingestion and Catalog
- FR-001: The system shall scan user-selected folders and build a media catalog.
- FR-002: The system shall classify folders by likely source application type.
- FR-003: The system shall support CSV contact import.
- FR-004: The system shall support Excel contact import.
- FR-005: The system shall assign fallback random names when no spreadsheet is provided.

### 2.2 Junk and Quality Intelligence
- FR-006: The system shall detect duplicate photos using exact and perceptual matching.
- FR-007: The system shall detect blurred images.
- FR-008: The system shall detect low face visibility in photos with faces.
- FR-009: The system shall classify low-quality images using size and quality heuristics.
- FR-010: The system shall classify screenshots and likely non-essential forwards.

### 2.3 Review and Decision Workflow
- FR-011: The system shall show grouped candidate items with reason and confidence.
- FR-012: The system shall provide contact-level and group-level bulk actions.
- FR-013: The system shall provide side-by-side comparison for similar images.
- FR-014: The system shall support keep/delete marking before final delete.
- FR-015: The system shall provide undo window before irreversible deletion.

### 2.4 WhatsApp-like Contact UI
- FR-016: The UI shall list groups first and contacts after groups.
- FR-017: The UI shall show total media size per contact/group.
- FR-018: The UI shall show media previews within each contact/group cluster.
- FR-019: The UI shall support sorting by size, count, and confidence.

### 2.5 Cleanup and Post-Cleanup
- FR-020: The system shall delete confirmed junk files only.
- FR-021: The system shall perform empty-folder cleanup after confirmed deletions.
- FR-022: The system shall present a dry-run cleanup summary before execution.

### 2.6 Runtime Compatibility
- FR-023: The core analysis logic shall be shared across web, mobile, and extension runtimes.
- FR-024: Platform-specific file APIs shall be accessed only through adapters.

## 3. Non-Functional Requirements
- NFR-001: Local-first processing by default.
- NFR-002: Explainable decisions for each flagged item.
- NFR-003: Scans shall be resumable for large datasets.
- NFR-004: UI interactions shall remain responsive during scanning.
- NFR-005: Accessibility support with keyboard navigation and clear labels.
- NFR-006: Deletion operations shall require explicit confirmation.
- NFR-007: At least 7% execution credit buffer shall be preserved (max 93% usage).

## 4. Acceptance Criteria
- AC-001: Each flagged media item displays rule/score reason and confidence.
- AC-002: CSV or Excel import maps contacts; fallback names are generated when absent.
- AC-003: Group-first contact UI with total size aggregation is functional.
- AC-004: Delete workflow includes dry-run preview and empty-folder cleanup pass.
- AC-005: All implementation work is traceable to [tasks.md](tasks.md).
- AC-006: Completed work updates both [tasks.md](tasks.md) and [code-completion-graph.md](code-completion-graph.md).
