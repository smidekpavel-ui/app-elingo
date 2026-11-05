import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zapsatOdpoved, odlozit, novaPrihradka, smiDnes, jeOdlozena, stavUceni, MIN_ODSTUP_DNI } from '../js/leitner.js';

const P = [1, 3, 7, 14, 30, 60];
const karta = (o = {}) => ({ id: 'x', prihradka: 0, pristi: null, historie: [], ...o });

test('správně s jistotou 3 → o přihrádku výš', () => {
  const k = zapsatOdpoved(karta({ prihradka: 2 }), { vysledek: 'spravne', jistota: 3 }, '2026-11-05', P);
  assert.equal(k.prihradka, 3);
  assert.equal(k.pristi, '2026-11-19'); // 14 dní
  assert.deepEqual(k.historie.at(-1), { datum: '2026-11-05', vysledek: 'spravne', jistota: 3, poznamka: '' });
});

test('správně s jistotou 1–2 → přihrádka zůstává', () => {
  assert.equal(novaPrihradka(3, 'spravne', 1, 6), 3);
  assert.equal(novaPrihradka(3, 'spravne', 2, 6), 3);
});

test('špatně i částečně → přihrádka 0', () => {
  assert.equal(novaPrihradka(4, 'spatne', 3, 6), 0);
  assert.equal(novaPrihradka(4, 'castecne', 3, 6), 0);
});

test('nejvyšší přihrádka se nepřekročí', () => {
  assert.equal(novaPrihradka(5, 'spravne', 3, 6), 5);
});

test('po chybě se karta vrátí nejdřív za 7 dní (pestrost)', () => {
  const k = zapsatOdpoved(karta({ prihradka: 3 }), { vysledek: 'spatne', jistota: 2 }, '2026-11-05', P);
  assert.equal(k.prihradka, 0);
  assert.equal(k.pristi, '2026-11-12');
  assert.equal(MIN_ODSTUP_DNI, 7);
});

test('odložit o měsíc: přihrádka zůstává, záznam „odlozeno“', () => {
  const k = odlozit(karta({ prihradka: 2 }), '2026-11-04');
  assert.equal(k.pristi, '2026-12-04');
  assert.equal(k.prihradka, 2);
  assert.equal(k.historie.at(-1).vysledek, 'odlozeno');
  assert.ok(jeOdlozena(k, '2026-11-20'));
  assert.ok(!smiDnes(k, '2026-12-03'));
  assert.ok(smiDnes(k, '2026-12-04'));
});

test('odložit 31. 1. → 28. 2.', () => {
  assert.equal(odlozit(karta(), '2027-01-31').pristi, '2027-02-28');
});

test('karta vidění v ranních otázkách (historie) se 7 dní neukáže, i když je na řadě', () => {
  const k = karta({ pristi: '2026-11-01', historie: [{ datum: '2026-11-02', vysledek: 'spatne', jistota: 1, poznamka: '' }] });
  assert.ok(!smiDnes(k, '2026-11-08'));
  assert.ok(smiDnes(k, '2026-11-09'));
});

test('stav pro mapu: nova / ucim / umim', () => {
  assert.equal(stavUceni(karta()), 'nova');
  assert.equal(stavUceni(karta({ prihradka: 1, historie: [{ datum: '2026-11-01', vysledek: 'spravne', jistota: 3 }] })), 'ucim');
  assert.equal(stavUceni(karta({ prihradka: 2, historie: [{ datum: '2026-11-01', vysledek: 'spravne', jistota: 3 }] })), 'umim');
  assert.equal(stavUceni(karta({ prihradka: 0, historie: [{ datum: '2026-11-01', vysledek: 'odlozeno', jistota: null }] })), 'nova');
});
