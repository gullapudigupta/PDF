const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const extensionDir = __dirname;

test('browser manifests request only the permissions required for the extension flows', () => {
  for (const file of ['manifest.chrome.json', 'manifest.firefox.json']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, file), 'utf8'));
    assert.deepEqual(manifest.permissions.sort(), ['contextMenus', 'downloads']);
    assert.equal(Object.hasOwn(manifest, 'host_permissions'), false);
    assert.equal(manifest.permissions.includes('file:///*'), false);
  }
});

test('popup opens the packaged PDF editor tab', async () => {
  let openHandler;
  let tabOptions;
  let popupClosed = false;
  const status = { textContent: '' };
  const api = {
    runtime: { getURL: file => `moz-extension://test/${file}` },
    tabs: { create: async options => { tabOptions = options; } },
  };
  const context = {
    browser: api,
    document: {
      getElementById: id => id === 'openPdf'
        ? { addEventListener: (_event, handler) => { openHandler = handler; } }
        : status,
    },
    window: { close: () => { popupClosed = true; } },
  };

  vm.runInNewContext(fs.readFileSync(path.join(extensionDir, 'popup.js'), 'utf8'), context);
  await openHandler();

  assert.deepEqual(JSON.parse(JSON.stringify(tabOptions)), { url: 'moz-extension://test/viewer/index.html' });
  assert.equal(popupClosed, true);
});

test('context menu opens the PDF editor tab and download messages use the browser runtime', async () => {
  const listeners = { installed: null, clicked: null, message: null };
  const menus = [];
  const openedTabs = [];
  const downloads = [];
  const api = {
    runtime: {
      lastError: null,
      getURL: file => `chrome-extension://test/${file}`,
      onInstalled: { addListener: handler => { listeners.installed = handler; } },
      onMessage: { addListener: handler => { listeners.message = handler; } },
    },
    tabs: { create: async options => { openedTabs.push(options); } },
    contextMenus: {
      removeAll: callback => callback(),
      create: (options, callback) => { menus.push(options); callback(); },
      onClicked: { addListener: handler => { listeners.clicked = handler; } },
    },
    downloads: {
      download: (options, callback) => { downloads.push(options); callback(42); },
    },
  };
  const context = { chrome: api, console: { error: () => {} } };
  vm.runInNewContext(fs.readFileSync(path.join(extensionDir, 'background.js'), 'utf8'), context);

  listeners.installed();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(menus)), [{
    id: 'open-pdf-editor',
    title: 'Open PDF Viewer & Editor',
    contexts: ['page'],
  }]);

  listeners.clicked({ menuItemId: 'open-pdf-editor' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(openedTabs)), [{ url: 'chrome-extension://test/viewer/index.html' }]);

  const response = {};
  const keepChannelOpen = listeners.message({
    type: 'EXT_DOWNLOAD_PDF',
    dataUrl: 'data:application/pdf;base64,AQID',
    fileName: 'edited.pdf',
    mimeType: 'application/pdf',
  }, {}, result => Object.assign(response, result));

  assert.equal(keepChannelOpen, true);
  assert.deepEqual(JSON.parse(JSON.stringify(downloads)), [{
    url: 'data:application/pdf;base64,AQID',
    filename: 'edited.pdf',
    saveAs: true,
  }]);
  assert.equal(response.success, true);
  assert.equal(response.filePath, 'edited.pdf');
  assert.equal(response.downloadId, 42);
});

test('Firefox promise-based extension APIs install menus and complete downloads', async () => {
  const listeners = { installed: null, clicked: null, message: null };
  const menus = [];
  const downloads = [];
  const api = {
    runtime: {
      onInstalled: { addListener: handler => { listeners.installed = handler; } },
      onMessage: { addListener: handler => { listeners.message = handler; } },
    },
    tabs: { create: async () => {} },
    contextMenus: {
      removeAll: async () => {},
      create: async options => { menus.push(options); },
      onClicked: { addListener: handler => { listeners.clicked = handler; } },
    },
    downloads: {
      download: async options => { downloads.push(options); return 7; },
    },
  };
  const context = { browser: api, console: { error: () => {} } };
  vm.runInNewContext(fs.readFileSync(path.join(extensionDir, 'background.js'), 'utf8'), context);

  listeners.installed();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(menus)), [{
    id: 'open-pdf-editor',
    title: 'Open PDF Viewer & Editor',
    contexts: ['page'],
  }]);

  const response = {};
  assert.equal(listeners.message({
    type: 'EXT_DOWNLOAD_PDF',
    dataUrl: 'data:application/pdf;base64,AQID',
    fileName: 'edited.pdf',
    mimeType: 'application/pdf',
  }, {}, result => Object.assign(response, result)), true);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(downloads.length, 1);
  assert.equal(response.success, true);
  assert.equal(response.downloadId, 7);
});
