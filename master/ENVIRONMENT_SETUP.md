# Environment Setup Guide

This guide covers task `P1-S1-001` prerequisites for the PDF Viewer & Editor project.

## 1) Install Node.js 20 LTS

- Download from: https://nodejs.org/
- Verify:
  - `node -v` (should be `v20.x.x`)
  - `npm -v`

## 2) Install Angular CLI 22.x

```bash
npm install -g @angular/cli@22
ng version
```

## 3) Configure Git

```bash
git config --global user.name "<your-name>"
git config --global user.email "<your-email>"
```

Repository hook configuration:

```bash
git config core.hooksPath .githooks
```

## 4) Environment file template

- Copy `.env.example` to `.env` for local changes.

## 5) Install Visual Studio Code

- Download from: https://code.visualstudio.com/
- Install recommended extensions when prompted.
- Recommendations are defined in `.vscode/extensions.json`.

## 6) Next Task

Proceed to `P1-S1-002` (Angular Project Initialization).
