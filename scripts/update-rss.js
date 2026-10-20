'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  PORTAL_URL,
  normalizeRecord,
  compareRecords,
  buildRss
} = require('../lib/rss');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const STATE_PATH = path.join(ROOT, 'data', 'state.json');
const PORTAL = process.env.PORTAL_URL || PORTAL_URL;
const MAX_FEED_ITEMS = Number.parseInt(process.env.MAX_FEED_ITEMS || '100', 10);

function getSiteBaseUrl() {
  const configured = process.env.SITE_BASE_URL;
  if (configured) return configured.endsWith('/') ? configured : `${configured}/`;
  const repo = process.env.GITHUB_REPOSITORY || '';
  const [owner, name] = repo.split('/');
  if (!owner || !name) return '';
  if (name.toLowerCase() === `${owner}.github.io`.toLowerCase()) {
    return `https://${owner.toLowerCase()}.github.io/`;
  }
  return `https://${owner.toLowerCase()}.github.io/${name}/`;
}

function regexEscape(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function visibleControls(page) {
  return page.evaluate(() => Array.from(
    document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]')
  ).map((el) => {
    const rect = el.getBoundingClientRect();
    const visible = !!(rect.width || rect.height) && getComputedStyle(el).visibility !== 'hidden';
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 140),
      ariaLabel: el.getAttribute('aria-label') || '',
      title: el.getAttribute('title') || '',
      id: el.id || '',
      classes: typeof el.className === 'string' ? el.className.slice(0, 120) : '',
      visible
    };
  }).filter((el) => el.visible));
}

async function clickExportButton(page) {
  const selector = process.env.EXPORT_BUTTON_SELECTOR?.trim();
  if (selector) {
    const target = page.locator(selector).first();
    await target.waitFor({ state: 'visible', timeout: 15000 });
    await target.click();
    return;
  }

  const configuredText = process.env.EXPORT_BUTTON_TEXT?.trim();
  const names = configuredText
    ? [new RegExp(regexEscape(configuredText), 'i')]
    : [/json/i, /exportar/i, /baixar/i, /download/i];

  for (const name of names) {
    for (const role of ['button', 'link']) {
      const locator = page.getByRole(role, { name });
      const count = await locator.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        const candidate = locator.nth(i);
        if (!(await candidate.isVisible().catch(() => false))) continue;
        if (!(await candidate.isEnabled().catch(() => false))) continue;
        await candidate.click();
        return;
      }
    }
  }

  const controls = await visibleControls(page);
  console.error('Não encontrei automaticamente o botão de exportação. Controles visíveis:');
  console.error(JSON.stringify(controls, null, 2));
  throw new Error('Configure EXPORT_BUTTON_TEXT ou EXPORT_BUTTON_SELECTOR com o botão que gera o JSON.');
}

async function captureJsonFromBlob(page) {
  const captured = await page.evaluate(() => window.__diarioJsonBlobs || []);
  if (!captured.length) throw new Error('O portal não gerou um Blob com JSON após o clique.');

  for (const candidate of [...captured].reverse()) {
    try {
      const parsed = JSON.parse(candidate.text);
      if (Array.isArray(parsed)) return parsed;
      for (const key of ['publicacoes', 'documentos', 'data', 'items', 'results']) {
        if (Array.isArray(parsed?.[key])) return parsed[key];
      }
    } catch {
      // Tenta o próximo Blob capturado.
    }
  }
  throw new Error('Blobs foram detectados, mas nenhum continha uma lista JSON de publicações.');
}

async function loadJsonFromPortal() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ locale: 'pt-BR' });
    await page.addInitScript(() => {
      const originalCreateObjectURL = URL.createObjectURL.bind(URL);
      window.__diarioJsonBlobs = [];
      URL.createObjectURL = function (object) {
        const url = originalCreateObjectURL(object);
        if (object instanceof Blob) {
          object.text().then((text) => {
            const clean = text.replace(/^\uFEFF/, '').trim();
            try {
              JSON.parse(clean);
              window.__diarioJsonBlobs.push({
                url,
                type: object.type || '',
                text: clean,
                createdAt: Date.now()
              });
            } catch {
              // Ignora Blob que não contenha JSON válido.
            }
          }).catch(() => {});
        }
        return url;
      };
    });

    await page.goto(PORTAL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    if (process.argv.includes('--list-controls')) {
      console.log(JSON.stringify(await visibleControls(page), null, 2));
      return null;
    }

    await page.evaluate(() => { window.__diarioJsonBlobs = []; });
    await clickExportButton(page);
    await page.waitForFunction(
      () => Array.isArray(window.__diarioJsonBlobs) && window.__diarioJsonBlobs.length > 0,
      null,
      { timeout: 30000 }
    );
    return await captureJsonFromBlob(page);
  } finally {
    await browser.close();
  }
}

async function readState() {
  try {
    const data = JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
    return {
      knownDocumentIds: Array.isArray(data.knownDocumentIds) ? data.knownDocumentIds.map(String) : [],
      items: Array.isArray(data.items) ? data.items : [],
      lastChangedAt: data.lastChangedAt || null
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { knownDocumentIds: [], items: [], lastChangedAt: null };
  }
}

function sameRecord(a, b) {
  return ['documento', 'envio', 'anoedicao', 'arquivoa4', 'observacao', 'title']
    .every((key) => String(a?.[key] ?? '') === String(b?.[key] ?? ''));
}

async function writeOutput(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, 'utf8');
}

async function main() {
  const rawRecords = await loadJsonFromPortal();
  if (rawRecords === null) return;
  if (!Array.isArray(rawRecords)) throw new Error('O JSON extraído não é uma lista.');

  const current = rawRecords.map(normalizeRecord).filter(Boolean).sort(compareRecords);
  if (!current.length) throw new Error('O JSON foi capturado, mas não contém publicações reconhecíveis.');

  const oldState = await readState();
  const knownSet = new Set(oldState.knownDocumentIds);
  const oldItems = new Map(oldState.items.map((item) => [String(item.documento), item]));
  let changed = false;

  for (const record of current) {
    const id = String(record.documento);
    const oldRecord = oldItems.get(id);
    if (!knownSet.has(id) || (oldRecord && !sameRecord(oldRecord, record))) changed = true;
  }

  const mergedMap = new Map(oldItems);
  for (const record of current) mergedMap.set(String(record.documento), record);
  const mergedItems = [...mergedMap.values()].sort(compareRecords).slice(0, MAX_FEED_ITEMS);
  const knownDocumentIds = [...new Set([...current.map((item) => String(item.documento)), ...oldState.knownDocumentIds])].slice(0, 10000);

  const now = new Date().toISOString();
  const lastChangedAt = changed ? now : (oldState.lastChangedAt || now);
  const newState = { knownDocumentIds, items: mergedItems, lastChangedAt };
  await writeOutput(STATE_PATH, `${JSON.stringify(newState, null, 2)}\n`);

  const siteBase = getSiteBaseUrl();
  const feedUrl = siteBase ? `${siteBase}feed.xml` : '';
  const rss = buildRss(mergedItems, { portalUrl: PORTAL, feedUrl, lastBuildDate: lastChangedAt });
  await writeOutput(path.join(SITE_DIR, 'feed.xml'), rss);

  const indexPath = path.join(SITE_DIR, 'index.html');
  try {
    await fs.access(indexPath);
  } catch {
    throw new Error('site/index.html não foi encontrado.');
  }

  const summary = {
    captured: current.length,
    totalInFeed: mergedItems.length,
    newDocuments: current.filter((item) => !knownSet.has(String(item.documento))).map((item) => item.documento),
    changed
  };
  console.log(JSON.stringify(summary, null, 2));

  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, 'utf8');
  }
  if (process.argv.includes('--debug')) {
    console.log('\nExemplo capturado:');
    console.log(JSON.stringify(current[0], null, 2));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
