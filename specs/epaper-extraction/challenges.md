# Epaper Extraction Project - Challenges to Overcome

## Top Technical Challenges
- Continuous source UI/layout changes that break selectors.
- Dynamic rendering and lazy loading that cause incomplete captures.
- Session instability due to MFA, token expiry, and anti-bot protections.
- Mixed asset formats (direct PDF, image tiles, canvas rendering).
- Maintaining output fidelity and consistent PDF quality.
- High compute usage of browser automation under scale.
- Cross-source normalization for metadata and page ordering.
- Observability gaps during intermittent failures.

## Operational Challenges
- Connector maintenance lifecycle for many publishers.
- Fast rollback/hotfix process when a source breaks.
- Capacity planning during spike days (special editions/events).
- Incident response ownership and runbook quality.

## Compliance and Governance Challenges
- Clarifying rights and acceptable-use boundaries per source.
- Tracking policy changes and enforcing them quickly.
- Ensuring audit completeness and non-repudiation.

## What to Put in Place Early
- Connector contract tests + golden outputs.
- Policy profile engine with deny-by-default switches.
- Strong telemetry baseline and failure taxonomy.
- Source onboarding checklist and acceptance gate.
- Change management process for connector updates.