import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zpusobPolozeni, vysledekZBodu, spocitatXP } from '../js/lekce.js';

const spravne = [{ datum: '2026-11-01', vysledek: 'spravne', jistota: 3 }];

test('způsob položení podle typu karty', () => {
  assert.equal(zpusobPolozeni({ typ: 'test', prihradka: 0, historie: [] }), 'vyber');
  assert.equal(zpusobPolozeni({ typ: 'test', prihradka: 2, historie: spravne }), 'napis');
  assert.equal(zpusobPolozeni({ typ: 'ustni', stav: 'v_opakovani', klicove_body: ['a'] }), 'body');
  assert.equal(zpusobPolozeni({ typ: 'ustni', stav: 'doplnit_klicove_body', klicove_body: [] }), 'zkus');
  for (const typ of ['fakt', 'priklad', 'pripad', 'vysvetli']) assert.equal(zpusobPolozeni({ typ }), 'otevrena');
});

test('hodnocení podle klíčových bodů', () => {
  assert.equal(vysledekZBodu(3, 3), 'spravne');
  assert.equal(vysledekZBodu(1, 3), 'castecne');
  assert.equal(vysledekZBodu(0, 3), 'spatne');
});

test('XP za lekci', () => {
  assert.equal(spocitatXP(0), 10);
  assert.equal(spocitatXP(5), 20);
});
