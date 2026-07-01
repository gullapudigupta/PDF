# Epaper Extraction Project - Tasks

## Task Rules
- Execute implementation from this task list only.
- Update task status immediately after successful completion.
- Update code completion graph and add next GSEQ sequence entry for each completed task.

## Status Legend
- TODO
- IN_PROGRESS
- DONE
- BLOCKED

## Phase 0 - Specification Baseline
- [P0-S1-001] Refine requirements baseline for epaper extraction
- Priority: High
- Depends on: none
- Status: DONE
- Completed: 2026-07-01
- Requirement refs: baseline
- Done criteria:
- Requirements document expanded with actors, workflow, detailed FR/NFR/CG coverage, and task traceability.

- [P0-S1-002] Refine design baseline for epaper extraction
- Priority: High
- Depends on: P0-S1-001
- Status: DONE
- Completed: 2026-07-01
- Requirement refs: FR-001 to FR-027, NFR-001 to NFR-009, CG-001 to CG-005
- Deliverables:
- Design document aligned to requirements, workflow stages, module boundaries, and MVP scope.
- Done criteria:
- Design covers runtime topology, request flow, connector SDK, policy layer, capture routes, data model, security, observability, deployment, and MVP boundary.

- [P0-S1-003] Refine execution tasks for MVP delivery
- Priority: High
- Depends on: P0-S1-001, P0-S1-002
- Status: DONE
- Completed: 2026-07-01
- Requirement refs: execution baseline
- Deliverables:
- Task list updated with clearer execution intent, requirement mapping, and MVP milestone structure.
- Done criteria:
- Tasks document can drive implementation sequencing without relying on external planning notes.

- [P0-S1-004] Create MVP completion status tracker
- Priority: Medium
- Depends on: P0-S1-003
- Status: DONE
- Completed: 2026-07-01
- Requirement refs: FR-023, FR-025, NFR-006
- Deliverables:
- Separate status document for milestone progress, completed documentation work, and MVP readiness tracking.
- Done criteria:
- Status document exists and is aligned with the current task baseline.

## Phase 1 - Foundation
- [P1-S1-001] Initialize service skeleton and repo standards
- Priority: Critical
- Depends on: none
- Status: TODO
- MVP milestone: M1 Foundation
- Requirement refs: FR-001, FR-021, NFR-007, NFR-008
- Done criteria:
- API/worker shared config structure ready.
- Lint/test/build pipelines green.

- [P1-S1-002] Define connector SDK contracts and registry
- Priority: Critical
- Depends on: P1-S1-001
- Status: TODO
- MVP milestone: M1 Foundation
- Requirement refs: FR-001, FR-002, FR-003, NFR-009
- Done criteria:
- Stable TypeScript interfaces.
- Versioned registry with capability flags.

- [P1-S1-003] Implement policy profile module
- Priority: High
- Depends on: P1-S1-001
- Status: TODO
- MVP milestone: M1 Foundation
- Requirement refs: FR-003, CG-001, CG-002, CG-003
- Done criteria:
- Domain allow/deny + route policy gates.

## Phase 2 - Capture Core
- [P2-S1-001] Build Playwright capture worker
- Priority: Critical
- Depends on: P1-S1-002
- Status: TODO
- MVP milestone: M2 Capture Core
- Requirement refs: FR-011, FR-013, FR-015
- Done criteria:
- Deterministic viewport profiles and screenshot route.

- [P2-S1-002] Build direct asset fetch route
- Priority: Critical
- Depends on: P1-S1-002
- Status: TODO
- MVP milestone: M2 Capture Core
- Requirement refs: FR-011, FR-012, FR-015
- Done criteria:
- Download and verify direct PDF/image artifacts.

- [P2-S1-003] Build hybrid route selector and fallback engine
- Priority: Critical
- Depends on: P2-S1-001, P2-S1-002
- Status: TODO
- MVP milestone: M2 Capture Core
- Requirement refs: FR-011, FR-013, FR-014, FR-015
- Done criteria:
- Automatic route switching with reason codes.

## Phase 3 - PDF and Quality
- [P3-S1-001] Implement image normalization pipeline
- Priority: High
- Depends on: P2-S1-003
- Status: TODO
- MVP milestone: M3 PDF and Quality
- Requirement refs: FR-016, FR-019
- Done criteria:
- DPI/orientation normalization completed.

- [P3-S1-002] Implement PDF assembler with metadata injection
- Priority: Critical
- Depends on: P3-S1-001
- Status: TODO
- MVP milestone: M3 PDF and Quality
- Requirement refs: FR-017, FR-018, FR-027
- Done criteria:
- Ordered PDF output with metadata and checksum.

- [P3-S1-003] Implement quality gate checks
- Priority: High
- Depends on: P3-S1-002
- Status: TODO
- MVP milestone: M3 PDF and Quality
- Requirement refs: FR-019, FR-020, NFR-001
- Done criteria:
- Page count, corruption, and duplicate detection checks.

## Phase 4 - Orchestration and Operations
- [P4-S1-001] Add BullMQ queue and retry/dead-letter policies
- Priority: Critical
- Depends on: P2-S1-003
- Status: TODO
- MVP milestone: M4 Operations
- Requirement refs: FR-021, FR-022, NFR-004
- Done criteria:
- Robust retry classes and dead-letter queue.

- [P4-S1-002] Add audit event service and immutable trail
- Priority: High
- Depends on: P1-S1-003, P4-S1-001
- Status: TODO
- MVP milestone: M4 Operations
- Requirement refs: FR-025, FR-027, CG-004
- Done criteria:
- Complete audit records for all state transitions.

- [P4-S1-003] Add observability dashboards and alerts
- Priority: Medium
- Depends on: P4-S1-001
- Status: TODO
- MVP milestone: M4 Operations
- Requirement refs: FR-026, NFR-006
- Done criteria:
- Key SLI/SLO dashboards and alert rules active.

## Phase 5 - Pilot Source and Hardening
- [P5-S1-001] Implement pilot source connector (example domain)
- Priority: Critical
- Depends on: P2-S1-003, P3-S1-003
- Status: TODO
- MVP milestone: M5 Pilot and Readiness
- Requirement refs: FR-004 to FR-010, FR-012 to FR-015
- Done criteria:
- Full issue extraction for pilot source.

- [P5-S1-002] E2E reliability and load tests
- Priority: High
- Depends on: P5-S1-001, P4-S1-003
- Status: TODO
- MVP milestone: M5 Pilot and Readiness
- Requirement refs: NFR-001, NFR-002, NFR-003
- Done criteria:
- >= 98% success target validated in test window.

- [P5-S1-003] Security/compliance validation and go-live checklist
- Priority: High
- Depends on: P5-S1-002, P4-S1-002
- Status: TODO
- MVP milestone: M5 Pilot and Readiness
- Requirement refs: NFR-005, CG-001 to CG-005
- Done criteria:
- Compliance gates and operations runbook approved.

## MVP Milestones
- M1 Foundation: P1-S1-001 to P1-S1-003
- M2 Capture Core: P2-S1-001 to P2-S1-003
- M3 PDF and Quality: P3-S1-001 to P3-S1-003
- M4 Operations: P4-S1-001 to P4-S1-003
- M5 Pilot and Readiness: P5-S1-001 to P5-S1-003

## Graph Update Protocol
- For each DONE task:
- Mark task status and completion timestamp.
- Update node completion in code completion graph.
- Append next sequence ID entry (GSEQ-###) with summary.