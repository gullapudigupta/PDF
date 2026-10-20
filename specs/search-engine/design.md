# Search Engine Discoverability – Design

## Layout (root `search-engine/` only)

| File | Purpose |
| --- | --- |
| `search-engine.config.json` | Site name, description, keywords, routes, verification tokens and the `indexing` approval block (`approved: false` by default). |
| `seo.cjs` | Dependency-free Node CLI: `status`, `apply <distDir>`, `approve --by <name> --site-url <https url>`, `revoke`. |
| `seo.test.cjs` | `node --test` suite. |
| `hosting/` | `X-Robots-Tag` header snippets (`_headers`, nginx, IIS `web.config`) for blocked mode. |
| `README.md` | Operating guide. |

## Approval gate
`isApproved(config)` returns true only when `indexing.approved === true`,
`approvedBy` is non-empty, `approvedAt` is an ISO date and `siteUrl` is a valid
`https:` URL that is not a placeholder (`example.com`). Anything else, including
a missing or unparsable config, yields blocked mode (fail closed).

## `apply <distDir>`
1. Requires `<distDir>/index.html`.
2. Removes earlier output: the marked block between
   `<!-- search-engine:start -->` and `<!-- search-engine:end -->`, plus files the
   tool wrote previously (tracked in `.search-engine-files.json`).
3. Blocked: writes deny-all `robots.txt`, a noindex robots meta block and a
   `_headers` file with `X-Robots-Tag`.
4. Approved: writes allow `robots.txt` (with `Sitemap:`), `sitemap.xml`, a meta
   block with description/keywords/canonical/OG/Twitter/theme colour/JSON-LD and
   verification metas, optional `BingSiteAuth.xml` and IndexNow key file.
5. Inserts the block just before `</head>`.

All text goes through `escapeHtml` / `escapeXml`; JSON-LD escapes `<` as `\u003c`.

## Commands
`approve` validates its inputs with the same gate before saving; `revoke` resets
`approved`, `approvedBy`, `approvedAt` to blocked defaults. Neither touches a
deployment; re-run `apply` and redeploy.

## Non-goals
Server-side rendering/prerendering, analytics and automatic submission to search
engines. Desktop (Electron) and extension builds are not web-indexed and are
untouched.
