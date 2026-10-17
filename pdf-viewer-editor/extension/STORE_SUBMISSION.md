# Browser extension store submission

Build the viewer and store-upload packages from `pdf-viewer-editor`:

```powershell
npm run extension:build
```

The build produces:

- `extension/dist/pdf-viewer-editor-chrome-0.1.0.zip` for Chrome Web Store and Edge Add-ons.
- `extension/dist/pdf-viewer-editor-firefox-0.1.0.xpi` for addons.mozilla.org.

The listing copy and privacy disclosures are maintained in `extension/store-listing.json`. Keep the ZIP/XPI artifacts unsigned in source control. Chrome Web Store, Edge Add-ons, and Mozilla sign their distributed packages after publisher submission and review; signing requires publisher accounts and must not use private keys committed to this repository.

Neutral draft artwork is included for publisher review:

- `extension/icons/icon128.png` is a neutral draft icon, not approved final branding.
- `extension/store-assets/screenshot-01.png` and `screenshot-02.png` are genuine captures of the packaged Chrome viewer using the neutral two-page sample PDF.
- `extension/store-assets/demo-document.pdf` is the sample document shown in those captures.

Before submission, the publisher must approve or replace the draft icon and review the screenshots against the store's current image requirements. Store signing and publication remain publisher-controlled; no signing credentials are included in this repository.
