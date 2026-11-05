// Opakování v intervalech (Leitner) a pravidlo pestrosti.
import { pricistDny, pricistMesice, maxDatum } from './datum.js';

export const VYSLEDKY = ['spravne', 'castecne', 'spatne', 'odlozeno'];

/** Jedna karta se ukáže nejvýš 1× za tolik dní (i když ji pokazím). */
export const MIN_ODSTUP_DNI = 7;

/** Výchozí pauzy, pokud by v nastavení chyběly. */
export const VYCHOZI_PAUZY = [1, 3, 7, 14, 30, 60];

function posledniZaznam(karta, i = 1) {
  const h = karta.historie || [];
  return h[h.length - i] || null;
}

/** Poslední záznam historie, který není odklad. */
export function posledniHodnoceni(karta) {
  const h = karta.historie || [];
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].vysledek !== 'odlozeno') return h[i];
  }
  return null;
}

/** Datum, kdy se karta naposledy ukázala (i z ranních otázek nebo odkladu). */
export function naposledyVidena(karta) {
  let posledni = null;
  for (const z of karta.historie || []) posledni = maxDatum(posledni, z.datum);
  return posledni;
}

/** Karta je odložená, když poslední záznam je odklad a `pristi` ještě nenastalo. */
export function jeOdlozena(karta, dnes) {
  const z = posledniZaznam(karta);
  return !!z && z.vysledek === 'odlozeno' && !!karta.pristi && karta.pristi > dnes;
}

/** Nová karta = zatím žádné hodnocení. */
export function jeNova(karta) {
  return !posledniHodnoceni(karta);
}

/** Nová přihrádka po odpovědi. `castecne` se počítá jako špatně. */
export function novaPrihradka(prihradka, vysledek, jistota, pocetPrihradek) {
  const p = Number.isInteger(prihradka) ? prihradka : 0;
  if (vysledek === 'spravne') {
    return jistota === 3 ? Math.min(p + 1, pocetPrihradek - 1) : p;
  }
  return 0;
}

/**
 * Zapíše odpověď do karty (mění kartu na místě) a vrátí ji.
 * Správně s jistotou 3 → o přihrádku výš, správně s jistotou 1–2 → zůstává,
 * špatně / částečně → přihrádka 0. Další opakování podle `pauzy_dny`,
 * ale nejdřív za MIN_ODSTUP_DNI (pravidlo pestrosti).
 */
export function zapsatOdpoved(karta, { vysledek, jistota, poznamka = '' }, dnes, pauzy = VYCHOZI_PAUZY) {
  if (!['spravne', 'castecne', 'spatne'].includes(vysledek)) {
    throw new Error('Neznámý výsledek: ' + vysledek);
  }
  const j = jistota == null ? null : Number(jistota);
  const b = novaPrihradka(karta.prihradka, vysledek, j, pauzy.length);
  karta.prihradka = b;
  karta.pristi = maxDatum(pricistDny(dnes, pauzy[b]), pricistDny(dnes, MIN_ODSTUP_DNI));
  if (!Array.isArray(karta.historie)) karta.historie = [];
  karta.historie.push({ datum: dnes, vysledek, jistota: j, poznamka });
  return karta;
}

/** Odloží kartu o měsíc. Přihrádka zůstává. */
export function odlozit(karta, dnes, poznamka = 'odloženo o měsíc') {
  karta.pristi = pricistMesice(dnes, 1);
  if (!Array.isArray(karta.historie)) karta.historie = [];
  karta.historie.push({ datum: dnes, vysledek: 'odlozeno', jistota: null, poznamka });
  return karta;
}

/** Smí se karta dnes ukázat? (pestrost + odklad + termín) */
export function smiDnes(karta, dnes) {
  if (jeOdlozena(karta, dnes)) return false;
  const videna = naposledyVidena(karta);
  if (videna && pricistDny(videna, MIN_ODSTUP_DNI) > dnes) return false;
  if (karta.pristi && karta.pristi > dnes) return false;
  return true;
}

/** Stav pro mapu jednotek: umim | ucim | nova. */
export function stavUceni(karta) {
  const posledni = posledniHodnoceni(karta);
  if (!posledni) return 'nova';
  if ((karta.prihradka || 0) >= 2 && posledni.vysledek === 'spravne') return 'umim';
  return 'ucim';
}
