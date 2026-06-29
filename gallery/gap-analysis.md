# Kiro Spec - Gap Analysis

## Traceability
- Input analysis: [technical-analysis.md](technical-analysis.md)
- UI direction: [ui-analysis.md](ui-analysis.md)
- Requirement baseline: [requirements.md](requirements.md)

## 1. Current State
- Repository already has a mature Angular workspace for a PDF product.
- Gallery folder is present but has no implementation or specification artifacts.
- No current media cleanup, image intelligence, or contact grouping modules exist.

## 2. Target State
- A new gallery cleaner product specification set fully under gallery.
- Cross-surface support for Angular web, Ionic mobile, and extension runtime.
- Executable delivery model controlled only through tasks and code completion graph updates.

## 3. Gap Matrix
## 3.1 Product and Feature Gaps
- Gap: no junk file detection workflows.
  - Impact: core product value missing.
  - Resolution: add rule-driven and score-driven classification pipeline.

- Gap: no duplicate, blur, face visibility, or low-quality scoring.
  - Impact: useful vs non-useful filtering unavailable.
  - Resolution: define modular image quality engine with configurable thresholds.

- Gap: no contact/group ingestion from CSV/Excel.
  - Impact: WhatsApp-like organization impossible.
  - Resolution: define import pipeline with fallback random naming strategy.

- Gap: no folder-type to application inference model.
  - Impact: cannot prioritize cleanup by source app.
  - Resolution: add folder signature taxonomy and inference service.

- Gap: no empty-folder post-delete cleanup rules.
  - Impact: residual clutter remains after cleanup.
  - Resolution: add cleanup pass with safety checks and dry-run support.

## 3.2 Architecture and Runtime Gaps
- Gap: no shared gallery domain module.
  - Resolution: define core modules for scan, analysis, classification, review, deletion.

- Gap: no runtime adapter set for mobile and extension file APIs.
  - Resolution: define adapter interfaces and per-platform implementations.

- Gap: no worker-based compute orchestration.
  - Resolution: include worker queue in design for scalable scanning.

## 3.3 Process and Governance Gaps
- Gap: missing tasks-only execution governance in gallery docs.
  - Resolution: codify governance in tasks.

- Gap: missing graph sequence update protocol for each completed task.
  - Resolution: initialize and enforce GSEQ updates in code completion graph.

## 4. Priority Order to Close Gaps
1. Requirements and design finalization.
2. Tasks and graph governance setup.
3. Data ingestion and folder inference.
4. Image intelligence pipeline.
5. UI review and deletion flows.
6. Cross-runtime hardening and QA.

## 5. Exit Criteria
- All target features have requirement IDs.
- Each requirement maps to design and at least one task.
- Task and graph update protocol is explicit and testable.
