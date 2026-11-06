'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizePdf } = require('../lib/summarizer');

test('summarizePdf returns null when apiKey is missing', async () => {
  const result = await summarizePdf('https://diof.io.org.br/api/diario-oficial/download/test.pdf', {
    apiKey: ''
  });
  assert.equal(result, null);
});

test('summarizePdf returns null when pdfUrl is missing', async () => {
  const result = await summarizePdf('', {
    apiKey: 'dummy-key'
  });
  assert.equal(result, null);
});

