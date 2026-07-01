# Epaper Extraction Project - Requirements

## Document Purpose
Define the product, compliance, and delivery requirements for the epaper-extraction system that acquires user-authorized e-paper issues from supported publisher portals and generates high-fidelity PDF outputs for internal newsroom workflows.

## Product Goal
Provide a repeatable, auditable, and source-extensible extraction workflow that can:
- Acquire a user-entitled issue from a supported source.
- Select the best compliant capture route available for that source.
- Produce a complete ordered PDF artifact with provenance metadata.
- Surface enough telemetry, audit data, and operator controls to support production use.

## Primary Actors
- Operator: submits or supervises extraction jobs and reviews outcomes.
- Connector developer: implements new publisher/source connectors.
- Compliance reviewer: verifies that source policy, audit history, and access controls were respected.
- Downstream consumer: retrieves completed PDF artifacts and associated metadata.

## Scope
### In Scope
- Authenticated and public issue access where the requesting user has legal entitlement.
- Automated source login/session reuse within approved policy boundaries.
- Issue, edition, region, and page discovery.
- Hybrid capture strategy combining direct asset retrieval, rendered capture, and optional structured extraction.
- PDF assembly, metadata tagging, output storage, and retrieval references.
- Job orchestration, retries, quality gates, observability, and audit logging.
- Connector/plugin architecture for supporting multiple sources.

### Out of Scope
- Bypassing paywalls, DRM, anti-bot protections, captcha solving, or unauthorized access.
- Circumventing publisher terms, legal restrictions, or source-specific policy gates.
- Editing page content beyond normalization needed for faithful PDF generation.
- Public redistribution workflows, subscription management, or billing features.

## Assumptions and Constraints
- The system operates only on sources explicitly allow-listed through policy profiles.
- Access credentials, cookies, or sessions are provided by authorized users or trusted operators.
- Connectors may differ in capabilities; the platform must tolerate route variance without changing core orchestration.
- Fidelity is prioritized over structured text extraction when the two are in conflict.
- The first production milestone is a single pilot source, but the design must not hard-code pilot-only behavior into core modules.

## End-to-End Workflow Requirements
- WF-001 A job begins with a source identifier plus issue selection inputs such as date, edition, or region.
- WF-002 The platform validates source policy before any network automation or asset access occurs.
- WF-003 The platform authenticates or restores a valid session using approved secret/session inputs.
- WF-004 The connector discovers the target issue and enumerates all pages in deterministic order.
- WF-005 The route selector evaluates available capture strategies and executes the highest-priority compliant route.
- WF-006 The platform normalizes captured outputs, assembles the final PDF, validates quality gates, stores artifacts, and records the complete audit trail.

## Functional Requirements
### Source and Connector Management
- FR-001 The system shall register source connectors with a unique source key, supported domains, capability flags, and connector version.
- FR-002 The system shall expose a standardized connector SDK for authentication, issue discovery, page enumeration, and capture execution.
- FR-003 The system shall support source-specific policy profiles that can allow, deny, or constrain features per domain.

### Access and Authentication
- FR-004 The system shall support credential-based, cookie-based, or session-token-based authentication where permitted by source policy.
- FR-005 The system shall securely inject secrets into runtime execution without writing raw credentials to logs, queue payloads, or output metadata.
- FR-006 The system shall detect expired or invalid sessions and fail with explicit reason codes when re-authentication is required.

### Issue Discovery and Page Enumeration
- FR-007 The system shall discover available issues for a source, including date, edition, and region variants when exposed by the source.
- FR-008 The system shall resolve a single target issue deterministically from operator input and connector discovery results.
- FR-009 The system shall enumerate all pages for a selected issue with stable ordering and source page identifiers.
- FR-010 The system shall detect incomplete or duplicate page lists before final PDF assembly.

### Capture Strategy and Fallbacks
- FR-011 The system shall implement a hybrid capture pipeline that selects one of three route classes: direct asset, rendered capture, or structured extraction.
- FR-012 The system shall prefer direct asset retrieval when canonical PDF or image assets are available and policy-allowed.
- FR-013 The system shall use rendered browser capture when direct asset retrieval is unavailable, insufficient, or disallowed.
- FR-014 The system may use structured extraction only when connector reliability and policy explicitly permit it.
- FR-015 The route selector shall emit route selection decisions, fallback reasons, and terminal failure reasons for every job.

### PDF Assembly and Quality
- FR-016 The system shall normalize page dimensions, orientation, and minimum image quality before PDF assembly.
- FR-017 The system shall generate a final PDF with deterministic page ordering, document metadata, and a content checksum.
- FR-018 The system shall optionally include bookmarks or section metadata when the source exposes stable structure.
- FR-019 The system shall validate page count, corruption, duplicate pages, and minimum resolution thresholds before marking a job successful.
- FR-020 The system shall reject or quarantine outputs that fail quality gates and record explicit failure diagnostics.

### Orchestration and Operations
- FR-021 The system shall process jobs asynchronously through a queue with retry and dead-letter support.
- FR-022 The system shall support idempotent job submission using a caller-supplied or system-generated idempotency key.
- FR-023 The system shall provide operator controls for pause, resume, cancel, and rerun of failed jobs.
- FR-024 The system shall store output artifacts and provide retrieval metadata or links for downstream consumers.

### Auditability and Observability
- FR-025 The system shall create an immutable audit trail for each job, including actor, connector version, route used, timestamps, and outcome.
- FR-026 The system shall emit structured logs, metrics, and traces for authentication, discovery, capture, assembly, validation, and export stages.
- FR-027 The system shall preserve provenance metadata in the final artifact record, including source, issue identifier, execution timestamp, and connector version.

## Non-Functional Requirements
- NFR-001 Reliability: at least 98% successful completion for stable supported sources over a rolling 7-day period.
- NFR-002 Performance: one full issue of up to 24 pages shall complete within 6 minutes under nominal load for the pilot source.
- NFR-003 Scalability: the platform shall support horizontal workers and at least 50 concurrent issue jobs without architectural changes.
- NFR-004 Idempotency: repeated submissions with the same idempotency key shall not create duplicate final artifacts.
- NFR-005 Security: secrets shall be encrypted at rest and in transit and excluded from logs and operator-visible telemetry.
- NFR-006 Observability: every job stage shall be diagnosable through structured logs and stage-level metrics.
- NFR-007 Maintainability: connector implementations shall remain isolated from core orchestration, PDF assembly, and policy modules.
- NFR-008 Portability: the solution shall run in local development and cloud container environments.
- NFR-009 Extensibility: onboarding a new source shall not require core module rewrites when connector contracts are honored.

## Compliance and Governance Requirements
- CG-001 The system shall operate only on authorized user sessions and allow-listed domains.
- CG-002 The system shall enforce configurable rate limits, pacing rules, and backoff behavior per source.
- CG-003 The system shall respect source policy profiles for allowed actions, blocked features, and legal notes.
- CG-004 The system shall maintain auditable event history sufficient for internal compliance review.
- CG-005 The system shall not persist unauthorized raw source content beyond what is required for compliant output generation and diagnostics.

## Acceptance Criteria
- AC-001 For the pilot source, the platform extracts a complete issue and produces a correctly ordered PDF whose page count matches the discovered source page list.
- AC-002 If the preferred direct asset route is unavailable, the platform completes the same issue through at least one compliant fallback route.
- AC-003 Failed jobs retry according to policy and transition to dead-letter status with a machine-readable reason code after retry exhaustion.
- AC-004 The audit record for a completed job includes actor, source key, issue identifier, route used, output checksum, connector version, and final outcome.
- AC-005 An operator can reproduce the execution path for a completed job from stored configuration, connector version, and audit history.
- AC-006 A new connector can be added through the SDK contract without modifying the PDF assembly or queue orchestration modules.

## Traceability
### Requirement to Task Mapping
- FR-001 to FR-003 -> P1-S1-002, P1-S1-003
- FR-004 to FR-006 -> P5-S1-001
- FR-007 to FR-010 -> P5-S1-001
- FR-011 to FR-015 -> P2-S1-001, P2-S1-002, P2-S1-003
- FR-016 to FR-020 -> P3-S1-001, P3-S1-002, P3-S1-003
- FR-021 to FR-024 -> P4-S1-001, P4-S1-002
- FR-025 to FR-027 -> P4-S1-002, P4-S1-003
- NFR-001 to NFR-009 -> P4-S1-003, P5-S1-002, P5-S1-003
- CG-001 to CG-005 -> P1-S1-003, P4-S1-002, P5-S1-003

### Document Control
- Baseline refinement completed on 2026-07-01.
- Task tracking authority remains in tasks.md.
- Execution progress authority remains in code-completion-graph.md.