# PDF Viewer & Editor - Agent Task Registry

Start execution only through [TASKS.md](../TASKS.md), after reading
[requirements](../REQUIREMENTS.md) and [design](../DESIGN.md).

## Layout

- Domain directories hold canonical `phaseN-tasks.json` records, domain
  `meta.json`, `master_tasks_index.json`, and a navigation README.
- Root `phase1-tasks.json` through `phase3-tasks.json` contain references only.
- [Master index](master_tasks_index.json) and [metadata](meta.json) contain
  generated project/domain/phase totals.
- [Schema contract](task-schema.json) lists required task fields and the
  compatibility differences from the reference project.
- [Source snapshot](source-snapshot.json) preserves the pre-migration master
  documents, SHA-256 hashes, and conflict reconciliation decisions.
- [Registry state](registry-state.json) holds migration completion and the
  [graph sequence](../CODE_COMPLETION_GRAPH.md).

## Migration coverage and provenance

The original master list defines 39 MVP, 10 advanced, and 6 enterprise tasks,
plus a separate historical QA execution record. All 56 IDs and all 115
checkboxes are preserved. Each canonical record carries the original section,
line, checklist state, declared dependency text, and added dependency reasons.
The ten completed product tasks and completed QA record retain their reported
status but explicitly use `not_reverified`. No historical model, passing
command, or unknown completion date was invented.

The old completion graph reused task IDs for different work and contained IDs
absent from the master list. Its full text is retained in the snapshot; it is
not an executable task catalog. Roadmap checklists, setup/framework guides,
and old sprint/status reports remain contextual or historical documents.
They do not override canonical definitions or add duplicate task identities.
In particular, the referenced historical traceability file was empty at
migration time, so it is not proof that prior QA passed.

## Maintenance

From the repository root (Node 18 or newer; no packages required):

```powershell
node .\master\tools\task-registry.cjs sync
node .\master\tools\task-registry.cjs validate
node --test .\master\tools\task-registry.test.cjs
```

Edit a canonical task JSON record deliberately, then synchronize and validate
after each successful completion. Synchronization updates the execution entry
point, root/domain indexes, rollups, and full Mermaid dependency graph. A
distinct task state advances the sequence; an unchanged rerun is idempotent.
Never edit generated tables/indexes directly.

Before starting a task with `planningRequired: true`, fill its priority,
estimate, deliverables, acceptance criteria, and any additional prerequisites.
Unknown backlog fields are null/empty intentionally, not approved scope.
Days in the original MVP plan convert to eight planning hours per day.
Narrative core-feature and release gates are recorded separately from declared
ID dependencies. Phase 3's stable-release gate is a migration normalization;
it does not claim that the source supplied missing feature-level dependencies.

For a **new** completion, supply actual execution model/provider and notes in
`executionResult`, `completedDate`, existing repository-relative `artifacts`,
and `verification` with `status: passed`, nonempty `commands`, and `summary`.
All dependencies must already be completed. The inherited `not_reverified`
exemption applies only to tasks reported completed in the immutable snapshot.
Model selection is an execution decision, not a speculative recommendation.

The import command is one-time only and refuses an existing registry.
`complete-migration` is only for closing the migration checklist after
verification; it is not a product task completion command.

## Reference compatibility

The structure follows the external `model-master/agent-tasks` registry and
`tools/agent-task-template.json`. Its PowerShell validator cannot be applied
unchanged: it requires phases 0-5, unrelated product documentation folders,
and passing evidence for all historical completions. This project preserves
its own phases 1-3 and links each logical domain to the existing shared product.
The local tool validates those explicit compatibility decisions rather than
fabricating data to satisfy the external project's assumptions.
