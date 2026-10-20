'use strict';

const PORTAL_URL = 'https://diario.florestaazul.ba.gov.br/edicoes-anteriores';

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHtml(value) {
  return decodeEntities(String(value ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ''))
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeRecord(record) {
  if (!record || record.documento === undefined || record.documento === null) {
    return null;
  }
  const documento = String(record.documento).trim();
  if (!documento) return null;
  const observacao = stripHtml(record.observacao || '');
  const title = (observacao.split(/\n/).find(Boolean) || `Publicação ${documento}`)
    .replace(/^-+\s*/, '')
    .slice(0, 220);
  return {
    documento,
    envio: String(record.envio || ''),
    anoedicao: String(record.anoedicao || ''),
    arquivoa4: String(record.arquivoa4 || ''),
    observacao,
    title: title || `Publicação ${documento}`
  };
}

function recordTime(record) {
  const raw = String(record.envio || '').trim();
  if (!raw) return 0;
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}-03:00`;
  const time = Date.parse(zoned);
  return Number.isFinite(time) ? time : 0;
}

function compareRecords(a, b) {
  const dateDiff = recordTime(b) - recordTime(a);
  if (dateDiff) return dateDiff;
  return Number(b.documento) - Number(a.documento);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rssDate(record) {
  const time = recordTime(record);
  if (!time) return new Date(0).toUTCString();
  return new Date(time).toUTCString();
}

function buildRss(records, options = {}) {
  const portalUrl = options.portalUrl || PORTAL_URL;
  const feedUrl = options.feedUrl || '';
  const builtAt = options.lastBuildDate ? new Date(options.lastBuildDate) : new Date();
  const itemsXml = records.map((r) => {
    const descriptionParts = [r.observacao || r.title];
    if (r.envio) descriptionParts.push(`Data de envio: ${r.envio}`);
    if (r.documento) descriptionParts.push(`Identificador da publicação: ${r.documento}`);
    if (r.anoedicao) descriptionParts.push(`Edição/ano informado pelo portal: ${r.anoedicao}`);
    if (r.arquivoa4) descriptionParts.push(`Identificador de arquivo informado pelo portal: ${r.arquivoa4}`);
    const description = descriptionParts.join('\n\n');
    return [
      '    <item>',
      `      <title>${xmlEscape(r.title || `Publicação ${r.documento}`)}</title>`,
      `      <link>${xmlEscape(portalUrl)}</link>`,
      `      <guid isPermaLink="false">floresta-azul-documento-${xmlEscape(r.documento)}</guid>`,
      `      <pubDate>${rssDate(r)}</pubDate>`,
      `      <description>${xmlEscape(description)}</description>`,
      '    </item>'
    ].join('\n');
  }).join('\n');

  const selfLink = feedUrl
    ? `\n    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom"/>`
    : '';
  const lastBuild = Number.isFinite(builtAt.getTime()) ? builtAt.toUTCString() : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Diário Oficial de Floresta Azul</title>
    <link>${xmlEscape(portalUrl)}</link>
    <description>Publicações recentes do Diário Oficial de Floresta Azul, Bahia.</description>
    <language>pt-br</language>
    <lastBuildDate>${xmlEscape(lastBuild)}</lastBuildDate>${selfLink}
${itemsXml}
  </channel>
</rss>
`;
}

module.exports = {
  PORTAL_URL,
  stripHtml,
  normalizeRecord,
  recordTime,
  compareRecords,
  xmlEscape,
  buildRss
};
