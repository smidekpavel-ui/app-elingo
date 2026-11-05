import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shoda } from '../js/porovnani.js';

test('tolerantní k diakritice, mezerám, čárce/tečce a velikosti písmen', () => {
  assert.ok(shoda('0.4 s', '0,4 s'));
  assert.ok(shoda('0,4s', '0,4 s'));
  assert.ok(shoda('  Revizni   technik ', 'revizní technik'));
  assert.ok(shoda('ctyri.', 'čtyři'));
  assert.ok(!shoda('0,4 ms', '0,4 s'));
  assert.ok(!shoda('', ''));
});
