# Kiro Spec - Requirements

## Phase 4 - Bring-your-own AI MVP

- AI-01: Default to OpenAI GPT; allow Other with a full HTTPS OpenAI-compatible
  chat-completions URL, API key, and model. A ChatGPT subscription is not an API key.
- AI-02: Keep credentials and conversation in component memory only; never persist,
  log, autosave, or include credentials in PDF exports. Send directly to the selected
  provider only on explicit Send, with a disclosure of external processing and costs.
- AI-03: Provide summarizing, suggestions, formatting, tone changes, and free-form
  questions. Users can paste text or load current-page/whole-document extracted text,
  preview/edit it, and explicitly authorize sending. Do not upload PDF bytes.
- AI-04: Render responses as plain text in a separate right chat panel. Provide Copy
  with visible success/failure and selectable text fallback. Never modify PDFs
  automatically; users paste into the existing Add Text/Edit workflow.
- AI-05: Validate endpoint/model/key/input and response shape; show actionable
  authentication, rate-limit, network/CORS, timeout, and malformed-response errors.
  Support cancellation, prevent duplicate requests, and bound input/history size.
  Scanned PDFs without a text layer require manually pasted text (no OCR in this MVP).
- UI-01: All existing file, editing, search, navigation, appearance, annotation,
  form, and signature options remain available in a scrollable left tools menu.
  Reuse existing handlers, disabled states, and toolbar visibility preferences.
- UI-02: Desktop uses left tools / PDF / right chat; tablet and phone use independently
  toggled drawers, only one open at a time. At 360, 768, and 1440 CSS pixels the shell
  must not overflow horizontally, controls must remain reachable, and chat must scroll.
- UI-03: "Open a PDF to start" is an accessible button that opens the single-PDF
  chooser. Add an explicit Open multiple PDFs action for desktop and browser.
- UI-04: Open selected PDFs as separate documents in a switcher, not a merge.
  Preserve each PDF's unsaved objects, forms, annotations, history, navigation and
  chat when switching. Only the active workspace responds to global shortcuts.
  Scope PDF document, annotation and undo services per document. Confirm closing
  document tabs so edits are never silently discarded.
- QA-01: Verify provider payloads/errors, cancellation, explicit text preview,
  copy/manual-edit behavior, responsive layout, existing workspace tests, production
  compilation, and registry graph/index generation without live billable API calls.

Provider-specific non-compatible APIs, streaming, cloud key storage, automatic
PDF replacement, OCR, and a backend credential proxy are outside this MVP.


## Traceability
- Design source: `specs/pdf-viewer-editor/design.md`
- Task source: `specs/pdf-viewer-editor/tasks.md`
- Legacy mirror: `master/REQUIREMENTS.md`
