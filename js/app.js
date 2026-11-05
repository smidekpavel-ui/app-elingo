// Elingo – hlavní obrazovky: mapa jednotek, lekce, série, import a export.
import * as db from './db.js';
import { dnes, rozdilDni } from './datum.js';
import { JEDNOTKY, jednotkaKarty } from './jednotky.js';
import { stavUceni, jeOdlozena } from './leitner.js';
import { sloucit, zkontrolovat, doTextu, zTextu } from './slouceni.js';
import { el } from './ui.js';
import { spustitLekci } from './lekce.js';
import { dostupneDnes } from './vyber.js';
import { zapocitatDen, stavSerie, odemceneJednotky } from './serie.js';
import { nacistTema, nastavitTema, pouzitTema } from './tema.js';
import { spustitUvod } from './uvod.js';

pouzitTema();
spustitUvod();

const stav = { data: null, aplikace: null, obrazovka: 'mapa', zprava: null };
const obsah = document.getElementById('obsah');
const vstupSouboru = document.getElementById('soubor');

/* ---------- pomocníci ---------- */
function datumCesky(d) {
  if (!d) return '—';
  const [r, m, den] = d.split('-');
  return `${Number(den)}. ${Number(m)}. ${r}`;
}

function sklonuj(n, jedna, dva, pet) {
  return n === 1 ? jedna : n >= 2 && n <= 4 ? dva : pet;
}

/* ---------- obrazovky ---------- */
function upozorneniNaZalohu() {
  const posledni = stav.aplikace.posledni_export;
  const dni = posledni ? rozdilDni(posledni, dnes()) : null;
  const text = posledni
    ? `Poslední export: ${datumCesky(posledni)}${dni > 0 ? ` (před ${dni} ${sklonuj(dni, 'dnem', 'dny', 'dny')})` : ' (dnes)'}.`
    : 'Zatím jsi karty neexportoval.';
  return el('div', { class: 'upozorneni' },
    el('strong', {}, 'Postup je uložený jen v tomto zařízení. '),
    'Vymazáním dat prohlížeče (nebo odinstalací aplikace) se smaže. ',
    text, ' ',
    el('a', { href: '#', onclick: (e) => { e.preventDefault(); prepnout('data'); } }, 'Exportovat karty.json'),
  );
}

function zpravaBlok() {
  if (!stav.zprava) return null;
  const { typ, nadpis, text } = stav.zprava;
  return el('div', { class: `upozorneni ${typ}` }, el('strong', {}, nadpis + ' '), text);
}

function obrazovkaPrazdna() {
  return [
    el('h2', {}, 'Vítej v Elingu'),
    el('div', { class: 'karta' },
      el('p', {}, 'Aplikace je zatím prázdná. Otázky v ní nejsou, protože sada otázek není veřejná.'),
      el('p', {}, 'Nahraj svůj soubor karty.json. Uloží se jen v tomto zařízení a nikam se neodesílá.'),
    ),
    el('button', { class: 'tlacitko', type: 'button', onclick: () => vstupSouboru.click() }, 'Importovat karty.json'),
    el('button', { class: 'tlacitko druhe', type: 'button', onclick: nahratUkazku }, 'Vyzkoušet s ukázkovými kartami'),
  ];
}

function obrazovkaMapa() {
  if (!stav.data) return obrazovkaPrazdna();
  const den = dnes();
  const sKartami = JEDNOTKY.filter((j) => stav.data.karty.some((k) => jednotkaKarty(k) === j.id));
  const { splnene } = odemceneJednotky(stav.aplikace.vysledky_lekci, sKartami.map((j) => j.id));
  const bloky = sKartami.map((j) => {
    const karty = stav.data.karty.filter((k) => jednotkaKarty(k) === j.id);
    const c = { umim: 0, ucim: 0, nova: 0 };
    karty.forEach((k) => c[stavUceni(k)]++);
    const odlozenych = karty.filter((k) => jeOdlozena(k, den)).length;
    const proc = (n) => `${(n / karty.length) * 100}%`;
    const naRade = dostupneDnes(stav.data.karty, j.id, den, stav.aplikace.videno || {});
    return el('button', { class: 'jednotka', type: 'button', onclick: () => zahajitLekci(j) },
      el('span', { class: 'nazev' }, splnene.has(j.id) ? '⭐ ' : '', j.nazev),
      el('span', { class: 'pocet' }, `${karty.length} ${sklonuj(karty.length, 'karta', 'karty', 'karet')}`),
      el('div', { class: 'ukazatel', 'aria-hidden': 'true' },
        el('span', { class: 'umim', style: `width:${proc(c.umim)}` }),
        el('span', { class: 'ucim', style: `width:${proc(c.ucim)}` }),
      ),
      el('div', { class: 'cisla' },
        el('span', { class: 'stitek umim' }, `umím ${c.umim}`),
        el('span', { class: 'stitek ucim' }, `učím se ${c.ucim}`),
        el('span', { class: 'stitek nova' }, `nové ${c.nova}`),
        odlozenych ? el('span', { class: 'tlumeny' }, `odložené ${odlozenych}`) : null,
      ),
      el('span', { class: 'na-rade' }, naRade ? `Dnes k procvičení: ${naRade} → Začít lekci` : 'Dnes nic na řadě'),
    );
  });
  return [
    zpravaBlok(),
    denniCilBlok(den),
    upozorneniNaZalohu(),
    el('button', { class: 'tlacitko', type: 'button', onclick: () => zahajitLekci(null) }, '🔀 Smíchaná lekce ze všech jednotek'),
    el('p', { class: 'tlumeny maly' }, 'Z každé jednotky něco, vše zamíchané (8 otázek).'),
    el('h2', {}, 'Jednotky'),
    el('p', { class: 'tlumeny' }, 'Nebo si vyber jednotku a procvič jen ji (5–8 otázek).'),
    el('div', { class: 'jednotky' }, bloky),
  ];
}

function denniCilBlok(den) {
  const cil = stav.aplikace.denni_cil || 1;
  const hotovo = stav.aplikace.lekce_dne[den] || 0;
  const ser = stavSerie(stav.data.serie, den, stav.aplikace.volno || []);
  const text = hotovo >= cil
    ? 'Denní cíl splněn. 🎉'
    : ser.ohrozena
      ? 'Včera jsi měl volno (1 den týdně sérii nepřeruší). Dnes dokonči lekci, ať série pokračuje.'
      : ser.dnesHotovo ? 'Den se už počítá do série.' : 'Dokonči aspoň jednu lekci a den se započítá do série.';
  return el('div', { class: 'karta cil' },
    el('div', { class: 'cil-radek' },
      el('strong', {}, `🔥 ${ser.dni} ${sklonuj(ser.dni, 'den', 'dny', 'dní')} v řadě`),
      el('span', { class: 'tlumeny' }, `Dnes ${Math.min(hotovo, cil)}/${cil} ${sklonuj(cil, 'lekce', 'lekce', 'lekcí')}`)),
    el('div', { class: 'prubeh' }, el('span', { style: `width:${Math.min(1, hotovo / cil) * 100}%` })),
    el('p', { class: 'tlumeny maly' }, text),
  );
}

function obrazovkaData() {
  const d = stav.data;
  const prehled = d
    ? el('div', { class: 'karta' },
      el('dl', { class: 'prehled' },
        el('dt', {}, 'Karet celkem'), el('dd', {}, String(d.karty.length)),
        el('dt', {}, 'S historií'), el('dd', {}, String(d.karty.filter((k) => (k.historie || []).length).length)),
        el('dt', {}, 'Série (ze souboru)'), el('dd', {}, `${d.serie?.dni_v_rade ?? 0} dní`),
        el('dt', {}, 'Poslední sezení'), el('dd', {}, datumCesky(d.serie?.posledni_sezeni)),
        el('dt', {}, 'Poslední export'), el('dd', {}, datumCesky(stav.aplikace.posledni_export)),
      ))
    : null;
  return [
    zpravaBlok(),
    el('h2', {}, 'Karty a záloha'),
    prehled,
    el('div', { class: 'karta' },
      el('label', { class: 'nastaveni-radek' },
        el('span', {}, 'Denní cíl'),
        el('select', {
          onchange: async (e) => { stav.aplikace.denni_cil = Number(e.target.value); await db.ulozitAplikaci(stav.aplikace); vykreslit(); },
        }, [1, 2, 3, 4, 5].map((n) => el('option', { value: String(n), selected: n === (stav.aplikace.denni_cil || 1) }, `${n} ${sklonuj(n, 'lekce', 'lekce', 'lekcí')} denně`))),
      ),
      el('label', { class: 'nastaveni-radek' },
        el('span', {}, 'Vzhled'),
        el('select', { onchange: (e) => nastavitTema(e.target.value) },
          [['svetly', 'světlý'], ['tmavy', 'tmavý'], ['auto', 'podle systému telefonu']].map(([v, t]) =>
            el('option', { value: v, selected: v === nacistTema() }, t))),
      ),
    ),
    el('button', { class: 'tlacitko', type: 'button', onclick: exportovat, disabled: !d }, 'Exportovat karty.json'),
    el('button', { class: 'tlacitko druhe', type: 'button', onclick: () => vstupSouboru.click() }, 'Importovat karty.json'),
    el('p', { class: 'tlumeny' },
      'Import aktualizuje otázky a odpovědi a tvůj postup zachová: historie se sjednotí, přihrádka a další opakování se vezmou podle nejnovějšího záznamu. Odložených karet se import nedotkne.'),
    el('p', { class: 'tlumeny' },
      'Export stáhne soubor ve stejném formátu, jaký používají ranní otázky v Claude.'),
    d ? el('button', { class: 'tlacitko nebezpecne', type: 'button', onclick: smazatVse }, 'Smazat karty z tohoto zařízení') : null,
  ];
}

function vykreslit() {
  const info = document.getElementById('lista-info');
  info.replaceChildren();
  if (stav.data) info.append(el('span', { title: 'Série dnů' }, `🔥 ${stavSerie(stav.data.serie, dnes(), stav.aplikace?.volno || []).dni}`));
  if (stav.aplikace) info.append(el('span', { title: 'XP' }, `⚡ ${stav.aplikace.xp} XP`));

  const obrazovky = { mapa: obrazovkaMapa, data: obrazovkaData };
  obsah.replaceChildren(...(obrazovky[stav.obrazovka] || obrazovkaMapa)().flat().filter(Boolean));
  document.querySelectorAll('.spodni button').forEach((b) =>
    b.classList.toggle('aktivni', b.dataset.obrazovka === stav.obrazovka));
}

function prepnout(obrazovka) {
  stav.obrazovka = obrazovka;
  stav.zprava = null;
  vykreslit();
  window.scrollTo(0, 0);
}

/* ---------- lekce ---------- */
function zahajitLekci(jednotka) {
  stav.zprava = null;
  document.body.classList.add('v-lekci');
  spustitLekci({
    obsah,
    data: stav.data,
    aplikace: stav.aplikace,
    jednotka: jednotka ? jednotka.id : null,
    nazevJednotky: jednotka ? jednotka.nazev : 'Smíchaná lekce',
    ulozit: async () => {
      await db.ulozitKarty(stav.data);
      await db.ulozitAplikaci(stav.aplikace);
    },
    konec: async (vysledek) => {
      document.body.classList.remove('v-lekci');
      if (vysledek) {
        const a = stav.aplikace;
        a.xp += vysledek.xp;
        a.lekce_dne = { ...a.lekce_dne, [vysledek.den]: (a.lekce_dne[vysledek.den] || 0) + 1 };
        a.vysledky_lekci = [...(a.vysledky_lekci || []), {
          den: vysledek.den, jednotka: vysledek.jednotka, spravnych: vysledek.spravnych,
          castecnych: vysledek.castecnych, hodnocenych: vysledek.hodnocenych,
        }].slice(-500);
        const z = zapocitatDen(stav.data.serie, vysledek.den, a.volno || []);
        stav.data.serie = z.serie;
        a.volno = z.volno;
        await db.ulozitKarty(stav.data);
        await db.ulozitAplikaci(a);
      }
      stav.obrazovka = 'mapa';
      vykreslit();
      window.scrollTo(0, 0);
    },
  });
}

/* ---------- akce ---------- */
async function importovatText(text, nazevSouboru) {
  let data;
  try {
    data = zTextu(text);
  } catch {
    stav.zprava = { typ: 'chyba', nadpis: 'Import se nepovedl.', text: `${nazevSouboru} není platný JSON.` };
    return vykreslit();
  }
  const chyby = zkontrolovat(data);
  if (chyby.length) {
    stav.zprava = { typ: 'chyba', nadpis: 'Import se nepovedl.', text: chyby.slice(0, 3).join(' ') };
    return vykreslit();
  }
  const { data: sloucena, souhrn } = sloucit(stav.data, data);
  await db.ulozitKarty(sloucena);
  stav.data = sloucena;
  db.trvaleUlozeni();
  stav.zprava = {
    typ: 'uspech',
    nadpis: 'Hotovo.',
    text: souhrn.prvniImport
      ? `Načteno ${sloucena.karty.length} karet včetně přihrádek, termínů a historie.`
      : `Aktualizováno ${souhrn.aktualizovanych}, nových ${souhrn.novych}` +
        (souhrn.jenMistnich ? `, ${souhrn.jenMistnich} karet je jen v aplikaci (zůstaly)` : '') + '.',
  };
  stav.obrazovka = 'mapa';
  vykreslit();
}

vstupSouboru.addEventListener('change', async () => {
  const soubor = vstupSouboru.files[0];
  vstupSouboru.value = '';
  if (soubor) await importovatText(await soubor.text(), soubor.name);
});

async function nahratUkazku() {
  const odpoved = await fetch('karty.ukazka.json');
  await importovatText(await odpoved.text(), 'karty.ukazka.json');
}

async function exportovat() {
  if (!stav.data) return;
  const blob = new Blob([doTextu(stav.data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'karty.json' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  stav.aplikace.posledni_export = dnes();
  await db.ulozitAplikaci(stav.aplikace);
  stav.zprava = { typ: 'uspech', nadpis: 'Exportováno.', text: 'Soubor karty.json je ve stažených souborech.' };
  vykreslit();
}

async function smazatVse() {
  if (!confirm('Opravdu smazat karty a postup z tohoto zařízení? Pokud nemáš export, postup se ztratí.')) return;
  await db.smazat('karty');
  stav.data = null;
  stav.zprava = { typ: 'uspech', nadpis: 'Smazáno.', text: 'Karty z tohoto zařízení jsou pryč.' };
  vykreslit();
}

document.querySelectorAll('.spodni button').forEach((b) =>
  b.addEventListener('click', () => prepnout(b.dataset.obrazovka)));

/* ---------- offline (service worker) ---------- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const novy = reg.installing;
      novy?.addEventListener('statechange', () => {
        if (novy.state === 'installed' && navigator.serviceWorker.controller) {
          stav.zprava = { typ: 'uspech', nadpis: 'Je nová verze aplikace.', text: 'Načte se při příštím otevření.' };
          if (!document.body.classList.contains('v-lekci')) vykreslit();
          novy.postMessage('aktualizovat');
        }
      });
    });
  }).catch(() => { /* bez offline režimu */ });
}

/* ---------- start ---------- */
(async () => {
  try {
    stav.data = (await db.nacistKarty()) || null;
    stav.aplikace = await db.nacistAplikaci();
  } catch (e) {
    stav.aplikace = { ...db.VYCHOZI_APLIKACE };
    stav.zprava = { typ: 'chyba', nadpis: 'Úložiště nefunguje.', text: 'Prohlížeč nepovolil IndexedDB (třeba v anonymním okně). Postup se neuloží.' };
  }
  vykreslit();
})();
