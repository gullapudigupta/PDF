# Epaper Extraction Project - Design

## Design Objective
Translate the epaper extraction requirements into an MVP-capable architecture that is compliant, connector-extensible, and operationally traceable from job submission through PDF delivery.

## Architecture Summary
The system is a backend-first extraction platform with an optional browser-extension or session-handoff helper. The MVP architecture separates policy validation, connector execution, capture routing, PDF assembly, storage, and audit/observability concerns so that a new source can be added without rewriting the orchestration core.

## Design Principles
- Compliance first: every network or capture action is gated by source policy and authorized session context.
- Connector isolation: each source adapter remains independently testable, versioned, and deployable within the SDK contract.
- Deterministic output: the same source issue and connector version should produce reproducible page ordering and artifact metadata.
- Fallback resilience: route selection is explicit, observable, and able to degrade gracefully from direct assets to rendered capture.
- Operations visibility: all critical state transitions emit audit and telemetry signals.

## D-01 Runtime Topology
### Core Services
- API service accepts extraction requests, validates policy, resolves operator identity, and enqueues jobs.
- Queue/orchestrator service coordinates retries, concurrency limits, and lifecycle transitions.
- Worker service executes connector workflows, route selection, capture, and quality gates.
- PDF assembly service normalizes page outputs, builds the final artifact, and writes checksum metadata.
- Audit/telemetry service records immutable events, metrics, traces, and operator-facing status data.

### Optional Supporting Services
- Session handoff bridge accepts approved browser/session material from an extension or trusted operator flow.
- Object storage retains generated artifacts and diagnostic byproducts according to retention policy.
- PostgreSQL stores jobs, connector metadata, audit references, and output indexes.
- Redis backs queue state, short-lived orchestration state, and concurrency coordination.

## D-02 End-to-End Request Flow
1. Operator submits a request with source key and issue selectors.
2. API validates source allow-listing, policy profile, and requester permissions.
3. Queue creates an idempotent job record and dispatches work to a compatible worker.
4. Worker loads connector version, restores session context, and resolves the target issue.
5. Connector enumerates pages and emits capture hints.
6. Route selector executes the best compliant route and records fallback decisions as needed.
7. Page outputs pass normalization and quality gates.
8. PDF assembler creates the final artifact and publishes metadata.
9. Audit service finalizes the immutable job trail and exposes completion status.

## D-03 Source Connector SDK
### Connector Contract
- identifyIssue(input): resolves date, edition, region, and source-native issue identifiers.
- listPages(issue): returns ordered page descriptors with stable page keys.
- captureHints(page): returns preferred route, required viewport, asset endpoints, and source constraints.
- normalizeMeta(issue, page): maps source-native metadata into the platform schema.
- validatePolicyContext(context): optional connector-side preflight for source-specific policy rules.

### Registry Model
- Source key plus pinned connector version determine runtime behavior.
- Capability flags describe support for direct PDF, image tiles, rendered capture, structured extraction, and bookmark metadata.
- Connectors are loaded behind a registry abstraction so workers depend on interfaces rather than source-specific modules.

### Connector Boundaries
- Connectors may discover data and define source-specific execution hints.
- Connectors may not bypass policy modules, mutate queue state directly, or persist artifacts outside the platform storage layer.

## D-04 Policy and Compliance Layer
- Policy profiles define allow-listed domains, route permissions, rate limits, legal notes, and restricted features.
- The API validates policy before job creation; the worker validates policy again before route execution.
- Policy evaluation outcomes are persisted as auditable decisions, not transient log-only events.
- Rate-limiting and backoff settings are source-specific to minimize anti-automation and legal risk.

## D-05 Hybrid Capture Pipeline
### Route Priority
- Route A: direct asset retrieval for canonical PDF or image artifacts.
- Route B: rendered capture through Playwright for browser-visible page rendering.
- Route C: optional structured extraction for text overlays or metadata enrichment when policy and reliability permit it.

### Route Selector Responsibilities
- Evaluate connector hints, policy permissions, source capabilities, and observed runtime conditions.
- Emit the selected route, fallback sequence, and terminal reason codes.
- Preserve enough evidence to explain why a lower-priority route was used.

### Capture Output Model
- Each page capture produces a page index, route type, source reference, capture metrics, checksum, and diagnostics snapshot.
- Failed page captures remain individually inspectable to support reruns and root-cause analysis.

## D-06 PDF Assembly and Quality Gate Design
### Normalization Pipeline
- Normalize page dimensions, orientation, color profile, and minimum DPI.
- Reject malformed or corrupt pages before assembly.
- Preserve source page order regardless of capture route.

### Assembly Pipeline
- Assemble pages into a single PDF with deterministic ordering.
- Inject document metadata including source, issue reference, connector version, job ID, and execution timestamp.
- Generate optional bookmarks only when stable section metadata exists.
- Produce output checksum and validation report for downstream verification.

### Quality Gates
- Page count must match enumerated source pages unless the job explicitly fails.
- Duplicate-page detection uses checksums and visual heuristics.
- Resolution and corruption checks determine pass, retry, or dead-letter outcomes.

## D-07 Orchestration, Retries, and Idempotency
- BullMQ manages job dispatch with per-source concurrency controls.
- Job creation uses idempotency keys so duplicate requests do not create duplicate final artifacts.
- Retry policies are class-based:
- transient network failures: exponential backoff.
- source-layout or selector drift: limited retries plus operator review signal.
- authentication failures: no blind retry; session refresh required.
- terminal compliance failures: immediate stop with auditable reason code.
- Dead-letter entries must preserve the last route, failure class, and remediation hint.

## D-08 Logical Data Model
- Job: id, sourceKey, connectorVersion, issueRef, requester, idempotencyKey, status, timestamps.
- JobAttempt: attemptNumber, workerId, routePlan, failureClass, startedAt, endedAt.
- PageCapture: pageIndex, pageKey, route, sourceUrl, captureMetrics, hash, diagnosticsRef.
- Artifact: storageKey, checksum, mimeType, pageCount, sizeBytes, createdAt.
- AuditEvent: eventType, actor, payloadHash, timestamp, correlationId.
- PolicyDecision: sourceKey, policyVersion, decision, rationale, evaluatedAt.

## D-09 Security Model
- Secrets are retrieved from a vault-backed provider and injected only at runtime.
- Workers use short-lived credentials or signed claims for dependent service access.
- Logs redact credentials, tokens, session cookies, and raw source content where inappropriate.
- RBAC distinguishes operator, admin, and auditor capabilities.
- Artifact access is mediated through platform-generated retrieval references rather than direct unauthenticated paths.

## D-10 Observability and Audit Model
### Metrics
- Job duration by source and route.
- Capture success rate by route.
- Retry count by failure class.
- Queue lag, worker saturation, and dead-letter rate.

### Traces and Logs
- End-to-end trace spans run from request intake through artifact publication.
- Structured logs include correlation ID, source key, connector version, and route metadata.
- Audit events are immutable and separate from best-effort operational logs.

### Alerts
- Reliability SLO breach.
- Auth failure spike for a source.
- Fallback route spike indicating direct route regression.
- Dead-letter growth beyond source-specific thresholds.

## D-11 Deployment Architecture
- Containerized services: API, worker, Redis, PostgreSQL, and optional session bridge.
- Object storage holds artifacts and bounded diagnostic outputs with retention policies.
- Local development may use a reduced topology with Docker Compose or equivalent service containers.
- Production deployment must support horizontal worker scaling without connector contract changes.

## D-12 MVP Boundary
### Included in MVP
- One pilot source connector.
- Policy profile enforcement for the pilot source.
- Direct asset and rendered capture routes.
- PDF assembly with metadata and checksum.
- Queue processing, retries, dead-letter handling, audit trail, and basic operational status reporting.

### Deferred Beyond MVP
- Multi-source connector catalog.
- Advanced structured extraction overlays.
- Rich operator dashboard UX beyond status and rerun controls.
- Automated connector certification pipeline.

## Verification Strategy
- Contract tests for the connector SDK and registry.
- Golden issue fixtures for PDF fidelity regression.
- Integration tests for route selection and fallback behavior.
- Queue and retry tests including dead-letter transitions.
- Security checks for secret leakage, unauthorized route usage, and audit completeness.

## Traceability
- Requirements FR-001 to FR-003 map to D-03 and D-04.
- Requirements FR-004 to FR-006 map to D-02, D-03, and D-09.
- Requirements FR-007 to FR-015 map to D-02 through D-07.
- Requirements FR-016 to FR-020 map to D-06.
- Requirements FR-021 to FR-027 map to D-07 through D-10.
- MVP execution tracking is maintained in status.md and tasks.md.