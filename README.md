# PDF Viewer & Editor - Project Root

**Project**: PDF Viewer & Editor (Electron + Angular 22 + WebExtensions)  
**Status**: In Planning Phase  
**Last Updated**: June 16, 2026

---

## 🎯 Start Here

👉 **[master/INDEX.md](master/INDEX.md)**

---

## 📁 Project Structure

```text
PdfProject/
├── master/
│   ├── INDEX.md
│   ├── REQUIREMENTS.md
│   ├── DESIGN.md
│   ├── TASKS.md
│   ├── CODE_COMPLETION_GRAPH.md
│   ├── ANGULAR_IMPLEMENTATION_GUIDE.md
│   ├── ROADMAP.md
│   ├── TECHNOLOGY_RECOMMENDATIONS.md
│   ├── EXECUTIVE_SUMMARY.md
│   ├── ANGULAR_DECISION_FINAL.md
│   ├── ANGULAR_VS_REACT_ANALYSIS.md
│   ├── ANGULAR_VS_REACT_QUICK_GUIDE.md
│   └── QUICK_REFERENCE.md
├── extension/                     # Browser extension artifacts (planned)
├── Agents.md
├── PdfProject.sln
└── README.md
```

---

## 🔑 Current Scope

- Desktop app: `Electron + Angular`
- Browser extension targets: `Chrome`, `Edge`, `Firefox`, latest Chromium-based browsers
- Shared PDF core: rendering/editing services reused across desktop + extension
- No mandatory backend

---

## 💾 Local Data Strategy (No Backend)

- Desktop primary persistence: `SQLite` (portable embedded database)
- Desktop fallback: local JSON files
- Extension persistence: `IndexedDB` / browser `storage.local`
- Session, preferences, recent files, and autosave snapshots are stored locally

---

## 🚀 Execution Workflow

1. Read `master/REQUIREMENTS.md`
2. Follow architecture in `master/DESIGN.md`
3. Execute items in `master/TASKS.md`
4. Update `master/TASKS.md` and `master/CODE_COMPLETION_GRAPH.md` after each completed task

---

## 📌 Primary Documents

- Requirements: [master/REQUIREMENTS.md](master/REQUIREMENTS.md)
- Design: [master/DESIGN.md](master/DESIGN.md)
- Tasks: [master/TASKS.md](master/TASKS.md)
- Progress Graph: [master/CODE_COMPLETION_GRAPH.md](master/CODE_COMPLETION_GRAPH.md)

---

**Version**: 2.0  
**Next Step**: Open [master/INDEX.md](master/INDEX.md)
