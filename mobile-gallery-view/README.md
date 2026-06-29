# Mobile Gallery View - Standalone App

This folder contains a mobile-first implementation package derived only from gallery specs, and it now runs as an independent standalone application.

## Run Standalone App
- Install dependencies: `npm install`
- Start development server: `npm run dev`
- Build production assets: `npm run build`
- Preview built assets: `npm run preview`

Standalone app entrypoints:
- `index.html`
- `src/main.ts`
- `src/app.css`

## Scope Mapping
- FR-001 to FR-005: folder scan, source inference, CSV/Excel import, fallback names.
- FR-006 to FR-010: duplicate, blur, face visibility, low-quality, screenshot/non-essential tagging.
- FR-011 to FR-019: candidate grouping, reason/confidence, compare pairs, group-first ordering.
- FR-020 to FR-022: dry-run summary, confirmed delete, empty-folder cleanup.
- FR-023 to FR-024: shared TypeScript core with strict platform adapter boundary.

## Structure
- src/domain.ts: data contracts and thresholds.
- src/adapters: runtime adapter interfaces and validation.
- src/catalog: ingestion and folder/source inference.
- src/contact: CSV/Excel contact import and fallback naming.
- src/quality: duplicate + quality scoring engines and analysis pipeline.
- src/review: candidate generation, compare pairs, decision modeling.
- src/cleanup: dry-run, confirmed delete, and empty-folder cleanup.
- src/ui: mobile-oriented summary and group/contact view model.
- src/app: end-to-end orchestration service.

## Notes
- Local-first by design: persistence and audit models are local.
- Delete remains user-reviewed via decision workflow and undo ticket.
- Runtime-specific I/O is isolated in PlatformAdapter implementations.
