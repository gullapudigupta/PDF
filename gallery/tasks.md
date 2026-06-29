# Kiro Spec - Tasks

## Traceability
- Requirements source: [requirements.md](requirements.md)
- Design source: [design.md](design.md)
- Progress tracking: [code-completion-graph.md](code-completion-graph.md)

## 1. Task Governance Rules
### 1.1 Single Execution Source
All implementation must be executed from this tasks document only.

### 1.2 Mandatory Update Rule
After each successful completion:
1. Update task status/checklist in this file.
2. Update graph sequence and node progress in [code-completion-graph.md](code-completion-graph.md).

### 1.3 Naming Convention
Use task IDs in format: [P{phase}-S{sprint}-{number}]

### 1.4 Status Legend
- Red: Not Started
- Yellow: In Progress
- Green: Completed
- Blue: Blocked
- Orange: On Hold

### 1.5 Priority Legend
- Critical
- High
- Medium
- Low

### 1.6 Credit Budget Rule
Execution must use at most 93% of total available credits, preserving at least 7% buffer.

## 2. Phase 1 - Foundation and Ingestion
### [P1-S1-001] Green Setup gallery module skeleton
Priority: Critical | Dependency: None
- [x] Create module boundaries for catalog/contact/quality/review/cleanup
- [x] Add runtime adapter contracts for web/mobile/extension

### [P1-S1-002] Green Build folder scan and source inference baseline
Priority: Critical | Dependency: [P1-S1-001]
- [x] Implement folder scanning and metadata extraction
- [x] Implement source app inference rules by folder taxonomy

### [P1-S1-003] Green Build CSV and Excel import pipeline
Priority: High | Dependency: [P1-S1-001]
- [x] Parse CSV and Excel contacts
- [x] Add field mapping and validation
- [x] Add random name fallback generator

## 3. Phase 2 - Intelligence Pipeline
### [P1-S2-001] Green Implement duplicate detection engine
Priority: Critical | Dependency: [P1-S1-002]
- [x] Add exact hash matcher
- [x] Add perceptual hash clustering

### [P1-S2-002] Green Implement blur and low-quality scoring
Priority: Critical | Dependency: [P1-S1-002]
- [x] Add blur scoring heuristic
- [x] Add low-quality scoring from resolution and compression proxies

### [P1-S2-003] Green Implement face visibility scoring
Priority: High | Dependency: [P1-S1-002]
- [x] Add face presence detection integration
- [x] Add visibility confidence scoring

## 4. Phase 3 - UI and Review Workflows
### [P1-S3-001] Green Build WhatsApp-like group/contact list UI
Priority: Critical | Dependency: [P1-S1-003]
- [x] Group-first ordering
- [x] Contact aggregation with total size

### [P1-S3-002] Green Build candidate review and compare workspace
Priority: Critical | Dependency: [P1-S2-001], [P1-S2-002], [P1-S2-003]
- [x] Candidate cards with reason/confidence
- [x] Side-by-side compare for duplicates and blur quality

### [P1-S3-003] Green Build keep/delete decision workflow
Priority: Critical | Dependency: [P1-S3-002]
- [x] Keep/delete marking
- [x] Undo grace window

## 5. Phase 4 - Cleanup and Hardening
### [P1-S4-001] Green Implement dry-run and confirmed delete execution
Priority: Critical | Dependency: [P1-S3-003]
- [x] Dry-run savings preview
- [x] Confirmed delete processing

### [P1-S4-002] Green Implement empty-folder cleanup pass
Priority: High | Dependency: [P1-S4-001]
- [x] Detect empty folders after deletion
- [x] Execute safe empty-folder removal

### [P1-S4-003] Green Cross-runtime validation (web/mobile/extension)
Priority: High | Dependency: [P1-S4-001]
- [x] Validate adapter behavior per runtime
- [x] Validate ingestion, analysis, and delete flows

## 6. Phase 5 - Quality and Release Readiness
### [P1-S5-001] Red Add automated test suites
Priority: High | Dependency: [P1-S4-003]
- [ ] Unit tests for engines and services
- [ ] Integration tests for review and cleanup flows

### [P1-S5-002] Red Performance and reliability pass
Priority: Medium | Dependency: [P1-S5-001]
- [ ] Large gallery benchmark runs
- [ ] Memory and responsiveness verification

### [P1-S5-003] Red Final documentation and handoff
Priority: Medium | Dependency: [P1-S5-002]
- [ ] Final status update
- [ ] Final graph sequence update

## 7. Completion Protocol
For each completed task:
1. Change status Red to Green and check all subtasks.
2. Add sequence record in [code-completion-graph.md](code-completion-graph.md) using next GSEQ index.
3. Update dependency graph node percentage.
