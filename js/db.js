// Uložení v IndexedDB. Celý obsah karty.json je jeden záznam (cca 200 kB),
// nastavení aplikace (denní cíl, XP…) zvlášť, aby se nemíchalo do souboru.

const NAZEV = 'elingo';
const VERZE = 1;
const STORE = 'data';

function otevrit() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NAZEV, VERZE);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function operace(mod, fn) {
  const db = await otevrit();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mod);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req && req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export const nacist = (klic) => operace('readonly', (s) => s.get(klic));
export const ulozit = (klic, hodnota) => operace('readwrite', (s) => s.put(hodnota, klic));
export const smazat = (klic) => operace('readwrite', (s) => s.delete(klic));

export const nacistKarty = () => nacist('karty');
export const ulozitKarty = (data) => ulozit('karty', data);

export const VYCHOZI_APLIKACE = {
  denni_cil: 1, // lekcí denně
  xp: 0,
  posledni_export: null,
  lekce_dne: {}, // { 'YYYY-MM-DD': počet dokončených lekcí }
  vysledky_lekci: [], // pro odemykání jednotek
  volno: [], // pondělí týdnů, kdy byl využit den volna
  videno: {}, // { id: datum } u karet bez hodnocení (nezapisují se do historie)
};

export async function nacistAplikaci() {
  return { ...VYCHOZI_APLIKACE, ...((await nacist('aplikace')) || {}) };
}
export const ulozitAplikaci = (a) => ulozit('aplikace', a);

/** Požádá prohlížeč, ať data nemaže při nedostatku místa. */
export async function trvaleUlozeni() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch { /* ignorovat */ }
  return false;
}
