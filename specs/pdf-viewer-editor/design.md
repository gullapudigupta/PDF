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
8. The root app header owns the brand lockup, avoiding duplicate company headers
   per document. Use a text-only PDF mark until the real logo is provided.
   Peacock green `#006b63` and lotus rose `#b33b65` form the restrained palette;
   use Segoe UI/system fonts with clear bold heading and control hierarchy.
9. Text overlays gain optional `fontSize` (6-72 PDF points) and `bold` fields.
   Existing overlays without these fields retain their previous rendering/export
   behavior. New text defaults to 12pt Helvetica. Store typography on the object
   so undo/redo, copy/paste, save, autosave, page operations, and tabs retain it.
   Convert PDF points into viewport pixels for preview and embed the matching
   Helvetica face at the exact point size when saving. Typography controls apply
   to a selected text object or configure the next new text object, never the
   original PDF text.
10. Declare the document command template in the tab shell and render it only in
    the active workspace's existing header. This keeps Tools and AI-chat toggles
    beside the file dropdown and horizontally scrollable document switcher,
    without mirrored toggle state or duplicate visible command bars. Give
    managed workspaces distinct panel IDs and retain keyboard focus when the
    active header view changes.
11. The tab shell owns a compact "New PDF" button beside the Open PDF menu. It
    uses pdf-lib `PDFDocument.create()` with one A4 page (595.28 x 841.89 pt),
    wraps the bytes as `File("Untitled-N.pdf")` without a file path, and adds it
    through the same tab-add path as opened files. Unsaved blank documents use
    the workspace's existing Save As/download behavior. The empty placeholder
    tab is labelled "Empty" instead of "New PDF".
12. Extract `PdfMetadataDialogComponent` and `PdfProtectDialogComponent`
    (standalone, presentational). Inputs: initial metadata / busy state;
    outputs: `save(PdfMetadata)`, `protect({userPassword, ownerPassword,
    permissionPreset})`, `cancel`. Each renders a fixed backdrop and responsive
    card (max-width 520px, full-width sheet on phones), validates locally
    (password length >= 8, confirmation, user != owner), and clears passwords
    on destroy. The workspace keeps PDF processing, save dialogs and errors.
13. `AiKeyGuideComponent` (standalone) is opened from `AiChatComponent` by a
    "How to get an API key" button. It renders a fixed modal with numbered
    step cards, each containing a CSS-drawn illustration of the provider
    screen (no copied third-party screenshots), Previous/Next navigation with
    a step indicator, a link to `https://platform.openai.com/api-keys`
    (`target=_blank`, `rel=noopener noreferrer`), and closes with
    Escape/backdrop/Close, returning focus to the trigger button.
14. The AI chat replaces the generic key sentence with a key-storage callout
    (icon, bold heading, bullet list) reflecting the in-memory-only design.
15. Workspace action feedback: an `ActionStatus {kind: 'progress'|'success'|
    'info'|'error', message}` rendered in a single `role=status`/`role=alert`
    banner at the top of the viewer with a dismiss button. A helper
    `runAction(progressMessage, work)` sets progress, awaits the work, and lets
    the work return a success message (or null for cancelled -> info). Success
    and info auto-clear after 5 s; errors persist. Existing `error` strings are
    surfaced through the same banner so no message is lost.
    UI-09: `setCropMode(true)` and `beginFormFieldAuthoring(type)` set an info
    status with the placement instruction; `startFormFieldPlacement` reports
    created/cancelled/failed via `setActionStatus`; `importFormDataFile` counts
    `fields` in the validated JSON and returns null (info "nothing changed")
    when it is empty.

16. Resume builder (`components/resume-builder/`):
    - `resume.model.ts`: `ResumeData` (contact, summary, experience[],
      education[], skills, certifications, projects, targetRole,
      jobDescription), `ResumeTemplateId = 'classic'|'modern'|'professional'|
      'compact'`, `RESUME_TEMPLATES` (font family, sizes, accent colour,
      heading style, alignment, spacing) and `resumeChecklist(data)`.
    - `ResumeDraftService` (root, in-memory only) keeps the draft while the
      app is open; nothing is written to storage.
    - `ResumePdfService` renders with pdf-lib standard fonts (Helvetica /
      Times), a cursor-based layout with word wrap, right-aligned dates,
      bullets with hanging indent, automatic page breaks and WinAnsi-safe
      text sanitising, returning `Uint8Array`.
    - `resume-ai.ts` builds section-specific prompts (summary, experience
      bullets, skills, education, certifications, projects) with a
      resume-writer system prompt; `AiChatService.complete` gains an optional
      `systemPrompt` argument (PDF assistant default unchanged).
    - `ResumeBuilderComponent` (standalone, fixed full-screen overlay):
      header (template picker, page size, Download PDF, Open in editor,
      Close), left form column, right live HTML preview styled per template,
      collapsible "AI drafting" settings (provider/key/model, storage notice,
      key guide, consent). Phone: form and preview toggle with tabs.
      Emits `openPdf(File)` and `close`; Escape closes; key cleared on destroy.
    - `PdfDocumentTabsComponent` shows the "Resume builder" button after
      New PDF and adds the exported file through `addFiles`.
17. `PdfWorkspaceComponent` uses `templateUrl: './pdf-workspace.component.html'`
    and `styleUrls: ['./pdf-workspace.component.css']`. The extraction is
    byte-for-byte (template literal text, no escapes or interpolations), so the
    compiled view and the emulated-encapsulation CSS are unchanged; specs keep
    using `TestBed` declarations (the CLI resolves external resources).
18. Zoom (VIEW-01): `zoomMode: 'custom'|'fit-page'|'fit-width'`, with presets
    `[0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]`, clamped to 0.25-4. Fit modes compute
    the zoom from the viewer host size and the page's scale-1 viewport and re-apply
    through a `ResizeObserver`. A wheel listener on the viewer host is registered
    `{passive:false}` and handles only Ctrl/Meta, debounced through
    `requestAnimationFrame`. Existing overlays scale proportionally when the
    overlay size changes, so their page position is kept.
19. Search (VIEW-02): `searchHighlights` are computed per page from pdf.js
    `getTextContent()` items: each item's transform times the viewport transform
    gives a rectangle, and the character offsets of a match inside the item are
    approximated as proportional widths. They are drawn as absolutely positioned
    `<mark class="search-hit">` boxes in the overlay layer, with `.current` for the
    active match. Ctrl+F is handled in the existing keydown handler
    (preventDefault only when a document is open).
20. OCR (OCR-01..03): `components/ocr/` contains:
    - a standalone `OcrWindowComponent`, which the tab shell creates with
      `await import('../ocr/ocr-window.component')` into a `ViewContainerRef`;
    - `OcrEngineService` (provided in the component), which dynamic-imports
      `tesseract.js` and calls `createWorker(langs, OEM.LSTM_ONLY, { workerPath:
      'assets/ocr/worker.min.js', corePath: 'assets/ocr/core', langPath:
      'assets/ocr/lang', gzip: true, workerBlobURL: false, cacheMethod: 'none',
      logger })`.
    The worker is reused while the languages stay the same, terminated when they
    change, on cancel (terminate + recreate) and on close. Angular assets copy the
    three LSTM core builds (`lstm`, `simd-lstm`, `relaxedsimd-lstm` `.wasm.js`),
    `worker.min.js` and the `4.0.0_best_int` language `.traineddata.gz` files.
    "Current page" uses `PdfRenderService` to render the active page to a canvas
    at 2x (capped at 4000px on the long side). "Add to PDF" emits text through the
    tab shell to the active workspace's `addTextObjectWithText`.
    Manifest CSP: `script-src 'self' 'wasm-unsafe-eval'`.
21. Signing (SIGN-01..03): `services/pdf-signature.service.ts` dynamic-imports
    `node-forge`. It parses PKCS#12, finds the key bag whose public key matches
    the certificate and builds the chain. With pdf-lib it adds an `AcroForm`
    `/SigFlags 3`, a signature field and widget (visible appearance stream when
    requested, otherwise a 0x0 rect), and a `/Sig` dictionary with `/Filter
    /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached`, a `/ByteRange` placeholder
    and `/Contents <0...>` (16384 bytes). It saves with `useObjectStreams:false`,
    patches the ByteRange in place (fixed-width padding), signs the two byte
    ranges with forge PKCS#7 (sha256, authenticated attributes contentType,
    messageDigest, signingTime, certificates included) and writes the hex DER
    into the Contents hole.
    Verification:
    - parse every `/ByteRange [a b c d]` + `/Contents <hex>` pair;
    - check the ranges cover the whole file except the hole (anything else means
      "Modified after signing", including incremental updates appended later);
    - recompute the digest and compare it with the messageDigest attribute;
    - verify the RSA signature over the DER SET of the authenticated attributes
      with the signer certificate's public key (forge `publicKey.verify`).
    Only RSA certificates are supported; other key types are reported as
    "Unsupported format".
    `PdfSignDialogComponent` (standalone, lazy) holds the file and password in
    fields that are cleared in `finally`. The workspace flattens edits through
    the existing serializer before signing.
22. Comments and notes (CMT-01..08, planned):
    - Model: extend `Annotation` with `subtype` (Text, Highlight, Underline,
      StrikeOut, FreeText, Square, Circle, Line, Ink), `quadPoints`, `inkLists`,
      `lineEnds`, `inReplyTo`, `replies`, `reviewState`, `markedState`,
      `createdAt`/`modifiedAt` and `sourceRef` (the original PDF object number
      for imported comments). Existing records migrate to the new fields on load.
    - Read: `PdfCommentReaderService` uses pdf.js `page.getAnnotations()` for
      geometry and the content and author fields. It builds threads from
      `inReplyTo` and review states from replies with
      `stateModel`. It converts PDF user space to viewport coordinates with the
      page viewport transform.
    - Write: `PdfCommentWriterService` (pdf-lib):
      - it removes the original annotations the user edited or deleted (matched
        by `sourceRef`) and keeps every other `/Annots` entry unchanged;
      - it writes new annotation dictionaries with `/Rect`, `/C`, `/CA`, `/T`,
        `/M`, `/CreationDate`, `/Contents`, `/NM` (a stable id),
        `/QuadPoints`, `/InkList`, `/L`, `/LE`, `/IRT`, `/State` and
        `/StateModel`;
      - it adds an `/AP /N` appearance stream for each annotation so that
        viewers which do not create appearances still render it, plus a
        `/Popup` for markup types.
      `flattenEdits` keeps today's drawing path only for "Save flattened".
    - UI:
      - a `CommentToolbarComponent` sits in the Tools menu;
      - text-markup selection uses the existing pdf.js text layer and
        `Range.getClientRects()`, converted to QuadPoints;
      - `CommentPopupComponent` is anchored to the annotation;
      - `CommentsPanelComponent` is standalone and lazy, loaded with
        `import()` into a `ViewContainerRef` in the right-hand area, with an
        "AI chat | Comments" switch;
      - the author name is stored in local settings (not in the PDF until a
        comment is saved).
    - XFDF: `XfdfService` (lazy) serializes and parses with `DOMParser`, mapping
      annotation types, pages (0-based), rects, colours, dates (PDF date
      format) and reply/state attributes.
    - All mutations go through the existing undo/redo history and autosave.

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
