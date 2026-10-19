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
- [ ] P4-UI-003 (depends on P4-UI-002): Make the empty-state prompt clickable,
  add separate-document tabs preserving unsaved editor state, isolate document
  services, and test active-only shortcuts and tab switching.
- [ ] P4-QA-001 (depends on P4-UI-003): Run workspace regression tests, production
  build and responsive browser checks; document usage/limitations and synchronize
  task evidence, completion graph, and indexes.

Update this checklist and canonical task evidence after each successful completion.

## Traceability
- Legacy mirror: `master/TASKS.md`
- Progress tracking: `master/CODE_COMPLETION_GRAPH.md`
