// Série dnů: den se počítá po dokončení aspoň jedné lekce,
// 1 den volna týdně (po–ne) sérii nepřeruší.
import { rozdilDni, pricistDny, pondeli } from './datum.js';
import { JEDNOTKY } from './jednotky.js';

/**
 * Započítá dnešní den do série. Nemění vstupy.
 * @param {{dni_v_rade:number, posledni_sezeni:string|null}|null} serie  (z karty.json)
 * @param {string} dnes
 * @param {string[]} volno  pondělí týdnů, ve kterých už byl den volna vybraný
 * @returns {{serie, volno: string[], pouzitoVolno: boolean}}
 */
export function zapocitatDen(serie, dnes, volno = []) {
  const s = { dni_v_rade: 0, posledni_sezeni: null, ...(serie || {}) };
  const posledni = s.posledni_sezeni;
  if (posledni && posledni >= dnes) return { serie: s, volno, pouzitoVolno: false };

  const mezera = posledni ? rozdilDni(posledni, dnes) : Infinity;
  if (mezera === 1) {
    return { serie: { ...s, dni_v_rade: (s.dni_v_rade || 0) + 1, posledni_sezeni: dnes }, volno, pouzitoVolno: false };
  }
  if (mezera === 2) {
    const vynechany = pricistDny(dnes, -1);
    const tyden = pondeli(vynechany);
    if (!volno.includes(tyden)) {
      return {
        serie: { ...s, dni_v_rade: (s.dni_v_rade || 0) + 1, posledni_sezeni: dnes },
        volno: [...volno, tyden].slice(-60),
        pouzitoVolno: true,
      };
    }
  }
  return { serie: { ...s, dni_v_rade: 1, posledni_sezeni: dnes }, volno, pouzitoVolno: false };
}

/**
 * Série k zobrazení dnes (bez zápisu): když je už přerušená, ukáže 0.
 * @returns {{dni:number, dnesHotovo:boolean, ohrozena:boolean}}
 */
export function stavSerie(serie, dnes, volno = []) {
  const posledni = serie?.posledni_sezeni;
  const dni = serie?.dni_v_rade || 0;
  if (!posledni) return { dni: 0, dnesHotovo: false, ohrozena: false };
  const mezera = rozdilDni(posledni, dnes);
  if (mezera <= 0) return { dni, dnesHotovo: true, ohrozena: false };
  if (mezera === 1) return { dni, dnesHotovo: false, ohrozena: false };
  if (mezera === 2 && !volno.includes(pondeli(pricistDny(dnes, -1)))) return { dni, dnesHotovo: false, ohrozena: true };
  return { dni: 0, dnesHotovo: false, ohrozena: false };
}

/**
 * Odemčené jednotky: první je vždy otevřená, další se otevře, když lekce
 * v předchozí jednotce měla ≥ 80 % správně. Splněná jednotka zůstává otevřená.
 * @param {{jednotka:string, spravnych:number, hodnocenych:number}[]} vysledky
 * @param {string[]} poradi  id jednotek v pořadí (jen ty, které mají karty)
 */
export function odemceneJednotky(vysledky = [], poradi = JEDNOTKY.map((j) => j.id), hranice = 0.8) {
  const splnene = new Set(
    vysledky.filter((v) => v.hodnocenych > 0 && v.spravnych / v.hodnocenych >= hranice).map((v) => v.jednotka),
  );
  const otevrene = new Set();
  poradi.forEach((id, i) => {
    if (i === 0 || splnene.has(id) || splnene.has(poradi[i - 1])) otevrene.add(id);
  });
  return { otevrene, splnene };
}
