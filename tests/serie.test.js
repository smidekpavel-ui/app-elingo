import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zapocitatDen, stavSerie, odemceneJednotky } from '../js/serie.js';

const s = (dni, posledni) => ({ dni_v_rade: dni, posledni_sezeni: posledni });

test('další den → série +1, stejný den nic', () => {
  assert.deepEqual(zapocitatDen(s(8, '2026-11-05'), '2026-11-06').serie, s(9, '2026-11-06'));
  assert.deepEqual(zapocitatDen(s(8, '2026-11-05'), '2026-11-05').serie, s(8, '2026-11-05'));
});

test('1 den volna týdně sérii nepřeruší, druhý ve stejném týdnu ano', () => {
  // čt 5. 11. → (pá volno) → so 7. 11.
  const a = zapocitatDen(s(8, '2026-11-05'), '2026-11-07');
  assert.equal(a.serie.dni_v_rade, 9);
  assert.ok(a.pouzitoVolno);
  assert.deepEqual(a.volno, ['2026-11-02']);
  // (po 9. 11. je nový týden) ale ne 8. 11. – ne 8. 11. je ještě týden 2. 11.
  const b = zapocitatDen(a.serie, '2026-11-09', a.volno); // vynechaná ne 8. 11. = stejný týden
  assert.equal(b.serie.dni_v_rade, 1);
});

test('volno v dalším týdnu je zase k dispozici', () => {
  const a = zapocitatDen(s(3, '2026-11-05'), '2026-11-07', []);
  const b = zapocitatDen(s(4, '2026-11-08'), '2026-11-10', a.volno); // vynechané po 9. 11. = nový týden
  assert.equal(b.serie.dni_v_rade, 5);
});

test('dva dny volna za sebou → série od 1', () => {
  assert.equal(zapocitatDen(s(8, '2026-11-05'), '2026-11-08').serie.dni_v_rade, 1);
  assert.equal(zapocitatDen(null, '2026-11-08').serie.dni_v_rade, 1);
});

test('zobrazení série', () => {
  assert.deepEqual(stavSerie(s(8, '2026-11-05'), '2026-11-05'), { dni: 8, dnesHotovo: true, ohrozena: false });
  assert.deepEqual(stavSerie(s(8, '2026-11-05'), '2026-11-07'), { dni: 8, dnesHotovo: false, ohrozena: true });
  assert.equal(stavSerie(s(8, '2026-11-05'), '2026-11-09').dni, 0);
});

test('odemykání jednotek při ≥ 80 %', () => {
  const poradi = ['a', 'b', 'c'];
  assert.deepEqual([...odemceneJednotky([], poradi).otevrene], ['a']);
  assert.deepEqual([...odemceneJednotky([{ jednotka: 'a', spravnych: 3, hodnocenych: 4 }], poradi).otevrene], ['a']);
  assert.deepEqual([...odemceneJednotky([{ jednotka: 'a', spravnych: 4, hodnocenych: 5 }], poradi).otevrene], ['a', 'b']);
});
