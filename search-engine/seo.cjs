#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = path.join(__dirname, 'search-engine.config.json');
const MANIFEST = '.search-engine-files.json';
const START = '<!-- search-engine:start -->';
const END = '<!-- search-engine:end -->';
const BLOCKED_ROBOTS_META = 'noindex, nofollow, noarchive, nosnippet';
const BLOCKED_HEADER = 'noindex, nofollow, noarchive';
const PLACEHOLDER_HOSTS = /(^|\.)(example\.(com|org|net)|localhost)$|\.(example|invalid|test|local)$/i;
const TOKEN = /^[A-Za-z0-9_\-]{6,128}$/;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const escapeXml = escapeHtml;

function loadConfig(file = DEFAULT_CONFIG) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return { _loadError: `${path.basename(file)}: ${error.message}` };
  }
}

/** Returns the normalised https site URL or null when it is missing, invalid or a placeholder. */
function normaliseSiteUrl(value) {
  let url;
  try {
    url = new URL(String(value ?? '').trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
  if (!url.hostname.includes('.') || PLACEHOLDER_HOSTS.test(url.hostname)) return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Fail-closed approval gate: anything other than a complete, explicit approval keeps crawlers blocked. */
function approvalState(config) {
  const reasons = [];
  if (!config || typeof config !== 'object') reasons.push('configuration missing');
  else {
    if (config._loadError) reasons.push(`configuration unreadable (${config._loadError})`);
    const indexing = config.indexing || {};
    if (indexing.approved !== true) reasons.push('indexing.approved is not true');
    if (!String(indexing.approvedBy ?? '').trim()) reasons.push('indexing.approvedBy is empty');
    if (!isIsoDate(indexing.approvedAt)) reasons.push('indexing.approvedAt is not an ISO date');
    if (!normaliseSiteUrl(config.siteUrl)) reasons.push('siteUrl is not a real https:// URL');
  }
  return { approved: reasons.length === 0, reasons };
}

function routeUrls(config) {
  const base = normaliseSiteUrl(config.siteUrl);
  const routes = Array.isArray(config.routes) && config.routes.length ? config.routes : [{ path: '/' }];
  return routes
    .filter(route => route && typeof route.path === 'string' && route.path.startsWith('/') && !route.path.startsWith('//'))
    .map(route => ({ ...route, loc: `${base}${route.path === '/' ? '/' : route.path}` }));
}

function robotsTxt(config, approved) {
  if (!approved) {
    return [
      '# Search engine indexing is BLOCKED until the owner approves it.',
      '# See search-engine/README.md in the source repository.',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${normaliseSiteUrl(config.siteUrl)}/sitemap.xml`, ''].join('\n');
}

function sitemapXml(config, now) {
  const lastmod = now.toISOString().slice(0, 10);
  const urls = routeUrls(config).map(route => {
    const lines = [`    <loc>${escapeXml(route.loc)}</loc>`, `    <lastmod>${lastmod}</lastmod>`];
    if (route.changefreq) lines.push(`    <changefreq>${escapeXml(route.changefreq)}</changefreq>`);
    if (typeof route.priority === 'number') lines.push(`    <priority>${Math.min(1, Math.max(0, route.priority)).toFixed(1)}</priority>`);
    return `  <url>\n${lines.join('\n')}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function headBlock(config, approved) {
  if (!approved) {
    return `${START}\n  <meta name="robots" content="${BLOCKED_ROBOTS_META}">\n  ${END}`;
  }
  const base = normaliseSiteUrl(config.siteUrl);
  const canonical = `${base}/`;
  const title = config.siteName || 'PDF';
  const description = config.description || '';
  const image = normaliseSiteUrl(config.socialImage) ? config.socialImage : '';
  const meta = (attr, key, value) => (value ? `  <meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(value)}">` : null);
  const verification = config.verification || {};
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    url: canonical,
    description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any (web browser)',
    inLanguage: config.language || 'en',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    publisher: { '@type': 'Organization', name: config.organization || title },
  };
  const lines = [
    START,
    meta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1'),
    meta('name', 'description', description),
    meta('name', 'keywords', Array.isArray(config.keywords) ? config.keywords.join(', ') : ''),
    `  <link rel="canonical" href="${escapeHtml(canonical)}">`,
    meta('name', 'theme-color', /^#[0-9a-f]{3,8}$/i.test(config.themeColor || '') ? config.themeColor : ''),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', config.organization || title),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', canonical),
    meta('property', 'og:locale', (config.language || 'en').replace('-', '_')),
    meta('property', 'og:image', image),
    meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', image),
    meta('name', 'google-site-verification', TOKEN.test(verification.google || '') ? verification.google : ''),
    meta('name', 'msvalidate.01', TOKEN.test(verification.bing || '') ? verification.bing : ''),
    `  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
    `  ${END}`,
  ];
  return lines.filter(Boolean).join('\n');
}

function stripBlock(html) {
  const pattern = new RegExp(`\\s*${START}[\\s\\S]*?${END}`, 'g');
  return html.replace(pattern, '');
}

/** Post-processes a built web folder. Idempotent; never touches application source. */
function apply(distDir, config, { now = new Date() } = {}) {
  const dir = path.resolve(distDir);
  const indexFile = path.join(dir, 'index.html');
  if (!fs.existsSync(indexFile)) throw new Error(`No index.html in ${dir}. Build the web app first.`);
  const state = approvalState(config);
  const manifestFile = path.join(dir, MANIFEST);
  let previous = [];
  try {
    previous = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch {
    previous = [];
  }
  for (const name of Array.isArray(previous) ? previous : []) {
    const target = path.resolve(dir, String(name));
    if (path.dirname(target) === dir && fs.existsSync(target)) fs.rmSync(target);
  }

  const files = { 'robots.txt': robotsTxt(config, state.approved) };
  if (state.approved) {
    files['sitemap.xml'] = sitemapXml(config, now);
    const verification = config.verification || {};
    if (TOKEN.test(verification.bing || '')) {
      files['BingSiteAuth.xml'] = `<?xml version="1.0"?>\n<users>\n  <user>${escapeXml(verification.bing)}</user>\n</users>\n`;
    }
    if (/^[A-Za-z0-9-]{8,128}$/.test(verification.indexNowKey || '')) files[`${verification.indexNowKey}.txt`] = verification.indexNowKey;
  } else {
    files._headers = `/*\n  X-Robots-Tag: ${BLOCKED_HEADER}\n`;
  }
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  fs.writeFileSync(manifestFile, `${JSON.stringify(Object.keys(files), null, 2)}\n`);

  const html = stripBlock(fs.readFileSync(indexFile, 'utf8'));
  const closeHead = html.search(/<\/head>/i);
  if (closeHead < 0) throw new Error('index.html has no </head> tag.');
  const updated = `${html.slice(0, closeHead).replace(/\s*$/, '')}\n  ${headBlock(config, state.approved)}\n${html.slice(closeHead)}`;
  fs.writeFileSync(indexFile, updated);
  return { ...state, files: Object.keys(files) };
}

function saveConfig(file, config) {
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}

function approve(file, { by, siteUrl, now = new Date() }) {
  const config = loadConfig(file);
  if (config._loadError) throw new Error(`Cannot approve: ${config._loadError}`);
  const approver = String(by ?? '').trim();
  if (!approver) throw new Error('Cannot approve: --by "<approver name>" is required.');
  const url = normaliseSiteUrl(siteUrl ?? config.siteUrl);
  if (!url) throw new Error('Cannot approve: --site-url must be the real public https:// address of the deployed app.');
  config.siteUrl = url;
  config.indexing = { approved: true, approvedBy: approver, approvedAt: now.toISOString().slice(0, 10) };
  saveConfig(file, config);
  return approvalState(config);
}

function revoke(file) {
  const config = loadConfig(file);
  if (config._loadError) throw new Error(`Cannot revoke: ${config._loadError}`);
  config.indexing = { approved: false, approvedBy: '', approvedAt: '' };
  saveConfig(file, config);
  return approvalState(config);
}

function parseArgs(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=', 2);
      options[key] = inline ?? argv[++i];
    } else options._.push(arg);
  }
  return options;
}

function main(argv) {
  const options = parseArgs(argv);
  const [command, target] = options._;
  const configFile = path.resolve(options.config || DEFAULT_CONFIG);
  switch (command) {
    case 'status': {
      const state = approvalState(loadConfig(configFile));
      console.log(state.approved ? 'APPROVED: search engines may index the site after the next apply + deploy.' : `BLOCKED: search engines must not index the site.\n  - ${state.reasons.join('\n  - ')}`);
      return 0;
    }
    case 'apply': {
      if (!target) throw new Error('Usage: node seo.cjs apply <built web folder containing index.html>');
      const result = apply(target, loadConfig(configFile));
      console.log(`${result.approved ? 'APPROVED (indexable)' : 'BLOCKED (noindex)'} output written to ${path.resolve(target)}: index.html, ${result.files.join(', ')}`);
      return 0;
    }
    case 'approve': {
      approve(configFile, { by: options.by, siteUrl: options['site-url'] });
      console.log('Indexing approved and recorded. Run `apply` on the web build and redeploy, then submit the sitemap in Google Search Console and Bing Webmaster Tools.');
      return 0;
    }
    case 'revoke': {
      revoke(configFile);
      console.log('Indexing approval revoked. Run `apply` and redeploy to block search engines again.');
      return 0;
    }
    default:
      console.log('Usage: node seo.cjs <status | apply <distDir> | approve --by <name> --site-url <https url> | revoke> [--config <file>]');
      return command ? 1 : 0;
  }
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { approvalState, apply, approve, revoke, normaliseSiteUrl, robotsTxt, sitemapXml, headBlock, escapeHtml, loadConfig, main };
