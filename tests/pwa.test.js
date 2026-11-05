import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const koren = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', koren), 'utf8');

test('service worker má v cache všechny skripty aplikace (offline)', () => {
  for (const f of readdirSync(new URL('js/', koren)).filter((f) => f.endsWith('.js'))) {
    assert.ok(sw.includes(`'./js/${f}'`), `chybí ./js/${f}`);
  }
});

test('všechny soubory v cache existují', () => {
  for (const [, cesta] of sw.matchAll(/'\.\/([^']+)'/g)) {
    assert.ok(existsSync(new URL(cesta, koren)), `neexistuje ${cesta}`);
  }
});

test('karty.json je v .gitignore', () => {
  assert.match(readFileSync(new URL('.gitignore', koren), 'utf8'), /^karty\.json$/m);
});
