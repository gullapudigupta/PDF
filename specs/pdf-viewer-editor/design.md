# Kiro Spec - Design

## Phase 4 - AI chat and responsive workspace

1. `AiChatService` validates HTTPS endpoints without embedded credentials, query
   strings, or fragments, builds bearer-authenticated OpenAI chat-completions
   requests, rejects redirects, validates plain-text completions, and maps errors
   without displaying provider response bodies (which might contain secrets).
   Requests use fetch with omitted cookies and AbortSignal; the chat owns a timeout.
2. `AiChatComponent` owns ephemeral provider settings, bounded conversation, input,
   editable source preview, explicit external-processing consent, busy/error/copy
   state, and cancellation. OpenAI defaults to `gpt-4o-mini`; users may change model.
   Custom endpoints must support the OpenAI chat-completions request/response shape
   and browser CORS. No proxy or extension-wide host permissions are added.
3. The component uses `PdfDocumentService.extractText` for page/all-text preview.
   Extraction is bounded to 60,000 source characters and fails explicitly instead
   of silently truncating. A changed/closed document invalidates pending extraction,
   cancels requests, and clears document-specific chat/preview/consent state.
4. Reuse the workspace toolbar and page controls through Angular templates inside
   the left tools aside. Keep PDF rendering and edit handlers unchanged. Chat stays
   mounted when hidden, preserving settings until reload or explicit clear-key.
   Below 1024px menus overlay the viewer, with a dismissible backdrop, Escape close,
   labelled toggles, focus return, and a maximum viewport-bounded drawer width.
5. No response uses `innerHTML`; response copy only writes plain text to clipboard.
   Users then use the existing PDF text editor. Closing/clearing chat cancels pending
   operations; destroying the workspace clears its in-memory key.
6. A document-tabs shell hosts independently scoped workspace instances, retaining
   inactive instances in memory rather than serializing partial editor state.
   A small tab host scopes `PdfDocumentService`, `AnnotationService`, and
   `HistoryService`; stateless processing services and persistence remain shared.
   An active input gates global shortcuts and background rendering; activation
   remeasures the viewer. Opening another PDF creates a tab, never replaces an
   unsaved document. Keys and conversations remain private to their document tab.
7. Extend the runtime adapter/service with a multi-file picker. Electron uses a
   dedicated preload/IPC endpoint with `multiSelections`; browser uses a temporary
   multiple file input. Preserve the existing single-file API. The parent shell
   also opens recent desktop files as new tabs, and reports picker/read errors.
   The empty workspace message is a real button. Tab closing requires explicit
   confirmation and the last closed tab is replaced with an empty workspace.

### Execution and graph

Execute the checklist in [tasks.md](tasks.md). Canonical Phase 4 records live under
`master/agent-tasks/viewer-editor/phase4-tasks.json`; the generated root phase file
contains references only, matching existing registry conventions. Extend the local
Node DAG generator/validator to Phase 4, preserving historical migration evidence.
Run sync and validate after each completed task to update `master/TASKS.md`,
indexes, and the graph sequence.

## Traceability
- Requirements: `specs/pdf-viewer-editor/requirements.md`
- Tasks: `specs/pdf-viewer-editor/tasks.md`
- Legacy mirror: `master/DESIGN.md`
