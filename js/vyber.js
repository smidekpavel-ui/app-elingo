// Výběr karet do lekce: většina nových, zbytek opakování, pravidlo pestrosti.
import { jeNova, smiDnes, posledniHodnoceni, MIN_ODSTUP_DNI } from './leitner.js';
import { pricistDny } from './datum.js';
import { jednotkaKarty } from './jednotky.js';

export const VELIKOST_LEKCE = { min: 5, max: 8, vychozi: 6 };

function zamichat(pole, rng) {
  const a = pole.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Karta, kterou jde pokládat (ústní bez klíčových bodů jen jako „zkus vysvětlit“, ale pokládat jde). */
function lzePolozit(karta) {
  return !!karta.otazka;
}

/**
 * Vybere karty do lekce.
 * @param {object[]} karty
 * @param {{jednotka?: string, dnes: string, velikost?: number, rng?: () => number}} o
 * @returns {object[]} karty v pořadí pokládání
 */
export function vybratLekci(karty, { jednotka, dnes, velikost = VELIKOST_LEKCE.vychozi, rng = Math.random, videno = {} }) {
  const n = Math.max(VELIKOST_LEKCE.min, Math.min(VELIKOST_LEKCE.max, velikost));
  const kandidati = karty.filter(
    (k) => lzePolozit(k) && (!jednotka || jednotkaKarty(k) === jednotka) && smiDnes(k, dnes) && !nedavnoVidena(videno[k.id], dnes),
  );
  const nove = zamichat(kandidati.filter(jeNova), rng);
  // Opakování: nejdřív nejdéle čekající (nejstarší `pristi`), pak nižší přihrádka.
  const opakovani = kandidati
    .filter((k) => !jeNova(k))
    .sort((a, b) => {
      const pa = a.pristi || '', pb = b.pristi || '';
      if (pa !== pb) return pa < pb ? -1 : 1;
      return (a.prihradka || 0) - (b.prihradka || 0);
    });

  if (!jednotka) return mixZJednotek(nove, opakovani, n, rng);

  const chciNovych = Math.floor(n / 2) + 1; // většina
  const vybraneNove = nove.slice(0, chciNovych);
  const vybraneOpak = opakovani.slice(0, n - vybraneNove.length);
  // Když je opakování málo, doplním novými (a naopak).
  const zbyva = n - vybraneNove.length - vybraneOpak.length;
  const doplnek = zbyva > 0 ? nove.slice(chciNovych, chciNovych + zbyva) : [];

  return zamichat([...vybraneNove, ...vybraneOpak, ...doplnek], rng);
}

/**
 * Smíchaná lekce: z každé jednotky něco, jednotky v náhodném pořadí, po jedné kartě na kolo.
 * Stejně jako u jednotky je většina nových: opakování nejvýš n − (n/2 + 1), pokud je nových dost.
 */
function mixZJednotek(nove, opakovani, n, rng) {
  const fronty = new Map();
  const fronta = (k) => {
    const j = jednotkaKarty(k);
    if (!fronty.has(j)) fronty.set(j, { nove: [], opak: [] });
    return fronty.get(j);
  };
  nove.forEach((k) => fronta(k).nove.push(k));
  opakovani.forEach((k) => fronta(k).opak.push(k));
  const poradi = zamichat([...fronty.keys()], rng);
  const maxOpak = n - (Math.floor(n / 2) + 1);
  const vybrane = [];
  let opak = 0;
  const kolo = (smiNad) => {
    let pridano = false;
    for (const j of poradi) {
      if (vybrane.length >= n) break;
      const f = fronty.get(j);
      let k = f.nove.shift();
      if (!k && (opak < maxOpak || smiNad)) { k = f.opak.shift(); if (k) opak++; }
      if (k) { vybrane.push(k); pridano = true; }
    }
    return pridano;
  };
  while (vybrane.length < n && kolo(false));
  while (vybrane.length < n && kolo(true)); // nových je málo → doplnit opakováním
  return zamichat(vybrane, rng);
}

/** Karty bez hodnocení (ústní bez klíčových bodů) se nezapisují do historie, aplikace si pamatuje jen datum. */
function nedavnoVidena(datum, dnes) {
  return !!datum && pricistDny(datum, MIN_ODSTUP_DNI) > dnes;
}

/** Ústní karta bez klíčových bodů → jen „zkus vysvětlit“, bez hodnocení. */
export function bezHodnoceni(karta) {
  return karta.typ === 'ustni' && (karta.stav === 'doplnit_klicove_body' || !(karta.klicove_body || []).length);
}

/** Kolik karet jde dnes v jednotce pokládat (pro zobrazení / prázdnou lekci). */
export function dostupneDnes(karty, jednotka, dnes, videno = {}) {
  return karty.filter((k) => lzePolozit(k) && (!jednotka || jednotkaKarty(k) === jednotka) && smiDnes(k, dnes) && !nedavnoVidena(videno[k.id], dnes)).length;
}

/** Testová karta, kterou už umím z výběru → pokládat jako „napiš odpověď“. */
export function umimZVyberu(karta) {
  const p = posledniHodnoceni(karta);
  return karta.typ === 'test' && (karta.prihradka || 0) >= 2 && !!p && p.vysledek === 'spravne';
}

/** Zamíchá možnosti testové otázky (v sadě je správná vždy „a“). */
export function zamichatMoznosti(karta, rng = Math.random) {
  const klice = Object.keys(karta.moznosti || {});
  return zamichat(klice, rng).map((klic) => ({ klic, text: karta.moznosti[klic], spravna: klic === karta.spravna }));
}
