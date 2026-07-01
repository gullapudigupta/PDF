# Epaper Extraction Project - Architecture Document

## High-Level Architecture

Layers:
- API and Control Plane
- Orchestration and Queue Plane
- Source Connector and Capture Plane
- PDF and Artifact Plane
- Observability and Governance Plane

## Component View
- Ingress API
- Accepts extraction requests and validates source policy profile.

- Job Orchestrator
- Creates idempotent jobs and enqueues execution plans.

- Connector Registry
- Resolves source connector version and capabilities.

- Capture Worker
- Executes route selector and page capture logic.

- PDF Assembly Service
- Combines normalized pages and injects metadata.

- Artifact Store
- Stores raw captures, final PDF, manifests, and checksums.

- Audit Event Store
- Append-only event records for full traceability.

- Monitoring Stack
- Metrics, logs, traces, and alerting.

## Sequence Flow (Nominal)
1. API receives request with source + issue reference.
2. Policy gate validates allowed source and action profile.
3. Orchestrator creates job and pushes to queue.
4. Worker resolves connector and authenticates session.
5. Connector discovers issue pages and preferred route hints.
6. Capture pipeline executes Route A/B/C with fallbacks.
7. PDF service assembles pages and validates output.
8. Artifact + manifest stored; audit events emitted.
9. API updates status and exposes retrieval endpoint.

## Data Contracts (Logical)
- ExtractionRequest
- requestId, sourceId, issueDate, edition, requester, policyProfile.

- JobManifest
- jobId, connectorVersion, routeSummary, pageCount, outputChecksum.

- PageCaptureResult
- pageIndex, routeUsed, sourceRef, dimensions, checksum, qualityScore.

- AuditRecord
- eventId, jobId, actor, action, timestamp, payloadDigest.

## Reliability Patterns
- Idempotency keys per request.
- Retry classes with bounded attempts.
- Dead-letter queue and replay tooling.
- Checkpoint/resume after partial completion.

## Security Architecture
- Secret vault integration for credentials.
- Token-scoped worker execution.
- Role-based API authorization.
- Redacted logs and encrypted artifact channels.

## Deployment Architecture
- Containerized microservices on Kubernetes or equivalent.
- Redis for queue, Postgres for control/audit data.
- Object storage for artifacts.
- Optional extension bridge service for session handoff.

## Scalability Approach
- Horizontal worker scaling by queue lag.
- Separate pools for heavy rendered-capture jobs.
- Source-specific throttling and fair scheduling.

## Failure Domains and Recovery
- Auth failure domain: isolated, operator intervention flow.
- Source change domain: connector hotfix release flow.
- Storage/queue outage domain: pause intake + replay backlog.

## Architecture Decisions
- AD-001 Hybrid route selection over single-route system.
- AD-002 Plugin connector SDK for source isolation.
- AD-003 Queue-first orchestration for resilience and scale.
- AD-004 Audit-first governance for compliance traceability.