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
  Scanned PDFs without a text layer require manually pasted text, or OCR-02
  to extract it first.
- AI-06: Next to the API-key notice, provide a "How to get an API key" button that
  opens a visual, step-by-step illustrated guide (separate component, modal):
  sign in to the OpenAI platform, add billing (ChatGPT Plus is separate), open
  API keys, create a secret key, copy it once and paste it here. Include an
  external link to the official API keys page and key-safety advice. The guide
  never reads or transmits the key and is usable at 360/768/1440px.
- AI-07: Show a prominent "Where is my API key stored?" notice beside the key
  field stating the truth: the key is never saved to disk, localStorage,
  sessionStorage, cookies, autosave or the PDF; it is held only in this browser
  tab's memory and is erased on Clear, reload, closing the tab or the workspace,
  and is sent only to the selected provider endpoint.
- UI-08: Every PDF action (open, new, save/save as, metadata, protect, export
  page, delete/insert/extract/merge/split/rotate/crop pages, form import/export,
  signatures) reports its stage in a visible, accessible status area: in
  progress ("Merging 3 PDFs..."), success with result details ("Merged 3 PDFs -
  12 pages total"), cancelled (picker dismissed) and failure with the reason.
  Success messages auto-dismiss; errors stay until dismissed. Buttons are
  disabled while an action runs and invalid inputs (non-PDF files, nothing
  selected) produce clear messages.
- UI-09 (verification follow-up): Modes that wait for a click or drag on the
  page (Crop Page, Add Text/Checkbox/Dropdown Field) show an instruction when
  started; creating a form field reports success, cancellation (no name) or the
  failure in the same status area; form-data import reports how many field
  values were applied and says "nothing changed" for a file with no fields.
  Page thumbnails always appear once rendered (no broken-image placeholder),
  and filled form-field inputs hide the PDF's own field appearance beneath them.
- UI-10 (maintainability): The main PDF workspace component keeps its HTML
  template and CSS styles in separate `pdf-workspace.component.html` and
  `pdf-workspace.component.css` files instead of inline strings, with no change
  to rendered markup, styles, behaviour or bundle style budget.
- RES-01: A "Resume builder" button in the top command row opens a full-screen,
  responsive (360/768/1440px) resume builder without leaving the workspace.
- RES-02: Offer four standard, ATS-friendly templates - Classic, Modern,
  Professional and Compact - all single-column, real selectable text, standard
  fonts, standard section headings (Professional Summary, Experience,
  Education, Skills, Certifications, Projects), no tables/images/icons for
  content, consistent date alignment, Letter or A4 page size, 0.6-0.75in
  margins. A live preview reflects the chosen template.
- RES-03: Structured sections: contact (name, headline, email, phone,
  location, links), summary, repeatable experience (title, company, location,
  dates, bullets), education, skills, certifications and projects; experience
  and education are listed in reverse-chronological order as entered; entries
  can be added, removed and reordered. A best-practice checklist (length,
  quantified bullets, action verbs, contact completeness, no first-person
  pronouns, 1-2 pages) guides the user.
- RES-04: Each section has a "Draft with AI" action using the user's own
  provider key (same BYOK rules, validation, and memory-only key notice as
  AI-01..AI-07, and the API-key guide). Prompts follow industry practice
  (action verbs, quantified impact, job-description keywords, concise,
  no invented facts - placeholders like [X%] when a number is unknown). AI
  output is shown as a suggestion the user explicitly accepts, edits or
  discards; nothing is sent without consent to share the resume text.
- RES-05: Export the resume as a PDF via the platform save dialog and/or open
  it in a new editor tab; the draft stays in memory for the session only (not
  persisted), with staged status messages for export.
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
- BRAND-01: Display "PDF" and "from Anirdeshya Innovation Private Limited" at the
  top of every workspace. Use a professional system font, bold hierarchy, peacock
  green and lotus rose accents, with responsive readable sizing and contrast.
  Do not invent a company logo; the official logo will be supplied later.
- UI-05: Consolidate file opening, document tabs, Tools and AI chat into a single
  compact command row beneath the company branding. Use an Open PDF menu for
  single/multiple opening instead of repeating full-width command bars. Do not
  repeat the editor title. Keep the command row on one line even on phones;
  document tabs may scroll horizontally within their own region.
- UI-06: Provide a working "New PDF" command that creates a blank one-page A4
  PDF in its own document tab (reusing an empty tab) and opens it for editing.
  Each new document gets a unique "Untitled-N.pdf" name and is saved through the
  existing Save/Save As or download flow. The empty placeholder tab must not
  look like a "New PDF" action.
- UI-07: Metadata and Protect PDF must open only on demand as separate modal
  dialog components over the workspace (backdrop, centered card, labelled grouped
  fields, show/hide password, inline validation, Escape/Cancel/backdrop close,
  focus moved into the dialog). They must never render inline in the page body
  and must remain usable at 360/768/1440px.
- TEXT-01: Provide font size (PDF points) and bold controls for newly added or
  selected text overlays. Use professional Helvetica regular/bold in exports.
  Preview size and saved PDF size must match at different zoom levels.
  Preserve legacy overlays and existing PDF text; never restyle original content.
- QA-01: Verify provider payloads/errors, cancellation, explicit text preview,
  copy/manual-edit behavior, responsive layout, existing workspace tests, production
  compilation, and registry graph/index generation without live billable API calls.

## Phase 4b - Viewing, OCR and certificate signatures

- VIEW-01 (zoom): Keep -/+ and add a zoom menu with presets (50-400%), Fit page
  and Fit width, Ctrl/Cmd + mouse wheel and Ctrl/Cmd + 0/+/- shortcuts. Zoom stays
  within 25-400%, the label shows the current percentage and fit mode, and fit
  modes re-apply when the window or panels resize. Overlays and text styling scale
  with zoom.
- VIEW-02 (search): Ctrl/Cmd+F opens and focuses the search box (also in the
  Tools drawer on phones). Enter / Shift+Enter go to the next / previous match.
  Matches are highlighted on the rendered page, with the current match emphasised
  and scrolled into view. The UI shows "N matches on M pages" or "No matches".
  Match case and Regex options keep working; invalid regex shows an error.
- OCR-01 (lazy loading): The OCR window, `tesseract.js` and the signing library
  must not be in the initial JavaScript bundle. They load through dynamic
  `import()` only when the user opens the feature. The OCR engine core (WASM) and
  language models are fetched only when recognition runs, then reused while the
  window stays open, and released on close.
- OCR-02 (image to text): A separate full-screen "Image to text" window opened from
  the top command row. Sources are an uploaded PNG/JPEG/WebP/BMP image, a pasted
  clipboard image, or the current PDF page rendered at OCR resolution. Languages:
  English, Hindi, Telugu, Tamil, Bengali, Marathi, Gujarati, Kannada, Malayalam,
  Punjabi, Odia, Urdu and Assamese, combinable. The window shows an image preview,
  staged progress (loading engine / loading language / recognising %), cancel,
  and editable result text with confidence. It offers Copy, Download .txt, and
  "Add to PDF as text box" (inserts a normal text overlay in the active document).
- OCR-03 (privacy/offline): OCR runs entirely on the device. Engine and language
  data are bundled with the app (no CDN, no network). Images are never uploaded
  or persisted. Unsupported/oversized files (>20 MB or >40 megapixels) and errors
  show clear messages. The extension CSP permits only `'wasm-unsafe-eval'` in
  addition to `'self'`.
- SIGN-01 (certificate signature): "Digitally sign" signs the active PDF with the
  user's PKCS#12 (.pfx/.p12) certificate and password. It creates an
  Adobe-compatible detached PKCS#7 (adbe.pkcs7.detached, SHA-256) signature with
  signer name, reason, location and signing time. An optional visible signature
  box (name/date/reason) is placed on a chosen page area. Pending edits are
  applied first. Signing produces a new download, "<name>-signed.pdf", and warns
  that any later edit invalidates the signature.
- SIGN-02 (verification): A "Signatures" panel lists the signatures in the open
  PDF with signer, issuer, signing time, reason, certificate validity dates, and
  status: Valid (document unchanged since signing), Modified after signing,
  Invalid, or Unsupported format. It states that trust in the certificate issuer
  is not checked (no online CA/revocation lookups).
- SIGN-03 (key safety): The certificate file and password are held only in
  memory for the signing operation, never saved, logged or sent anywhere, and are
  cleared after signing or cancel. Wrong passwords, certificates with no private
  key, expired certificates (warning) and encrypted PDFs (blocked) show clear
  messages.
- QA-02: Unit tests for zoom/search, OCR (engine mocked) and signing/verifying
  with a generated test certificate. Both production builds pass; build stats
  prove `tesseract.js`/`node-forge` are not in initial chunks; browser checks at
  360/768/1440px with real offline OCR of a sample image and a real
  sign-then-verify round trip.

Provider-specific non-compatible APIs, streaming, cloud key storage, automatic
PDF replacement, online certificate trust/revocation (OCSP/CRL), timestamp
authorities (TSA), long-term validation (LTV) and a backend credential proxy are
outside this MVP.

## Phase 4c - Acrobat-style comments and notes (planned, separate session)

Today the workspace's highlight/comment/sticky-note annotations are drawn into
the page content when saving, so other PDF readers cannot see them as comments.
Phase 4c replaces this with real, interoperable PDF annotations.

- CMT-01 (native annotations): Comments are saved as standard PDF annotation
  objects that open as comments in Adobe Acrobat/Reader, Edge and Chrome. Each
  annotation stores its author (`/T`), modified date (`/M`), creation date, note
  text (`/Contents`), colour, opacity, and a popup (`/Popup`) where the type
  supports one. Supported types:
  - sticky note (`/Text`, Comment icon);
  - text highlight, underline and strike-through (`/Highlight`, `/Underline`,
    `/StrikeOut`, with `QuadPoints` from a text selection);
  - text box (`/FreeText`);
  - rectangle, ellipse, line/arrow (`/Square`, `/Circle`, `/Line`);
  - pencil drawing (`/Ink`).
  Saved files keep comments editable; flattening into the page happens only when
  the user asks for it.
- CMT-02 (open existing comments): When a PDF is opened, its existing markup
  annotations and replies are read and shown in the comments list and on the page.
  They can be edited, replied to and deleted, and saving does not create
  duplicates. Annotation types the app cannot edit (links, widgets, file
  attachments, sounds, signatures) are kept unchanged.
- CMT-03 (commenting tools): A Comment toolbar is available in the Tools menu and
  on phones, with: Sticky note, Highlight, Underline, Strike-through, Text box,
  Rectangle, Ellipse, Line/Arrow, Pencil and Eraser; colour and opacity pickers;
  Select/Hand mode. Text markups use the PDF text layer selection. A sticky note
  is placed by click/tap and opens its note popup. Escape cancels the active tool.
  Every action supports undo/redo.
- CMT-04 (comments panel): A "Comments" panel lists all comments grouped by page,
  showing type icon, author, date, a text snippet and reply count. It supports:
  - search;
  - filter by type, author, colour and review status;
  - sort by page, date or author;
  - click to jump to and select the comment on the page;
  - expand/collapse all, and replies.
  On phones and tablets it opens as a drawer; on desktop it shares the right-hand
  side area with AI chat as a switchable tab.
- CMT-05 (replies and review status): Users can reply to any comment (stored as
  `/IRT` reply annotations) and set a review status (None, Accepted, Rejected,
  Cancelled, Completed), which is stored as `/State` + `/StateModel Review`
  replies, so Acrobat shows it. A private "checked" mark (`/StateModel Marked`)
  is also supported. Edit and delete apply to the user's own replies and to
  imported ones.
- CMT-06 (author identity): The author name is set once (default "Guest") in a
  small settings field and saved locally on the device. It is used for new
  comments and replies.
- CMT-07 (export, import, flatten, print): Comments can be:
  - exported to and imported from XFDF (Acrobat-compatible);
  - exported as a comment summary (plain text, grouped by page);
  - removed all at once (with confirmation).
  "Save with comments flattened" draws comments into the page as today. A
  "Hide comments" toggle hides them on screen.
- CMT-08 (performance and accessibility): The comments panel and XFDF code load
  on first use (lazy chunks). The initial bundle grows by no more than 15 kB.
  Comment tools, list items and popups are keyboard reachable with ARIA labels
  and visible focus. Screen readers announce add/delete/reply.
- QA-03: Unit tests for annotation read/write round trips (including reopening in
  pdf.js), replies/status, XFDF import/export and the panel. Both production
  builds pass. Browser checks at 360/768/1440px add, reply, set status, save,
  reopen and confirm comments persist. A saved sample is confirmed to show
  comments in another PDF viewer.

Open decisions to confirm at the start of the Phase 4c session:
- Whether the Comments panel shares the right-hand side with AI chat (proposed)
  or gets its own side.
- Whether stamps (Approved, Draft, etc.) and file-attachment comments are needed
  in this MVP. They are currently out of scope.
- Whether the default on save keeps comments editable (proposed) or flattens them.


## Traceability
- Design source: `specs/pdf-viewer-editor/design.md`
- Task source: `specs/pdf-viewer-editor/tasks.md`
- Legacy mirror: `master/REQUIREMENTS.md`
