// Import a export karty.json. Formát souboru musí zůstat přesně stejný
// (sdílí ho i ranní otázky v Claude), proto se karty ukládají celé
// včetně polí, kterým aplikace nerozumí, a v původním pořadí.

const OBSAH = ['otazka', 'moznosti', 'spravna', 'odpoved', 'klicove_body', 'zdroj', 'stav'];

/** Základní kontrola, že jde o karty.json. Vrací seznam chyb (prázdný = OK). */
export function zkontrolovat(data) {
  const chyby = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['Soubor není objekt JSON.'];
  if (!Array.isArray(data.karty)) chyby.push('Chybí pole „karty“.');
  else {
    const videne = new Set();
    data.karty.forEach((k, i) => {
      if (!k || typeof k.id !== 'string' || !k.id) chyby.push(`Karta č. ${i + 1} nemá „id“.`);
      else if (videne.has(k.id)) chyby.push(`Karta „${k.id}“ je v souboru dvakrát.`);
      else videne.add(k.id);
      if (k && k.historie != null && !Array.isArray(k.historie)) chyby.push(`Karta „${k.id}“ má „historie“, které není pole.`);
    });
  }
  return chyby;
}

/** Export: stejné odsazení (2 mezery), bez ASCII escapování, bez koncového řádku. */
export function doTextu(data) {
  return JSON.stringify(data, null, 2);
}

export function zTextu(text) {
  return JSON.parse(text.replace(/^﻿/, ''));
}

function klicZaznamu(z) {
  return `${z.datum}|${z.vysledek}`;
}

/**
 * Sjednotí historii: místní záznamy + importované, které místně nejsou
 * (bez duplicit podle data + výsledku), seřazeno podle data (stabilně).
 * Vrací { historie, novejsiZ: 'mistni' | 'import' } – kdo má nejnovější záznam.
 */
export function sjednotitHistorii(mistni = [], importovana = []) {
  const vMistni = new Set(mistni.map(klicZaznamu));
  const vImportu = new Set(importovana.map(klicZaznamu));
  const spolu = [
    ...mistni.map((z) => ({ z, puvod: vImportu.has(klicZaznamu(z)) ? 'oba' : 'mistni' })),
    ...importovana.filter((z) => !vMistni.has(klicZaznamu(z))).map((z) => ({ z, puvod: 'import' })),
  ];
  const videne = new Set();
  const unikatni = spolu.filter(({ z }) => {
    const k = klicZaznamu(z);
    if (videne.has(k)) return false;
    videne.add(k);
    return true;
  });
  unikatni.sort((a, b) => (a.z.datum < b.z.datum ? -1 : a.z.datum > b.z.datum ? 1 : 0));
  const posledni = unikatni[unikatni.length - 1];
  return {
    historie: unikatni.map(({ z }) => z),
    novejsiZ: !posledni ? 'import' : posledni.puvod === 'mistni' ? 'mistni' : 'import',
  };
}

/**
 * Sloučí jednu kartu. Text otázky, odpověď, klíčové body, zdroj a stav z importu;
 * historie sjednocená; přihrádka a `pristi` od toho, kdo má nejnovější záznam.
 * Na odložené karty (poslední místní záznam „odlozeno“) se nesahá, pokud import
 * nepřinese novější záznam.
 */
export function sloucitKartu(mistni, importovana) {
  const { historie, novejsiZ } = sjednotitHistorii(mistni.historie || [], importovana.historie || []);
  // Výsledek má pořadí klíčů jako importovaná karta, aby soubor vypadal stejně.
  const vysledek = { ...importovana };
  for (const [k, v] of Object.entries(mistni)) {
    if (!(k in vysledek)) vysledek[k] = v; // pole, která import nezná (např. doplněná aplikací)
  }
  for (const k of OBSAH) {
    if (k in importovana) vysledek[k] = importovana[k];
  }
  vysledek.historie = historie;

  // Odložená místní karta: dokud je nejnovějším záznamem pořád ten odklad, zůstanou místní hodnoty.
  const mh = mistni.historie || [];
  const mistniPosledni = mh[mh.length - 1];
  const posledni = historie[historie.length - 1];
  const odlozenaBezNovejsiho =
    !!mistniPosledni && mistniPosledni.vysledek === 'odlozeno' && klicZaznamu(posledni) === klicZaznamu(mistniPosledni);
  const vzit = novejsiZ === 'mistni' || odlozenaBezNovejsiho ? mistni : importovana;
  vysledek.prihradka = vzit.prihradka ?? 0;
  vysledek.pristi = vzit.pristi ?? null;
  return vysledek;
}

/**
 * Sloučí místní data s importovaným souborem.
 * - karty podle `id`; nové karty z importu se přidají, místní karty, které v importu nejsou, zůstanou,
 * - `nastaveni` z importu, `serie` s novějším posledním sezením.
 * Vrací { data, souhrn }.
 */
export function sloucit(mistniData, importData) {
  if (!mistniData) {
    return { data: structuredClone(importData), souhrn: { novych: importData.karty.length, aktualizovanych: 0, jenMistnich: 0, prvniImport: true } };
  }
  const mistniPodleId = new Map(mistniData.karty.map((k) => [k.id, k]));
  const vImportu = new Set();
  let novych = 0, aktualizovanych = 0;
  const karty = importData.karty.map((ik) => {
    vImportu.add(ik.id);
    const mk = mistniPodleId.get(ik.id);
    if (!mk) { novych++; return structuredClone(ik); }
    aktualizovanych++;
    return sloucitKartu(structuredClone(mk), structuredClone(ik));
  });
  const jenMistni = mistniData.karty.filter((k) => !vImportu.has(k.id));
  karty.push(...structuredClone(jenMistni));

  const data = {};
  // Pořadí klíčů nejvyšší úrovně podle importu.
  for (const k of Object.keys(importData)) data[k] = structuredClone(importData[k]);
  for (const k of Object.keys(mistniData)) if (!(k in data)) data[k] = structuredClone(mistniData[k]);
  data.serie = sloucitSerii(mistniData.serie, importData.serie);
  data.karty = karty;
  return { data, souhrn: { novych, aktualizovanych, jenMistnich: jenMistni.length, prvniImport: false } };
}

export function sloucitSerii(a, b) {
  if (!a) return structuredClone(b ?? null);
  if (!b) return structuredClone(a);
  const pa = a.posledni_sezeni || '', pb = b.posledni_sezeni || '';
  if (pa !== pb) return structuredClone(pa > pb ? a : b);
  return structuredClone((a.dni_v_rade || 0) >= (b.dni_v_rade || 0) ? a : b);
}
