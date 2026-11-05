import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vybratLekci, zamichatMoznosti, umimZVyberu } from '../js/vyber.js';
import { jednotkaKarty } from '../js/jednotky.js';

function rng(seed = 1) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

const nove = Array.from({ length: 10 }, (_, i) => ({ id: 'n' + i, tema: 'sítě a vodiče', otazka: '?', prihradka: 0, pristi: null, historie: [] }));
const opak = Array.from({ length: 10 }, (_, i) => ({
  id: 'o' + i, tema: 'sítě a vodiče', otazka: '?', prihradka: 1, pristi: '2026-11-01',
  historie: [{ datum: '2026-10-20', vysledek: 'spravne', jistota: 3 }],
}));

test('lekce má 5–8 karet a většinu nových', () => {
  for (const velikost of [3, 5, 6, 8, 12]) {
    const l = vybratLekci([...nove, ...opak], { dnes: '2026-11-05', velikost, rng: rng(velikost) });
    assert.ok(l.length >= 5 && l.length <= 8, `délka ${l.length}`);
    const pocetNovych = l.filter((k) => k.id.startsWith('n')).length;
    assert.ok(pocetNovych > l.length / 2, `nových ${pocetNovych} z ${l.length}`);
    assert.equal(new Set(l.map((k) => k.id)).size, l.length, 'bez duplicit');
  }
});

test('karta viděná před méně než 7 dny se nevybere', () => {
  const nedavna = { ...opak[0], id: 'nedavna', historie: [{ datum: '2026-11-01', vysledek: 'spatne', jistota: 1 }], pristi: '2026-11-02' };
  for (let s = 1; s < 30; s++) {
    const l = vybratLekci([...nove.slice(0, 3), nedavna, ...opak.slice(1, 3)], { dnes: '2026-11-05', rng: rng(s) });
    assert.ok(!l.some((k) => k.id === 'nedavna'));
  }
});

test('odložená karta se nevybere dřív', () => {
  const odl = { ...opak[0], id: 'odl', pristi: '2026-12-01', historie: [{ datum: '2026-10-20', vysledek: 'odlozeno', jistota: null }] };
  const l = vybratLekci([odl, ...nove.slice(0, 2)], { dnes: '2026-11-05', rng: rng() });
  assert.ok(!l.some((k) => k.id === 'odl'));
});

test('když nových chybí, doplní se opakováním', () => {
  const l = vybratLekci([nove[0], ...opak], { dnes: '2026-11-05', velikost: 6, rng: rng() });
  assert.equal(l.length, 6);
});

test('výběr podle jednotky', () => {
  const jine = { ...nove[0], id: 'rcd', tema: 'princip proudového chrániče' };
  assert.equal(jednotkaKarty(jine), 'rcd');
  const l = vybratLekci([...nove, jine], { jednotka: 'rcd', dnes: '2026-11-05', rng: rng() });
  assert.deepEqual(l.map((k) => k.id), ['rcd']);
});

test('možnosti se míchají a správná zůstane označená', () => {
  const k = { moznosti: { a: 'A', b: 'B', c: 'C' }, spravna: 'a' };
  const poradi = new Set();
  for (let s = 1; s < 50; s++) {
    const m = zamichatMoznosti(k, rng(s));
    assert.equal(m.find((x) => x.spravna).text, 'A');
    poradi.add(m.map((x) => x.klic).join(''));
  }
  assert.ok(poradi.size > 1, 'a není pořád první');
});

test('„umím z výběru“ → psaná odpověď', () => {
  assert.ok(umimZVyberu({ typ: 'test', prihradka: 2, historie: [{ datum: '2026-11-01', vysledek: 'spravne', jistota: 3 }] }));
  assert.ok(!umimZVyberu({ typ: 'test', prihradka: 1, historie: [{ datum: '2026-11-01', vysledek: 'spravne', jistota: 3 }] }));
});
