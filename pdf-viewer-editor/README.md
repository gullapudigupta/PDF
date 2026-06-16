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

