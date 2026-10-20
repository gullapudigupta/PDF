# Kiro Spec - Tasks

## Phase 4 execution checklist

Read [requirements.md](requirements.md), then [design.md](design.md).
Execute only this checklist and the generated [master entry point](../../master/TASKS.md).

- [x] P4-AI-001: Extend registry support to Phase 4; register scoped MVP tasks,
  regenerate indexes/completion DAG, and validate registry tests.
- [x] P4-AI-002 (depends on P4-AI-001): Implement and test validated, cancellable
  OpenAI/custom-compatible transport with in-memory credentials only.
- [x] P4-AI-003 (depends on P4-AI-002): Implement and test separate chat, explicit
  PDF text preview/send, assistant actions, cancellation, and copy/manual editing.
- [x] P4-UI-001 (depends on P4-AI-003): Reuse all workspace options in left menu,
  mount right chat, preserve editor behavior, and verify responsive drawers.
- [x] P4-UI-002 (depends on P4-UI-001): Add and test multi-file selection through
  browser and desktop runtime APIs without changing single-file behavior.
- [x] P4-UI-003 (depends on P4-UI-002): Make the empty-state prompt clickable,
  add separate-document tabs preserving unsaved editor state, isolate document
  services, and test active-only shortcuts and tab switching.
- [x] P4-UI-004 (depends on P4-UI-003): Add responsive Anirdeshya branding with
  peacock-green/lotus-rose accents, professional system fonts and no invented logo.
- [x] P4-UI-005 (depends on P4-UI-004): Consolidate file menu, tabs, Tools and
  AI chat into one compact row beneath branding, remove repeated editor title,
  and verify no header wrapping at phone/tablet/desktop sizes.
- [ ] P4-EDIT-001 (depends on P4-UI-003): Add point-size/bold controls for new and
  selected PDF text overlays, preserving typography across preview/export/history.
- [x] P4-UI-006 (depends on P4-UI-005): Make "New PDF" create a blank A4 PDF in a
  new editable tab with unique Untitled names; relabel the empty placeholder tab.
- [x] P4-UI-007 (depends on P4-UI-006): Extract Metadata and Protect PDF into
  separate modal dialog components with improved responsive UI and tests.
- [x] P4-AI-004 (depends on P4-AI-003): Add a "How to get an API key" button in the
  AI assistant opening a visual step-by-step key guide component with tests.
- [x] P4-AI-005 (depends on P4-AI-004): Show a clear key-storage notice (memory
  of this tab only; never saved anywhere) in the AI assistant.
- [x] P4-UI-008 (depends on P4-UI-007): Verify every PDF action button and add
  staged progress/success/cancelled/error messages for all actions.
- [x] P4-RES-001 (depends on P4-UI-008 and P4-AI-005): Add a top-bar Resume
  builder with four ATS-friendly templates, structured sections, live preview,
  per-section "Draft with AI" (BYOK, consent, accept/discard), best-practice
  checklist, PDF download and open-in-editor, with tests.
- [ ] P4-UI-009 (depends on P4-UI-008): Verification follow-up - instructions
  when crop/form-field placement modes start, success/cancel/error messages for
  form-field creation, field counts / "nothing changed" for form-data import,
  reliable page thumbnails and opaque form-field inputs (no doubled text).
- [ ] P4-QA-001 (depends on P4-UI-005, P4-UI-006, P4-UI-007, P4-UI-008, P4-AI-004, P4-AI-005, P4-RES-001, P4-UI-009 and P4-EDIT-001): Run workspace regression tests, production
  build and responsive browser checks; document usage/limitations and synchronize
  task evidence, completion graph, and indexes.

Update this checklist and canonical task evidence after each successful completion.

## Traceability
- Legacy mirror: `master/TASKS.md`
- Progress tracking: `master/CODE_COMPLETION_GRAPH.md`
