# Search engine discoverability (approval-gated)

**Current state: BLOCKED.** No search engine may index the application until
the owner approves it. Check at any time with:

```powershell
node .\search-engine\seo.cjs status
```

Everything for search engines lives in this folder. The app source
(`pdf-viewer-editor/src`) is not changed; the tool post-processes the **built
web folder** just before deployment. Desktop (Electron) and browser-extension
builds are not published on the web and need nothing here.

| File | Purpose |
| --- | --- |
| `search-engine.config.json` | Site URL, name, description, keywords, routes, verification tokens and the `indexing` approval block (`approved: false`). |
| `seo.cjs` | `status`, `apply <distDir>`, `approve`, `revoke`. No dependencies. |
| `seo.test.cjs` | Tests: `node --test .\search-engine\seo.test.cjs` |
| `hosting/` | `X-Robots-Tag: noindex` snippets for Netlify/Cloudflare (`_headers`), nginx and IIS/Azure. |

## Every deployment (blocked or approved)

1. Build the web app.
2. Run `node .\search-engine\seo.cjs apply <built folder containing index.html>`.
3. Deploy that folder.

While blocked, `apply` writes:
- `robots.txt` with `User-agent: *` / `Disallow: /`;
- `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` in `index.html`;
- `_headers` with `X-Robots-Tag: noindex, nofollow, noarchive`. On nginx or IIS, use the matching file in `hosting/` instead.

No sitemap, canonical URL, social tags, structured data or verification tokens
are published while blocked. Approval data that is missing, incomplete or
invalid is always treated as **not approved**.

> `robots.txt` alone does not remove a page that is already known; the
> `noindex` meta and header do. Keep all three until approval.

## Owner approval (only when you decide to go public)

1. Set the real values in `search-engine.config.json`: `siteUrl`,
   `description`, `keywords`, `routes`, and optionally `socialImage` (an https
   image URL, 1200×630).
2. Record approval explicitly. This is the only way to enable indexing:
   ```powershell
   node .\search-engine\seo.cjs approve --by "Your Name" --site-url https://your-domain
   ```
3. Re-run `apply` on the web build and redeploy. Remove any `hosting/`
   noindex header you added to the server manually.
4. **Google Search Console** (search.google.com/search-console):
   1. Add a URL-prefix property for the site.
   2. Choose "HTML tag" verification and put the token in `verification.google`.
   3. Re-run `apply`, deploy, and click **Verify**.
   4. Under **Sitemaps**, submit `sitemap.xml`.
   5. Use **URL Inspection → Request indexing** for the home page.
5. **Bing Webmaster Tools** (bing.com/webmasters):
   1. Import the site from Google Search Console, or add it manually and verify it with the meta tag (put the token in `verification.bing`; `BingSiteAuth.xml` is also generated).
   2. Submit `sitemap.xml`.
   3. Bing results also feed DuckDuckGo, Yahoo and Ecosia.
6. Optional **IndexNow** (Bing, Yandex, Seznam, Naver): put a key of 8 to 128
   letters, digits or dashes in `verification.indexNowKey`. `apply` publishes
   `<key>.txt` at the site root.

When approved, `apply` writes:
- `robots.txt` allowing crawling, with a `Sitemap:` line;
- `sitemap.xml`;
- `index.html` metadata: robots `index, follow`, description, keywords, canonical URL, Open Graph and Twitter tags, theme colour, `WebApplication` JSON-LD, and the verification metas.

## Withdrawing approval

```powershell
node .\search-engine\seo.cjs revoke
```

Then re-run `apply` and redeploy. In Google Search Console, use **Removals** to
hide the URLs quickly. Bing has **Block URLs** for the same purpose.

## Notes and limitations

- The app is a client-rendered Angular SPA. Google renders JavaScript; other
  crawlers mostly rely on the static metadata, which `apply` provides.
  Prerendering is out of scope.
- `apply` is idempotent. It replaces its own marked block in `index.html` and
  deletes files it wrote earlier (listed in `.search-engine-files.json`).
- All configured values are HTML/XML-escaped before they are written.
