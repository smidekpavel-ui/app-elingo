import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { sloucit, sloucitKartu, sjednotitHistorii, doTextu, zTextu, zkontrolovat } from '../js/slouceni.js';

const z = (datum, vysledek, jistota = 3) => ({ datum, vysledek, jistota, poznamka: '' });

test('historie se sjednotí bez duplicit podle data + výsledku', () => {
  const { historie } = sjednotitHistorii([z('2026-10-01', 'spravne'), z('2026-10-05', 'spatne')], [z('2026-10-01', 'spravne', 2), z('2026-10-03', 'castecne')]);
  assert.deepEqual(historie.map((h) => h.datum + h.vysledek), ['2026-10-01spravne', '2026-10-03castecne', '2026-10-05spatne']);
});

test('text, odpověď, klíčové body, zdroj a stav z importu; postup podle nejnovějšího záznamu', () => {
  const mistni = { id: 'a', otazka: 'stará', odpoved: 'stará', klicove_body: [], zdroj: 's', stav: 'nova', prihradka: 3, pristi: '2026-11-20', historie: [z('2026-11-06', 'spravne')] };
  const imp = { id: 'a', otazka: 'nová', odpoved: 'nová', klicove_body: ['x'], zdroj: 'n', stav: 'v_opakovani', prihradka: 1, pristi: '2026-11-08', historie: [z('2026-11-01', 'spravne')] };
  const v = sloucitKartu(mistni, imp);
  assert.equal(v.otazka, 'nová');
  assert.deepEqual(v.klicove_body, ['x']);
  assert.equal(v.stav, 'v_opakovani');
  assert.equal(v.prihradka, 3); // nejnovější záznam je místní
  assert.equal(v.pristi, '2026-11-20');
  assert.equal(v.historie.length, 2);

  const imp2 = { ...imp, prihradka: 0, pristi: '2026-11-14', historie: [z('2026-11-07', 'spatne')] };
  const v2 = sloucitKartu(mistni, imp2);
  assert.equal(v2.prihradka, 0); // nejnovější záznam (ranní otázky) z importu
  assert.equal(v2.pristi, '2026-11-14');
});

test('na odloženou kartu se nesahá', () => {
  const mistni = { id: 'a', otazka: 'q', prihradka: 2, pristi: '2026-12-04', historie: [z('2026-10-01', 'spravne'), z('2026-11-04', 'odlozeno', null)] };
  const imp = { id: 'a', otazka: 'q2', prihradka: 0, pristi: '2026-11-06', historie: [z('2026-10-01', 'spravne')] };
  const v = sloucitKartu(mistni, imp);
  assert.equal(v.pristi, '2026-12-04');
  assert.equal(v.prihradka, 2);
  assert.equal(v.historie.at(-1).vysledek, 'odlozeno');
  assert.equal(v.otazka, 'q2');
});

test('neznámá pole a pořadí klíčů zůstanou; chybějící „stav“ se nedoplní', () => {
  const mistni = { id: 'a', typ: 'fakt', otazka: 'q', prihradka: 0, pristi: null, historie: [], zavedeno: '2026-10-12' };
  const imp = { id: 'a', typ: 'fakt', otazka: 'q', prihradka: 0, pristi: null, historie: [], zavedeno: '2026-10-12', terminologie: 't' };
  const v = sloucitKartu(mistni, imp);
  assert.deepEqual(Object.keys(v), Object.keys(imp));
  assert.ok(!('stav' in v));
});

test('nové karty z importu přibudou, místní navíc zůstanou, série novější', () => {
  const mistni = { nastaveni: { a: 1 }, serie: { dni_v_rade: 9, posledni_sezeni: '2026-11-06' }, karty: [{ id: 'm', historie: [] }, { id: 'x', historie: [] }] };
  const imp = { nastaveni: { a: 2 }, serie: { dni_v_rade: 8, posledni_sezeni: '2026-11-05' }, karty: [{ id: 'x', historie: [] }, { id: 'n', historie: [] }] };
  const { data, souhrn } = sloucit(mistni, imp);
  assert.deepEqual(data.karty.map((k) => k.id), ['x', 'n', 'm']);
  assert.deepEqual(souhrn, { novych: 1, aktualizovanych: 1, jenMistnich: 1, prvniImport: false });
  assert.equal(data.nastaveni.a, 2);
  assert.equal(data.serie.dni_v_rade, 9);
  assert.deepEqual(Object.keys(data), ['nastaveni', 'serie', 'karty']);
});

function roundTrip(cesta) {
  const text = readFileSync(cesta, 'utf8');
  const data = zTextu(text);
  assert.deepEqual(zkontrolovat(data), []);
  // první import → export
  const { data: d1 } = sloucit(null, data);
  assert.equal(doTextu(d1), text, 'export po prvním importu je stejný jako soubor');
  // opakovaný import stejného souboru nic nezmění
  const { data: d2 } = sloucit(d1, data);
  assert.equal(doTextu(d2), text, 'opětovný import stejného souboru nic nezmění');
}

test('round-trip ukázkového souboru je přesně stejný', () => {
  roundTrip(new URL('../karty.ukazka.json', import.meta.url));
});

const ostra = process.env.KARTY_JSON;
test('round-trip skutečného karty.json (nastav KARTY_JSON)', { skip: !ostra || !existsSync(ostra) }, () => {
  roundTrip(ostra);
});
