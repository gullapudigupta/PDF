# Kiro Spec - UI Analysis

## Traceability
- Technical baseline: [technical-analysis.md](technical-analysis.md)
- Gap baseline: [gap-analysis.md](gap-analysis.md)
- Execution summary: [execution-summary.md](execution-summary.md)

## 1. UX Goals
- Make cleanup confidence high and accidental deletion low.
- Mirror familiar WhatsApp contact and group navigation patterns.
- Let users see impact in saved storage before deleting.

## 2. Primary Information Architecture
### 2.1 Left Navigation
- Groups section first (pinned at top).
- Contacts section below groups.
- Source folders section (WhatsApp, screenshots, camera, downloads, others).

### 2.2 Main Workspace
- Summary cards: total files, junk candidates, potential savings.
- Grid/list toggle for media preview.
- Filter chips: duplicate, blurred, low quality, low face visibility, screenshots.

### 2.3 Right Review Panel
- Decision detail: why flagged, confidence score, source folder.
- Similar items panel for duplicate cluster review.
- Keep/Delete action with undo window.

## 3. WhatsApp-like Patterns
- Group-first ordering in list.
- Contact rows show thumbnail stack + total size.
- Expand row to see contact media timeline.
- Bulk actions at group or contact level.

## 4. Import and Identity UX
- Import wizard for CSV/Excel mapping.
- Required fields validation and preview table.
- If no file imported, auto-generate names with clear editable labels.
- Keep generated-name badge to avoid user confusion.

## 5. Review and Merge UX
- Duplicate cluster view with best-photo recommendation.
- Merge action for similar photos into one retained item set.
- Side-by-side compare for blur and face visibility decisions.

## 6. Mobile and Extension Adaptation
- Ionic mobile: bottom tab navigation and compact filter drawers.
- Extension: compact dashboard and quick-clean actions for selected folders.
- Ensure same score explanation model across surfaces.

## 7. Accessibility and Safety UX
- Color plus icon coding for flags, not color-only meaning.
- Keyboard shortcuts for keep/delete/review next.
- Mandatory confirmation for permanent delete.
- Empty-folder cleanup shown as separate final step with count preview.

## 8. UI Analysis Outputs
- The UI supports contact/group-driven cleanup.
- The UI is explainable for each automated decision.
- The flow supports safe cleanup with reversible checkpoints.
