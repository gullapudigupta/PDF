'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const seo = require('./seo.cjs');

const INDEX = '<!doctype html>\n<html lang="en">\n<head>\n  <title>PDF | Anirdeshya Innovation Private Limited</title>\n</head>\n<body><app-root></app-root></body>\n</html>\n';

const created = [];
test.after(() => created.forEach(dir => fs.rmSync(dir, { recursive: true, force: true })));

function workspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-'));
  created.push(dir);
  const dist = path.join(dir, 'dist');
  fs.mkdirSync(dist);
  fs.writeFileSync(path.join(dist, 'index.html'), INDEX);
  const config = path.join(dir, 'config.json');
  fs.copyFileSync(path.join(__dirname, 'search-engine.config.json'), config);
  return { dir, dist, config, read: name => fs.readFileSync(path.join(dist, name), 'utf8'), exists: name => fs.existsSync(path.join(dist, name)) };
}

function approvedConfig(overrides = {}) {
  return {
    ...seo.loadConfig(path.join(__dirname, 'search-engine.config.json')),
    siteUrl: 'https://pdf.anirdeshya.in/',
    indexing: { approved: true, approvedBy: 'Owner', approvedAt: '2026-10-20' },
    verification: { google: 'google-token_123', bing: 'BING1234ABCD', indexNowKey: 'abcdef0123456789' },
    ...overrides,
  };
}

test('shipped configuration is blocked until the owner approves', () => {
  const state = seo.approvalState(seo.loadConfig(path.join(__dirname, 'search-engine.config.json')));
  assert.equal(state.approved, false);
  assert.ok(state.reasons.includes('indexing.approved is not true'));
  assert.ok(state.reasons.includes('siteUrl is not a real https:// URL'));
});

test('blocked apply writes deny-all robots, noindex meta and X-Robots-Tag only', () => {
  const ws = workspace();
  const result = seo.apply(ws.dist, seo.loadConfig(ws.config));
  assert.equal(result.approved, false);
  assert.match(ws.read('robots.txt'), /User-agent: \*\nDisallow: \/\n/);
  assert.match(ws.read('index.html'), /<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">/);
  assert.match(ws.read('_headers'), /X-Robots-Tag: noindex, nofollow, noarchive/);
  for (const name of ['sitemap.xml', 'BingSiteAuth.xml']) assert.equal(ws.exists(name), false);
  assert.doesNotMatch(ws.read('index.html'), /canonical|og:|ld\+json|google-site-verification/);
});

test('incomplete, invalid or unreadable approvals fail closed', () => {
  const cases = [
    approvedConfig({ indexing: { approved: 'true', approvedBy: 'Owner', approvedAt: '2026-10-20' } }),
    approvedConfig({ indexing: { approved: true, approvedBy: ' ', approvedAt: '2026-10-20' } }),
    approvedConfig({ indexing: { approved: true, approvedBy: 'Owner', approvedAt: 'yesterday' } }),
    approvedConfig({ siteUrl: 'http://pdf.anirdeshya.in' }),
    approvedConfig({ siteUrl: 'https://example.com' }),
    approvedConfig({ siteUrl: 'https://localhost:4200' }),
    seo.loadConfig(path.join(os.tmpdir(), 'missing-seo-config.json')),
    null,
  ];
  for (const config of cases) assert.equal(seo.approvalState(config).approved, false, JSON.stringify(config));
});

test('approved apply publishes robots allow, sitemap, rich metadata and verification files', () => {
  const ws = workspace();
  const result = seo.apply(ws.dist, approvedConfig(), { now: new Date('2026-10-21T00:00:00Z') });
  assert.equal(result.approved, true);
  assert.equal(ws.read('robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://pdf.anirdeshya.in/sitemap.xml\n');
  assert.match(ws.read('sitemap.xml'), /<loc>https:\/\/pdf\.anirdeshya\.in\/<\/loc>\n    <lastmod>2026-10-21<\/lastmod>/);
  const html = ws.read('index.html');
  for (const expected of [
    '<meta name="robots" content="index, follow',
    '<link rel="canonical" href="https://pdf.anirdeshya.in/">',
    '<meta property="og:title" content="PDF | Anirdeshya Innovation Private Limited">',
    '<meta name="google-site-verification" content="google-token_123">',
    '<meta name="msvalidate.01" content="BING1234ABCD">',
    '"@type":"WebApplication"',
    '<meta name="theme-color" content="#006b63">',
  ]) assert.ok(html.includes(expected), expected);
  assert.doesNotMatch(html, /noindex/);
  assert.match(ws.read('BingSiteAuth.xml'), /<user>BING1234ABCD<\/user>/);
  assert.equal(ws.read('abcdef0123456789.txt'), 'abcdef0123456789');
  assert.equal(ws.exists('_headers'), false);
});

test('apply is idempotent, escapes values and switching back to blocked removes indexable output', () => {
  const ws = workspace();
  const config = approvedConfig({ description: 'Edit "PDFs" <fast> & safe</script>', verification: { google: '"><script>', bing: '', indexNowKey: '' } });
  seo.apply(ws.dist, config);
  seo.apply(ws.dist, config);
  const html = ws.read('index.html');
  assert.equal(html.split('search-engine:start').length, 2);
  assert.ok(html.includes('content="Edit &quot;PDFs&quot; &lt;fast&gt; &amp; safe&lt;/script&gt;"'));
  assert.doesNotMatch(html, /<fast>/);
  assert.doesNotMatch(html, /google-site-verification/);
  assert.equal((html.match(/<\/script>/g) || []).length, 1);

  seo.apply(ws.dist, { ...config, indexing: { approved: false } });
  assert.equal(ws.exists('sitemap.xml'), false);
  assert.match(ws.read('robots.txt'), /Disallow: \//);
  assert.equal(ws.read('index.html').split('search-engine:start').length, 2);
  assert.match(ws.read('index.html'), /noindex/);
});

test('approve requires a name and real https URL; revoke restores blocked mode', () => {
  const ws = workspace();
  assert.throws(() => seo.approve(ws.config, { by: '', siteUrl: 'https://pdf.anirdeshya.in' }), /--by/);
  assert.throws(() => seo.approve(ws.config, { by: 'Owner', siteUrl: 'https://example.com' }), /--site-url/);
  assert.equal(seo.approvalState(seo.loadConfig(ws.config)).approved, false);
  const state = seo.approve(ws.config, { by: 'Owner', siteUrl: 'https://pdf.anirdeshya.in/', now: new Date('2026-10-22T10:00:00Z') });
  assert.equal(state.approved, true);
  const saved = seo.loadConfig(ws.config);
  assert.deepEqual(saved.indexing, { approved: true, approvedBy: 'Owner', approvedAt: '2026-10-22' });
  assert.equal(saved.siteUrl, 'https://pdf.anirdeshya.in');
  assert.equal(seo.revoke(ws.config).approved, false);
  assert.equal(seo.loadConfig(ws.config).indexing.approved, false);
});

test('apply refuses a folder without index.html', () => {
  const ws = workspace();
  fs.rmSync(path.join(ws.dist, 'index.html'));
  assert.throws(() => seo.apply(ws.dist, approvedConfig()), /No index\.html/);
});
