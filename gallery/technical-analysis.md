# Kiro Spec - Technical Analysis

## Traceability
- Next artifact: [gap-analysis.md](gap-analysis.md)
- Downstream requirements: [requirements.md](requirements.md)
- Execution source of truth: [tasks.md](tasks.md)

## 1. Product Scope
The gallery cleaner product is a cross-surface Angular application with three runtime targets:
- Web application (Angular)
- Mobile application (Ionic + Angular, Android and iOS)
- Browser extension surface (Chromium and Firefox variants)

Primary goals:
- Remove junk images and files, especially WhatsApp forwards and unnecessary screenshots.
- Filter useful photos by removing blurred, duplicate, low-visibility-face, and low-quality media.
- Organize media by contact and group context using imported or generated names.

## 2. Technical Feasibility
### 2.1 Framework Feasibility
- Angular is already used in the repository, reducing onboarding and reuse risk.
- Ionic adds native mobile shell capability without rewriting UI from Angular.
- Browser extension support can reuse shared domain logic with runtime adapters.

### 2.2 Image Analysis Feasibility
- Blur detection: Laplacian variance and edge density metrics are practical for on-device scoring.
- Duplicate detection: combine exact hash (fast) and perceptual hash (near-duplicate aware).
- Face visibility: use face detection confidence + face size ratio + occlusion heuristic.
- Low-quality logic: enforce thresholds from image resolution, compression artifacts, and file size-to-dimension ratio.

### 2.3 Data Ingestion Feasibility
- CSV import is low complexity and mandatory for portability.
- Excel import is feasible via sheet parser library in web/mobile contexts.
- Fallback random naming for contacts is straightforward and can run locally.

### 2.4 Folder Intelligence Feasibility
- Source app inference can be rule-based using folder signatures:
  - WhatsApp image/video/document folders
  - Screenshot folders by OEM patterns
  - Camera and download folders

### 2.5 Cleanup Feasibility
- Two-step cleanup is feasible and safer:
  1. Candidate marking and preview
  2. Confirmed delete and empty-folder cleanup pass

## 3. Constraints and Risks
- Mobile filesystem access differs by platform and permissions model.
- Browser extension runtime has stricter storage and file access boundaries.
- Face/quality inference may produce false positives if thresholds are too aggressive.
- Large galleries require incremental processing and background queues.

## 4. Recommended Technical Direction
- Shared analysis engine in TypeScript with runtime adapters for web, mobile, extension.
- Use worker threads/web workers for compute-heavy image scoring.
- Persist scan manifests and decisions locally first; cloud optional and disabled by default.
- Use confidence scores with reversible decisions before delete.

## 5. Success Criteria
- End-to-end scan and recommendation workflow works on all three targets.
- Users can review and delete junk safely.
- Contact/group centric UI supports fast bulk cleanup.
- Empty folders are removed only after confirmed delete operations.
