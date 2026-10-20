'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRecord, stripHtml, compareRecords, buildRss, getPdfUrl } = require('../lib/rss');

test('getPdfUrl generates correct download URL', () => {
  assert.equal(
    getPdfUrl('2026_10_201296002651'),
    'https://diof.io.org.br/api/diario-oficial/download/2026_10_201296002651.pdf'
  );
  assert.equal(
    getPdfUrl('2026_10_201296002651.pdf'),
    'https://diof.io.org.br/api/diario-oficial/download/2026_10_201296002651.pdf'
  );
  assert.equal(getPdfUrl(''), null);
  assert.equal(getPdfUrl(null), null);
});

test('remove tags and normalize line breaks in observation', () => {
  assert.equal(stripHtml('-DECRETO Nº 1<br />-PORTARIA Nº 2<br />'), '-DECRETO Nº 1\n-PORTARIA Nº 2');
});

test('normalizes a publication from the portal JSON', () => {
  const result = normalizeRecord({
    documento: 1295,
    envio: '2026-10-19T16:52:41',
    anoedicao: '20',
    arquivoa4: '2026_10_191295002651',
    observacao: '-DECRETO N. 048.2026 - Dispõe sobre expediente.<br />'
  });
  assert.equal(result.documento, '1295');
  assert.equal(result.title, 'DECRETO N. 048.2026 - Dispõe sobre expediente.');
  assert.equal(result.observacao, '-DECRETO N. 048.2026 - Dispõe sobre expediente.');
});

test('sorts newest publications first', () => {
  const older = normalizeRecord({ documento: 1294, envio: '2026-10-19T08:24:06', observacao: 'Antigo' });
  const newer = normalizeRecord({ documento: 1295, envio: '2026-10-19T16:52:41', observacao: 'Novo' });
  assert.ok([newer, older].sort(compareRecords)[0].documento === '1295');
});

test('produces a valid-looking RSS channel and escapes XML', () => {
  const record = normalizeRecord({
    documento: 1,
    envio: '2026-10-19T16:52:41',
    arquivoa4: '2026_10_201296002651',
    observacao: 'Decreto & portaria <br />'
  });
  const xml = buildRss([record], { feedUrl: 'https://usuario.github.io/repositorio/feed.xml', lastBuildDate: '2026-10-20T00:00:00Z' });
  assert.match(xml, /<rss version="2\.0">/);
  assert.match(xml, /Decreto &amp; portaria/);
  assert.match(xml, /<guid isPermaLink="false">floresta-azul-documento-1<\/guid>/);
  assert.match(xml, /<link>https:\/\/diof\.io\.org\.br\/api\/diario-oficial\/download\/2026_10_201296002651\.pdf<\/link>/);
  assert.match(xml, /<enclosure url="https:\/\/diof\.io\.org\.br\/api\/diario-oficial\/download\/2026_10_201296002651\.pdf" length="0" type="application\/pdf"\/>/);
  assert.match(xml, /Link do PDF: https:\/\/diof\.io\.org\.br\/api\/diario-oficial\/download\/2026_10_201296002651\.pdf/);
  assert.match(xml, /rel="self"/);
});
