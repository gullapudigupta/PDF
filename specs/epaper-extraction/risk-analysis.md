# Epaper Extraction Project - Risk Analysis

## Risk Register

- R1 Legal/compliance misalignment
- Likelihood: Medium
- Impact: High
- Trigger: source policy changes, unclear rights boundaries
- Mitigation:
- Per-source policy profiles and legal review checkpoints.
- Block unsupported actions by default.
- Residual risk: Medium

- R2 Source HTML/DOM volatility
- Likelihood: High
- Impact: High
- Trigger: publisher UI updates and anti-bot changes
- Mitigation:
- Connector isolation, contract tests, visual golden tests, rapid version rollouts.
- Residual risk: Medium

- R3 Authentication/session fragility
- Likelihood: High
- Impact: High
- Trigger: MFA flows, token expiry, CAPTCHA challenges
- Mitigation:
- Session-refresh workflows, operator re-auth tooling, no blind retries for auth failures.
- Residual risk: Medium-High

- R4 Capture quality degradation
- Likelihood: Medium
- Impact: High
- Trigger: low-resolution captures, partial rendering, dynamic lazy loading
- Mitigation:
- Deterministic viewport and wait strategies, quality gates, duplicate/corruption checks.
- Residual risk: Medium

- R5 Throughput bottlenecks at scale
- Likelihood: Medium
- Impact: High
- Trigger: queue backlog, browser worker saturation
- Mitigation:
- Queue partitioning per source, autoscaling workers, backpressure controls.
- Residual risk: Medium

- R6 Data leakage in logs/artifacts
- Likelihood: Medium
- Impact: High
- Trigger: accidental credential/session logging
- Mitigation:
- Log redaction policies, secret vault integration, DLP scanning in CI.
- Residual risk: Low-Medium

- R7 Incomplete auditability
- Likelihood: Low-Medium
- Impact: High
- Trigger: missing events or mutable history
- Mitigation:
- Immutable append-only audit events with integrity hashes.
- Residual risk: Low

- R8 Third-party dependency vulnerabilities
- Likelihood: Medium
- Impact: Medium-High
- Trigger: CVEs in browser/PDF/image libraries
- Mitigation:
- SCA scanning, patch windows, dependency pinning and staged upgrades.
- Residual risk: Medium

- R9 Operational blind spots
- Likelihood: Medium
- Impact: Medium
- Trigger: weak metrics/tracing and unclear failure reasons
- Mitigation:
- Standardized telemetry schema, route-level SLIs, alert runbooks.
- Residual risk: Low-Medium

- R10 Multi-domain expansion complexity
- Likelihood: High
- Impact: Medium
- Trigger: heterogeneous source behaviors and policy differences
- Mitigation:
- Plugin SDK, onboarding checklist, connector certification suite.
- Residual risk: Medium

## Risk Heatmap Summary
- Critical focus risks: R1, R2, R3, R4, R5.
- First-wave mitigation tasks: policy gates, connector tests, auth handling, quality pipeline, autoscaling queue.

## Governance Cadence
- Weekly risk review with trend of failed jobs by reason code.
- Monthly connector stability report per source.
- Release gate: no unresolved High impact risk without executive waiver.