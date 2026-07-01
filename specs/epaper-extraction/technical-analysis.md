# Epaper Extraction Project - Detailed Technical Analysis

## Problem Characteristics
- Publisher platforms are dynamic, frequently changing, and often rely on client-side rendering.
- Asset availability varies: some expose direct PDFs, others only tile images or rendered canvases.
- Authentication complexity is non-trivial (expiring sessions, MFA, anti-automation checks).
- Output quality must be deterministic and production-grade for newsroom workflows.

## Strategy Analysis

### Strategy A: Direct HTTP scraping only
- Pros:
- Fast when endpoints are stable and discoverable.
- Lower compute cost than browser automation.
- Cons:
- Breaks frequently when tokens/signatures are obfuscated.
- Weak against dynamic rendering and anti-bot controls.
- Recommendation:
- Keep as optimized route where connector proves stability.

### Strategy B: Browser-rendered capture only
- Pros:
- Most resilient to dynamic frontends.
- Mirrors user-visible result and layout.
- Cons:
- Higher CPU/memory cost and slower throughput.
- Harder to scale without strong queue controls.
- Recommendation:
- Use as reliable default fallback route.

### Strategy C: Hybrid (recommended)
- Pros:
- Best reliability/cost trade-off.
- Route selector can exploit direct assets when available and fallback to rendering.
- Cons:
- Higher engineering complexity.
- Recommendation:
- Adopt for production architecture.

## Core Technical Challenges and Solutions
- Challenge 1: Source-specific DOM volatility
- Solution: connector SDK + selector abstraction + visual regression tests.

- Challenge 2: Lazy-loaded or segmented pages
- Solution: deterministic wait-for-network-idle and scroll/viewport staging.

- Challenge 3: Session lifecycle failures
- Solution: explicit auth-state machine, refresh hooks, operator-assisted re-auth.

- Challenge 4: Page ordering and completeness
- Solution: strict page index model + count reconciliation + missing-page retries.

- Challenge 5: Quality consistency across devices
- Solution: fixed rendering profiles (DPI, viewport, color), quality gate thresholds.

- Challenge 6: Scale and cost pressure
- Solution: queue backpressure, per-source concurrency limits, autoscaled worker pools.

## Tooling Evaluation
- Browser automation: Playwright preferred for robust context/session handling.
- Queue: BullMQ is mature and fits Node ecosystem.
- PDF generation: pdf-lib for metadata and composition flexibility.
- Image pipeline: Sharp for fast normalization/compression.
- Observability: OpenTelemetry with Prometheus/Grafana.

## Data and Storage Considerations
- Persist raw captures and final artifacts separately for traceability.
- Attach immutable checksums at each stage.
- Retention policy by legal/compliance profile per source.

## Performance and Capacity Model (initial)
- Single worker target: 2 to 4 issues/minute depending on page count and route type.
- Initial cluster: 8 workers + autoscale to 24 during spikes.
- Queue SLO: 95th percentile wait < 3 minutes under normal load.

## Security and Compliance Analysis
- Avoid storing long-lived credentials in service database.
- Prefer vault-managed secrets and short-lived tokens.
- Enforce source policy profile before every job transition.
- Ensure output provenance metadata and immutable audit chain.

## Recommended MVP Boundary
- One pilot source connector.
- Full hybrid capture + PDF assembly + queue + audit.
- Operator console for job visibility and re-run controls.
- Expand to additional connectors only after stability benchmark is met.