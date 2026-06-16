# PDF Viewer & Editor - Technology Quick Reference

## 🎯 RECOMMENDED STACK

```text
┌─────────────────────────────────────────────────────────┐
│ ELECTRON + ANGULAR + TYPESCRIPT + WEBEXTENSIONS        │
├─────────────────────────────────────────────────────────┤
│ ✅ Shared architecture for desktop + browser extension │
│ ✅ Strong structure (Angular + NgRx)                   │
│ ✅ PDF.js + pdf-lib ecosystem                           │
│ ✅ Local-first, no mandatory backend                    │
│ ✅ SQLite (desktop) + browser storage (extension)       │
│ ✅ 4-5 months MVP / 8-11 months full scope              │
└─────────────────────────────────────────────────────────┘
```

---

## Stack Summary Table

| Area | Recommendation |
|---|---|
| Frontend | `Angular 22 + TypeScript 5` |
| Desktop Runtime | `Electron 27` |
| Extension Runtime | `WebExtensions` (Chrome/Edge Manifest V3 + Firefox-compatible variant) |
| State | `NgRx` |
| PDF Rendering | `PDF.js` |
| PDF Editing | `pdf-lib` |
| Local Persistence | `SQLite` (desktop), `IndexedDB/storage.local` (extension), JSON fallback |
| Build | `Angular CLI` + runtime-specific packaging scripts |
| Testing | `Jasmine/Karma` + integration/E2E |

---

## Ranked Options (Current Scope: Desktop + Extension)

### 1) 🥇 Electron + Angular + WebExtensions (**RECOMMENDED**)
- Best architecture consistency and long-term maintainability
- Strong shared-code model across runtimes
- MVP: **4-5 months**

### 2) 🥈 Electron + React + WebExtensions
- Faster initial iteration
- Weaker default structure (needs stricter governance)
- MVP: **3.5-4.5 months**

### 3) 🥉 Rust + Tauri + WebExtensions UI
- Excellent performance
- Higher engineering complexity and slower onboarding

### 4) C# + WPF + Separate Extension Stack
- Very strong Windows desktop performance
- Poor shared-code story with browser extension runtime

### 5) Python + PyQt + Separate Extension Stack
- Rapid prototyping only
- Not ideal for unified production architecture

---

## Decision Rules

```text
Need one product across desktop + browser extensions?
  -> Choose Angular + Electron + WebExtensions

Need fastest prototype and can accept looser architecture?
  -> Choose React + Electron + WebExtensions

Need max native performance and accept complexity/time?
  -> Consider Rust + Tauri
```

---

## No-Backend Persistence Rule

- Desktop: `SQLite` first, JSON fallback
- Extension: `IndexedDB` / `storage.local`
- Keep all storage access behind adapter interfaces

---

## MVP Targets (Aligned)

- Desktop + extension open/render/search/edit baseline
- Form fill + signature baseline
- Save/Save As/autosave/recovery
- Cross-browser validation (Chrome/Edge/Firefox)
- 60%+ unit test coverage target

---

## Next Actions

1. Read `master/REQUIREMENTS.md`
2. Follow `master/DESIGN.md`
3. Execute `master/TASKS.md`
4. Track via `master/CODE_COMPLETION_GRAPH.md`

---

**Quick Reference Version**: 2.1  
**Status**: Synced with desktop+extension architecture
