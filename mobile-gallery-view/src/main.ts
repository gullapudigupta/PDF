import './app.css';

import {
  AppRunResult,
  InMemoryAdapter,
  MediaFileMetadata,
  MobileGalleryAppService,
  RuntimeTarget,
} from './index';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) {
  throw new Error('Missing #app root node');
}

let runtimeTarget: RuntimeTarget = 'mobile';
let running = false;
let result: AppRunResult | null = null;
let errorMessage = '';

function file(
  path: string,
  width: number,
  height: number,
  fileSize: number,
  hashExact: string,
  hashPerceptual: string,
  faceCount: number,
  compressionRatio: number
): MediaFileMetadata {
  return {
    path,
    width,
    height,
    fileSize,
    hashExact,
    hashPerceptual,
    faceCount,
    compressionRatio,
  };
}

function createAppService(): MobileGalleryAppService {
  const roots = ['/media/whatsapp', '/media/screenshots', '/media/camera'];
  const mediaByRoot: Record<string, MediaFileMetadata[]> = {
    '/media/whatsapp': [
      file('/media/whatsapp/family-1.jpg', 1080, 1920, 420000, 'aa11', 'abcdefgh', 2, 0.9),
      file('/media/whatsapp/family-1-copy.jpg', 1080, 1920, 420000, 'aa11', 'abcdxfgh', 2, 0.9),
      file('/media/whatsapp/forwarded-poster.jpg', 720, 1280, 180000, 'bb22', 'ijklmnop', 0, 0.7),
    ],
    '/media/screenshots': [
      file('/media/screenshots/screenshot-1.png', 1080, 2400, 350000, 'cc33', 'qrstuvwx', 0, 0.95),
      file('/media/screenshots/screenshot-2.png', 1080, 2400, 360000, 'dd44', 'qrstuvwy', 0, 0.95),
    ],
    '/media/camera': [
      file('/media/camera/trip-1.jpg', 3000, 2000, 2400000, 'ee55', 'yyyyzzzz', 1, 0.95),
      file('/media/camera/blurry-night.jpg', 1280, 720, 200000, 'ff66', 'yyyaazzz', 1, 0.65),
    ],
  };

  const textFiles = {
    '/imports/contacts.csv':
      'id,name,group\nfamily,Family Group,home\nscreens,Screens Group,tools\ntrip,Trip Team,friends',
  };

  const adapters = {
    web: new InMemoryAdapter('web', mediaByRoot, textFiles),
    mobile: new InMemoryAdapter('mobile', mediaByRoot, textFiles),
    extension: new InMemoryAdapter('extension', mediaByRoot, textFiles),
  };

  return new MobileGalleryAppService(adapters);
}

async function runFlow(): Promise<void> {
  running = true;
  errorMessage = '';
  render();

  try {
    const app = createAppService();
    result = await app.run({
      runtimeTarget,
      scan: { rootPaths: ['/media/whatsapp', '/media/screenshots', '/media/camera'] },
      contactImportFilePath: '/imports/contacts.csv',
    });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unexpected gallery runtime error';
  } finally {
    running = false;
    render();
  }
}

function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function render(): void {
  const cards = result
    ? result.viewModel.summaryCards
        .map((card) => `<article class="card"><h3>${esc(card.label)}</h3><p>${esc(card.value)}</p></article>`)
        .join('')
    : '';

  const groups = result
    ? result.viewModel.groupRows
        .map(
          (group) =>
            `<li><strong>${esc(group.name)}</strong><span>${group.mediaCount} items</span><span>${group.totalSizeMb} MB</span></li>`
        )
        .join('')
    : '';

  const contacts = result
    ? result.viewModel.contactRows
        .map(
          (contact) =>
            `<li><strong>${esc(contact.name)}</strong><span>${contact.mediaCount} items</span><span>${contact.totalSizeMb} MB</span></li>`
        )
        .join('')
    : '';

  const runtimeValidation = result
    ? result.runtimeValidation
        .map(
          (item) =>
            `<li><strong>${esc(item.target)}</strong><span class="${item.isValid ? 'ok' : 'bad'}">${item.isValid ? 'valid' : 'invalid'}</span></li>`
        )
        .join('')
    : '';

  appElement.innerHTML = `
    <main class="app">
      <header class="hero">
        <h1>Mobile Gallery Cleaner</h1>
        <p>Standalone app for scan, review, and cleanup flows.</p>
      </header>

      <section class="controls">
        <label for="runtime">Runtime</label>
        <select id="runtime">
          <option value="mobile" ${runtimeTarget === 'mobile' ? 'selected' : ''}>mobile</option>
          <option value="web" ${runtimeTarget === 'web' ? 'selected' : ''}>web</option>
          <option value="extension" ${runtimeTarget === 'extension' ? 'selected' : ''}>extension</option>
        </select>
        <button id="run-btn" ${running ? 'disabled' : ''}>${running ? 'Running...' : 'Run Sample Flow'}</button>
      </section>

      ${result ? `<section class="cards">${cards}</section>` : ''}

      ${
        result
          ? `<section class="split">
              <article class="panel">
                <h2>Groups First</h2>
                <ul>${groups || '<li>No groups</li>'}</ul>
              </article>
              <article class="panel">
                <h2>Contacts</h2>
                <ul>${contacts || '<li>No contacts</li>'}</ul>
              </article>
            </section>`
          : ''
      }

      ${
        result
          ? `<section class="panel">
              <h2>Decision and Safety</h2>
              <p>Dry-run candidates: ${result.dryRun.totalCandidates}</p>
              <p>Estimated savings: ${result.dryRun.estimatedSavingsMb} MB</p>
              <p>Undo expires: ${esc(result.undoTicket.expiresAt)}</p>
              <p>Top reasons: ${esc(result.viewModel.decisionPanel.topReasons.join(', '))}</p>
            </section>`
          : ''
      }

      ${
        result
          ? `<section class="panel">
              <h2>Runtime Validation</h2>
              <ul>${runtimeValidation}</ul>
            </section>`
          : ''
      }

      ${errorMessage ? `<section class="panel error">${esc(errorMessage)}</section>` : ''}
    </main>
  `;

  const runtimeSelect = document.querySelector<HTMLSelectElement>('#runtime');
  const runButton = document.querySelector<HTMLButtonElement>('#run-btn');

  runtimeSelect?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value as RuntimeTarget;
    runtimeTarget = value;
  });

  runButton?.addEventListener('click', () => {
    void runFlow();
  });
}

render();
