# Kiro Spec - Design

## Traceability
- Requirements source: [requirements.md](requirements.md)
- Task source: [tasks.md](tasks.md)
- Progress source: [code-completion-graph.md](code-completion-graph.md)

## 1. Architecture Overview
Layered design with shared domain core and runtime adapters.

1. Presentation Layer
- Angular web UI components
- Ionic mobile UI shell
- Extension compact UI panel

2. Application Layer
- Scan orchestration
- Contact ingestion pipeline
- Review and delete workflows

3. Intelligence Layer
- Duplicate engine
- Blur engine
- Face visibility engine
- Low-quality engine

4. Platform Adapter Layer
- Web adapter
- Mobile filesystem adapter
- Extension storage/file adapter

5. Persistence Layer
- Local indexed storage for manifests, decisions, and import mappings

## 2. Module Design
- catalog-module: folder scan, metadata extraction, source inference
- contact-module: CSV/Excel parsing, contact mapping, fallback name generator
- quality-module: blur/duplicate/face/quality scoring
- review-module: cluster views, compare views, keep/delete decisions
- cleanup-module: delete executor, empty-folder cleanup pass
- telemetry-module: local audit log of cleanup actions

## 3. Data Contracts
### 3.1 MediaItem
- id
- path
- folderType
- sourceApp
- width
- height
- fileSize
- hashExact
- hashPerceptual
- faceCount
- faceVisibilityScore
- blurScore
- qualityScore
- categoryFlags

### 3.2 ContactProfile
- id
- displayName
- sourceType (imported or generated)
- groupId optional
- linkedMediaIds
- totalMediaSize

### 3.3 CleanupDecision
- mediaId
- decision (keep or delete)
- reasons list
- confidence
- reviewedByUser
- timestamp

## 4. Core Processing Flows
### 4.1 Scan and Infer
1. Scan folders.
2. Infer source app by folder signature.
3. Build media catalog entries.

### 4.2 Analyze
1. Run duplicate pass (exact then perceptual).
2. Run blur and quality scoring.
3. Run face visibility scoring where faces exist.
4. Produce candidate sets.

### 4.3 Review
1. Show groups then contacts with total size.
2. Show candidate reasons and confidence.
3. User marks keep/delete and confirms.

### 4.4 Cleanup
1. Run delete on confirmed items only.
2. Run empty-folder pass after delete.
3. Save local cleanup report.

## 5. UI Composition
- left-nav: groups, contacts, folder sources
- center-grid: media cards and cluster compare
- right-panel: decision rationale and quick actions
- top-summary: savings, candidate counts, confidence distribution

## 6. Safety and Reliability
- Dry-run mode required before destructive operations.
- Undo grace window before hard delete finalization.
- Thresholds configurable and conservative by default.

## 7. Requirement Mapping
- FR-001 to FR-005 -> catalog-module and contact-module.
- FR-006 to FR-010 -> quality-module.
- FR-011 to FR-019 -> review-module and presentation layer.
- FR-020 to FR-022 -> cleanup-module.
- FR-023 to FR-024 -> platform adapter layer.
