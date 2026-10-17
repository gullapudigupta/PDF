# Browser extension permissions

The Chrome/Edge and Firefox manifests request only:

| Permission | Purpose |
| --- | --- |
| `downloads` | Save a user-requested PDF or exported image/JSON through the browser download manager. |
| `contextMenus` | Add a page context-menu item that opens the local extension viewer. |

The extension does not request host access, `file://` access, the `storage` permission, or the `tabs` permission. PDFs are selected through the browser's explicit file picker. Recent-file metadata and viewer preferences use the extension page's own local persistence; the context-menu action does not read page contents or transmit data.

## Release audit checklist

- [ ] Confirm each requested manifest permission is still used by the extension code.
- [ ] Confirm there are no host permissions or file URL permissions.
- [ ] Verify the context-menu action only opens `viewer/index.html`.
- [ ] Verify PDF export uses the browser download manager with `saveAs` enabled.
- [ ] If a permission is added, document its API call and user-visible purpose here before release.
- [ ] Rebuild both browser packages and inspect the packaged manifests before publishing.
