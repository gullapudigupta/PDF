# PDF Viewer & Editor - Setup Guide

This guide will help you set up and run the PDF Viewer & Editor project on your local machine.

---

## ?? Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v20 LTS or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`
   - Should output: `v20.x.x` or higher

2. **npm** (v9 or higher)
   - Comes with Node.js
   - Verify installation: `npm --version`
   - Should output: `9.x.x` or higher

3. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

### Recommended Software

- **Visual Studio Code** (or your preferred IDE)
  - Download from: https://code.visualstudio.com/
  - Recommended extensions:
    - Angular Language Service
    - ESLint
    - Prettier - Code formatter
    - GitLens

---

## ?? Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/gullapudigupta/PDF.git
cd PDF/pdf-viewer-editor
```

### 2. Install Dependencies

```bash
npm install
```

This will:
- Install all required npm packages
- Run the postinstall script to copy PDF.js worker files
- Set up the development environment

### 3. Run the Application

#### Option A: Web Development Server

```bash
npm start
```

Then open your browser and navigate to: `http://localhost:4200`

The application will automatically reload if you change any source files.

#### Option B: Electron Desktop Application

```bash
npm run electron:serve
```

This will:
- Build the Angular application in development mode
- Launch the Electron desktop application

---

## ?? Development Workflow

### Project Structure

```
pdf-viewer-editor/
??? src/                          # Source code
?   ??? app/                      # Angular application
?   ?   ??? core/                 # Core services and adapters
?   ?   ??? shared/               # Shared components
?   ?   ??? modules/              # Feature modules
?   ??? environments/             # Environment configurations
?   ??? assets/                   # Static assets
??? electron/                     # Electron main process
??? extension/                    # Browser extension
??? master/                       # Documentation
```

### Available Scripts

```bash
# Development
npm start                         # Start Angular dev server
npm run electron:serve            # Run Electron app in dev mode
npm run watch                     # Build and watch for changes

# Code Quality
npm run lint                      # Lint TypeScript code
npm run format                    # Format code with Prettier
npm run format:check              # Check code formatting

# Testing
npm test                          # Run unit tests
npm run test -- --code-coverage   # Run tests with coverage

# Building
npm run build                     # Build for production
npm run electron:build            # Build Electron app
npm run extension:build           # Build browser extensions
```

---

## ??? Building for Production

### Desktop Application (Electron)

```bash
npm run electron:build
```

Output will be in `electron/dist/`

Supported platforms:
- Windows (.exe)
- macOS (.dmg, .app)
- Linux (.AppImage, .deb)

### Browser Extensions

```bash
# Build all extensions
npm run extension:build

# Or build individually
npm run extension:build:chrome    # Chrome/Edge
npm run extension:build:firefox   # Firefox
```

Output will be in `extension/dist/`

---

## ?? Testing

### Run Unit Tests

```bash
npm test
```

This will:
- Launch Karma test runner
- Run all `*.spec.ts` files
- Display results in the browser

### Run Tests with Coverage

```bash
npm run test -- --code-coverage
```

Coverage report will be generated in `coverage/` directory.

### Run Tests in Headless Mode (CI)

```bash
npm run test -- --watch=false --browsers=ChromeHeadless
```

---

## ?? Troubleshooting

### Common Issues

#### 1. `npm install` fails

**Solution**: Clear npm cache and try again
```bash
npm cache clean --force
npm install
```

#### 2. Port 4200 is already in use

**Solution**: Kill the process or use a different port
```bash
ng serve --port 4201
```

#### 3. PDF.js worker not found

**Solution**: Manually run the postinstall script
```bash
node scripts/copy-pdfjs-worker.js
```

#### 4. Electron fails to launch

**Solution**: Rebuild Electron
```bash
npm rebuild electron
```

#### 5. TypeScript compilation errors

**Solution**: Clean and rebuild
```bash
rm -rf node_modules dist
npm install
npm start
```

---

## ?? Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Angular rules
- **Formatting**: Prettier with 100 character line width
- **Naming Conventions**:
  - Components: PascalCase (`PdfViewerComponent`)
  - Services: PascalCase + Service suffix (`PdfDocumentService`)
  - Interfaces: PascalCase (`RuntimeAdapter`)
  - Files: kebab-case (`pdf-viewer.component.ts`)

### Git Workflow

1. Create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Commit with descriptive messages
   ```bash
   git commit -m "feat: add PDF zoom functionality"
   ```

4. Push to remote
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a Pull Request

### Commit Message Format

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

---

## ?? Security

### Electron Security

- Context isolation is enabled
- Node integration is disabled
- Sandbox mode is enabled
- Only whitelisted IPC channels are exposed

### Extension Security

- Content Security Policy is enforced
- Minimal permissions requested
- No remote code execution

---

## ?? Additional Resources

### Documentation

- [Angular Documentation](https://angular.io/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [NgRx Documentation](https://ngrx.io/docs)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [pdf-lib Documentation](https://pdf-lib.js.org/)

### Project Documentation

- [Requirements](../master/REQUIREMENTS.md)
- [Design](../master/DESIGN.md)
- [Tasks](../master/TASKS.md)
- [Progress](../master/CODE_COMPLETION_GRAPH.md)

---

## ?? Contributing

We welcome contributions! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch
3. Write tests for your changes
4. Ensure all tests pass
5. Format your code
6. Submit a pull request

---

## ?? Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/gullapudigupta/PDF/issues)
3. Create a new issue with detailed information

---

## ?? License

This project is licensed under the MIT License.

---

**Happy Coding! ??**
