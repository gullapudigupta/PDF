# Search Engine Discoverability – Requirements

Scope: make the hosted web build of "PDF from Anirdeshya Innovation Private
Limited" discoverable by Google, Bing and other search engines, **but keep every
search engine blocked until the owner explicitly approves indexing**. All
discoverability assets and tooling live in the root `search-engine/` folder; the
application source is not modified.

## SEO-01 Blocked by default
- Until approval, every generated deployment must tell all crawlers not to index:
  - `robots.txt` with `User-agent: *` and `Disallow: /`;
  - `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` in `index.html`;
  - an `X-Robots-Tag: noindex, nofollow, noarchive` header snippet for common hosts.
- No sitemap, canonical, Open Graph, structured data or search-console
  verification tokens are published while blocked.
- Missing or invalid approval data must be treated as "not approved".

## SEO-02 Explicit owner approval
- Indexing is enabled only when `search-engine/search-engine.config.json`
  records `indexing.approved: true`, the approver's name, the approval date and a
  real `https://` site URL.
- Approval is recorded with an explicit command (`approve --by ... --site-url ...`);
  `revoke` returns to blocked mode immediately.
- The tool never approves automatically.

## SEO-03 Discoverability when approved
- `robots.txt` allows crawling of public pages and references the sitemap.
- `sitemap.xml` lists configured public routes with `lastmod`.
- `index.html` receives description, keywords, canonical URL, Open Graph,
  Twitter card, theme colour and `WebApplication` JSON-LD; robots meta becomes
  `index, follow`.
- Optional Google / Bing verification tokens (meta tags and `BingSiteAuth.xml`)
  and an IndexNow key file are emitted only when approved and configured.

## SEO-04 Safe build integration
- An `apply <distDir>` command post-processes a built web folder; it is idempotent
  (re-running replaces previously injected tags) and never edits `src/`.
- A `status` command reports blocked/approved and why.
- All injected values are HTML/XML escaped.

## SEO-05 Documentation and tests
- `search-engine/README.md` explains the current state, deploy steps, approval
  steps, Google Search Console and Bing Webmaster Tools onboarding, and SPA
  rendering limitations.
- Node tests cover blocked default, invalid approval, approved output,
  idempotence, escaping and revoke.
