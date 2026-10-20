# PDF Viewer Editor App Workspace
# PDF Viewer & Editor

**Electron + Angular 22 + TypeScript 5 + WebExtensions**

A modern PDF viewer and editor application that runs as both a desktop application (Electron) and a browser extension (Chrome, Edge, Firefox).

## ?? Features

- ?? **PDF Viewing**: High-quality PDF rendering with PDF.js
- ?? **Editing**: Text, images, annotations, and forms
- ??? **Annotations**: Highlights, comments, and drawing tools
- ?? **Forms**: Fill and create interactive PDF forms
- ?? **Signatures**: Digital signature support
- ?? **Search**: Full-text search across PDF documents
- ?? **Local Storage**: No backend required - SQLite (desktop) and IndexedDB (extension)
- ?? **Dark Mode**: Theme support
- ? **Auto-save**: Automatic document recovery

## Phase 4 MVP usage guide

**Opening and creating PDFs**

- **Open PDF** opens one file; **Open multiple PDFs** opens several at once, each in its own tab. The empty-state buttons do the same.
- **New PDF** creates a blank A4 document in a new tab, named Untitled-1, Untitled-2 and so on.
- Unsaved edits stay with their tab while you switch between tabs.

**Layout**

- The top row holds Tools, Open PDF, New PDF, Resume builder, the document tabs and AI chat.
- **Tools** opens the left menu with every editing option; **AI chat** opens the right-hand assistant.
- On phones (600px and below) the header wraps into two rows. On phones and tablets both menus open as drawers over the page.

**Page actions**

- Rotate, Crop, Insert, Extract, Split, Merge and Delete each show progress, then a success, cancelled or error message.
- Crop and form-field placement show an instruction when they start. Press Escape to cancel them.
- Undo and Redo (Ctrl+Z / Ctrl+Y) also cover page changes and report what they did.

**Text styling**

- Use **Text size (pt)** (6-72, default 12) and **Bold** in the toolbar. With a text box selected they restyle it; otherwise they apply to the next text box you add.
- Saved PDFs use Helvetica or Helvetica-Bold at the exact point size.
- Styling never changes the PDF's original text.

**Metadata and Protect PDF**

- Both open in separate dialogs.
- Protect downloads a password-protected copy. Password-protected PDFs open read-only.

**Forms**

- Add text, checkbox and dropdown fields, fill them, and export or import form data as JSON.
- Importing reports how many values were applied. A file with no field values changes nothing.

**AI writing assistant (bring your own key)**

- Choose OpenAI (the default) or another OpenAI-compatible endpoint by entering its HTTPS URL and key.
- The key stays only in this browser tab's memory. It is never saved to disk, browser storage or a server, and it is cleared when you clear it, close the workspace or close the tab.
- PDF text is sent only after you preview it and give consent.
- Copy the AI response and paste it into the PDF yourself.
- **How to get an API key** shows a visual step-by-step guide.

**Resume builder**

- Offers four ATS-friendly templates: Classic, Modern, Professional and Compact.
- Provides structured sections, a best-practice checklist, optional per-section AI drafting, Download PDF, and Open in editor.

**Limitations**

- A ChatGPT subscription does not include API access, and provider API charges may apply.
- AI features need network access to the provider you choose.
- Text edits are overlays placed on the page; existing PDF text cannot be reflowed or restyled.
- Only standard Helvetica is embedded for added text. Characters outside WinAnsi (for example emoji or Devanagari) are not supported in exported text.
- Search-engine indexing is blocked until it is explicitly approved; see [../search-engine/README.md](../search-engine/README.md).
- The company logo is a text placeholder until the official logo is supplied.

## ?? Prerequisites

- Node.js 20 LTS or higher
- npm 9 or higher
- Angular CLI 22

## ??? Installation

```bash
# Install dependencies
npm install

# Install Angular CLI globally (if not already installed)
npm install -g @angular/cli
```

## ?? Running the Application

### Desktop (Electron)

```bash
# Development mode
npm run electron:serve

# Build desktop app
npm run electron:build
```

### Web/Development

```bash
# Start development server
npm start

# Navigate to http://localhost:4200
```

### Browser Extension

```bash
# Build Chrome extension
npm run extension:build:chrome

# Build Firefox extension
npm run extension:build:firefox

# Build all extensions
npm run extension:build
```

## ?? Project Structure

```
pdf-viewer-editor/
??? src/
?   ??? app/
?   ?   ??? core/                    # Core services and adapters
?   ?   ?   ??? adapters/            # Runtime and persistence adapters
?   ?   ?   ??? services/            # Core services
?   ?   ??? shared/                  # Shared components and utilities
?   ?   ??? modules/
?   ?       ??? pdf-workspace/       # Main PDF workspace module
?   ?           ??? components/
?   ?           ??? services/
?   ?           ??? store/           # NgRx state management
?   ??? environments/                # Environment configurations
?   ??? assets/                      # Static assets
??? electron/                        # Electron main process files
?   ??? main.js
?   ??? preload.js
??? extension/                       # Browser extension files
?   ??? manifest.chrome.json
?   ??? manifest.firefox.json
?   ??? background.js
?   ??? popup.html
?   ??? popup.js
??? master/                          # Project documentation
    ??? REQUIREMENTS.md
    ??? DESIGN.md
    ??? TASKS.md
    ??? CODE_COMPLETION_GRAPH.md
```

## ?? Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test -- --code-coverage

# Lint code
npm run lint

# Format code
npm run format
```

## ?? Building for Production

### Desktop Application

```bash
npm run electron:build
```

Artifacts will be in `electron/dist/`

### Browser Extensions

```bash
npm run extension:build
```

Extension packages will be in `extension/dist/`

## ?? Technology Stack

- **Frontend Framework**: Angular 22
- **State Management**: NgRx (Store, Effects, Entity)
- **Desktop Runtime**: Electron 27
- **PDF Rendering**: PDF.js
- **PDF Editing**: pdf-lib
- **Language**: TypeScript 5
- **Styling**: SCSS
- **Build Tool**: Angular CLI
- **Testing**: Jasmine + Karma

## ??? Architecture

### Runtime Adapters

The application uses runtime adapters to support both desktop and extension environments:

- **Desktop**: Electron IPC for file system access
- **Extension**: Web APIs for file handling

### Persistence Adapters

- **Desktop**: localStorage with SQLite planned
- **Extension**: IndexedDB for structured data storage

### State Management

NgRx is used for centralized state management:

- Workspace state (current document, zoom, page, etc.)
- Document management
- Annotation state
- Form data

## ?? Documentation

Comprehensive documentation is available in the `master/` directory:

- **[REQUIREMENTS.md](../master/REQUIREMENTS.md)**: Feature specifications
- **[DESIGN.md](../master/DESIGN.md)**: Architecture and design decisions
- **[TASKS.md](../master/TASKS.md)**: Sprint-by-sprint implementation plan
- **[CODE_COMPLETION_GRAPH.md](../master/CODE_COMPLETION_GRAPH.md)**: Progress tracking

## ??? Roadmap

### Phase 1 (MVP) - Q2 2026
- ? Basic project setup
- ? Angular + Electron + Extension infrastructure
- ?? PDF viewing and navigation
- ?? Basic editing (text, images)
- ?? Annotations (highlight, comments)
- ?? Form filling
- ?? Save/Export functionality

### Phase 2 - Q3 2026
- OCR for scanned PDFs
- Advanced form designer
- Watermarks and headers/footers
- Redaction tools
- Document comparison

### Phase 3 - Q4 2026
- Digital signatures
- Batch operations
- Plugin architecture
- Enterprise features

## ?? Contributing

Please read [CONTRIBUTING.md](../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## ?? License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## ?? Acknowledgments

- PDF.js team for the excellent PDF rendering library
- pdf-lib contributors for PDF manipulation capabilities
- Angular team for the robust framework
- Electron team for desktop capabilities

---

**Status**: In Active Development  
**Version**: 0.1.0  
**Last Updated**: June 16, 2026

