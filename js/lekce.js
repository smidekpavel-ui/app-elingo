// Průběh lekce: pokládání otázek, vyhodnocení, jistota, zápis do karty.
import { dnes } from './datum.js';
import { zapsatOdpoved, odlozit, VYCHOZI_PAUZY } from './leitner.js';
import { vybratLekci, zamichatMoznosti, umimZVyberu, bezHodnoceni } from './vyber.js';
import { shoda } from './porovnani.js';
import { el } from './ui.js';

export const XP_ZA_LEKCI = 10;
export const XP_ZA_SPRAVNOU = 2;
export const HRANICE_USPECHU = 0.8; // stejně jako zkouška na TIČR

const NAZVY_TYPU = {
  test: 'Test',
  ustni: 'Ústní otázka',
  fakt: 'Fakt',
  priklad: 'Příklad',
  pripad: 'Případ z praxe',
  vysvetli: 'Vysvětli',
};

const JISTOTY = [
  { hodnota: 1, text: '1 = tipuju' },
  { hodnota: 2, text: '2 = asi' },
  { hodnota: 3, text: '3 = vím jistě' },
];

// Karta, kde se odpověď sady liší od platného předpisu (stav „…_vs_predpis“).
const jeSadaVsPredpis = (karta) => /_vs_predpis$/.test(karta.stav || '');

// Staré pojmy z vyhl. 50/1978, které se mohou objevit doslova v otázkách sady.
const STARE_POJMY = /seznámen|pracovník\w* znal|znal\w* s vyšší kvalifikací|osob\w* znal|pracovník\w* poučen/i;

/** Jak kartu položit. */
export function zpusobPolozeni(karta) {
  if (karta.typ === 'test') return umimZVyberu(karta) ? 'napis' : 'vyber';
  if (karta.typ === 'ustni') return bezHodnoceni(karta) ? 'zkus' : 'body';
  return 'otevrena'; // fakt, priklad, pripad, vysvetli: napiš odpověď a ohodnoť se sám
}

/** Vyhodnocení podle odškrtnutých klíčových bodů. */
export function vysledekZBodu(odskrtnuto, celkem) {
  if (celkem > 0 && odskrtnuto === celkem) return 'spravne';
  if (odskrtnuto > 0) return 'castecne';
  return 'spatne';
}

export function spocitatXP(spravnych) {
  return XP_ZA_LEKCI + XP_ZA_SPRAVNOU * spravnych;
}

/**
 * Spustí lekci.
 * @param {object} ctx { obsah, data, aplikace, jednotka, nazevJednotky, ulozit(): Promise, konec(vysledek) }
 */
export function spustitLekci(ctx) {
  const den = dnes();
  const karty = vybratLekci(ctx.data.karty, { jednotka: ctx.jednotka, dnes: den, videno: ctx.aplikace.videno || {} });
  const pauzy = ctx.data.nastaveni?.pauzy_dny || VYCHOZI_PAUZY;
  const lekce = { karty, index: 0, vysledky: [] };

  if (!karty.length) {
    ctx.obsah.replaceChildren(
      el('h2', {}, ctx.nazevJednotky),
      el('div', { class: 'karta' },
        el('p', {}, 'Dnes tu nic na řadě není. Karty, které jsi viděl v posledních 7 dnech, a odložené karty se zatím neukazují.'),
      ),
      el('button', { class: 'tlacitko', type: 'button', onclick: () => ctx.konec(null) }, 'Zpět na jednotky'),
    );
    return;
  }

  function hlavicka() {
    const hotovo = lekce.index / karty.length;
    return el('div', { class: 'lekce-hlavicka' },
      el('button', { class: 'zavrit', type: 'button', 'aria-label': 'Ukončit lekci', onclick: ukoncitPredcasne }, '✕'),
      el('div', { class: 'prubeh', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(karty.length), 'aria-valuenow': String(lekce.index) },
        el('span', { style: `width:${hotovo * 100}%` })),
      el('span', { class: 'tlumeny' }, `${lekce.index + 1}/${karty.length}`),
    );
  }

  function ukoncitPredcasne() {
    if (confirm('Ukončit lekci? Odpovědi, které už máš, zůstanou uložené. Lekce se ale nepočítá jako dokončená.')) ctx.konec(null);
  }

  function zobrazit(...deti) {
    ctx.obsah.replaceChildren(hlavicka(), ...deti.flat().filter(Boolean));
    window.scrollTo(0, 0);
  }

  function otazkaBlok(karta) {
    return el('div', { class: 'karta otazka' },
      el('div', { class: 'typ' }, NAZVY_TYPU[karta.typ] || karta.typ),
      el('p', { class: 'text-otazky' }, karta.otazka),
    );
  }

  /* ---------- 1. položení otázky ---------- */
  function polozit() {
    const karta = karty[lekce.index];
    const zpusob = zpusobPolozeni(karta);

    if (zpusob === 'vyber') {
      const moznosti = zamichatMoznosti(karta);
      zobrazit(
        otazkaBlok(karta),
        el('div', { class: 'moznosti' }, moznosti.map((m) =>
          el('button', {
            class: 'moznost', type: 'button',
            onclick: () => vyhodnotit(karta, { vysledek: m.spravna ? 'spravne' : 'spatne', zvolena: m, moznosti }),
          }, m.text))),
      );
      return;
    }

    const pole = el('textarea', {
      class: 'odpoved-pole', rows: zpusob === 'napis' ? '2' : '5',
      placeholder: zpusob === 'napis' ? 'Napiš odpověď…' : 'Napiš svoji odpověď (nebo ji řekni nahlas a jen pokračuj)…',
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    });
    const popis = {
      napis: 'Tuhle už umíš z výběru. Teď ji zkus napsat bez možností.',
      body: 'Vysvětli vlastními slovy. Potom si odškrtneš klíčové body, které jsi řekl.',
      zkus: 'Zkus vysvětlit. U této karty zatím chybí klíčové body, takže se nehodnotí.',
      otevrena: 'Napiš odpověď. Potom uvidíš celou odpověď a ohodnotíš se sám.',
    }[zpusob];
    const odeslat = () => {
      const text = pole.value;
      if (zpusob === 'napis') return vyhodnotit(karta, { vysledek: shoda(text, karta.odpoved) ? 'spravne' : 'spatne', napsano: text });
      return ukazatOdpoved(karta, zpusob, text);
    };
    zobrazit(
      otazkaBlok(karta),
      el('p', { class: 'tlumeny' }, popis),
      pole,
      el('button', { class: 'tlacitko', type: 'button', onclick: odeslat }, zpusob === 'napis' ? 'Zkontrolovat' : 'Ukázat odpověď'),
      zpusob === 'napis'
        ? el('button', { class: 'tlacitko druhe', type: 'button', onclick: () => vyhodnotit(karta, { vysledek: 'spatne', napsano: '' }) }, 'Nevím')
        : null,
    );
    pole.focus();
  }

  /* ---------- 2a. otevřené a ústní: ukázat odpověď, sebehodnocení ---------- */
  function ukazatOdpoved(karta, zpusob, napsano) {
    const mojeOdpoved = napsano.trim()
      ? el('div', { class: 'karta moje' }, el('div', { class: 'typ' }, 'Tvoje odpověď'), el('p', { class: 'predformat' }, napsano))
      : null;

    if (zpusob === 'zkus') {
      zobrazit(
        otazkaBlok(karta), mojeOdpoved,
        karta.odpoved ? odpovedBlok(karta, 'Odpověď z karty') : null,
        zdrojBlok(karta),
        el('button', { class: 'tlacitko', type: 'button', onclick: () => dalsi({ karta, vysledek: null }) }, 'Pokračovat'),
      );
      return;
    }

    if (zpusob === 'body') {
      const body = karta.klicove_body || [];
      const zaskrtnute = body.map(() => el('input', { type: 'checkbox' }));
      zobrazit(
        otazkaBlok(karta), mojeOdpoved,
        el('div', { class: 'karta' },
          el('div', { class: 'typ' }, 'Klíčové body: odškrtni, které jsi řekl'),
          el('div', { class: 'body' }, body.map((b, i) => el('label', { class: 'bod' }, zaskrtnute[i], el('span', {}, b)))),
        ),
        poznamkyBlok(karta),
        zdrojBlok(karta),
        el('button', {
          class: 'tlacitko', type: 'button',
          onclick: () => {
            const n = zaskrtnute.filter((c) => c.checked).length;
            vyhodnotit(karta, { vysledek: vysledekZBodu(n, body.length), body: `${n}/${body.length}`, napsano, uzZobrazeno: true });
          },
        }, 'Hotovo'),
      );
      return;
    }

    // otevřená: fakt, příklad, případ, vysvětli
    zobrazit(
      otazkaBlok(karta), mojeOdpoved,
      odpovedBlok(karta, 'Správná odpověď'),
      (karta.klicove_body || []).length
        ? el('div', { class: 'karta' }, el('div', { class: 'typ' }, 'Klíčové body'),
          el('ul', {}, karta.klicove_body.map((b) => el('li', {}, b))))
        : null,
      poznamkyBlok(karta),
      zdrojBlok(karta),
      el('p', { class: 'nadpis-volby' }, 'Jak jsi odpověděl?'),
      el('div', { class: 'tri' },
        el('button', { class: 'tlacitko', type: 'button', onclick: () => vyhodnotit(karta, { vysledek: 'spravne', napsano, uzZobrazeno: true }) }, 'Správně'),
        el('button', { class: 'tlacitko druhe castecne', type: 'button', onclick: () => vyhodnotit(karta, { vysledek: 'castecne', napsano, uzZobrazeno: true }) }, 'Částečně'),
        el('button', { class: 'tlacitko druhe spatne', type: 'button', onclick: () => vyhodnotit(karta, { vysledek: 'spatne', napsano, uzZobrazeno: true }) }, 'Špatně'),
      ),
    );
  }

  /* ---------- 2b. vyhodnocení + jistota ---------- */
  function vyhodnotit(karta, o) {
    const { vysledek } = o;
    const nadpis = { spravne: 'Správně!', castecne: 'Částečně', spatne: 'Špatně' }[vysledek];
    const odpovedi = [];

    if (o.moznosti) {
      odpovedi.push(el('div', { class: 'moznosti' }, o.moznosti.map((m) =>
        el('div', { class: `moznost vyhodnocena${m.spravna ? ' je-spravna' : ''}${m === o.zvolena && !m.spravna ? ' je-spatna' : ''}` },
          m.text, m === o.zvolena ? el('span', { class: 'tvoje' }, ' (tvoje volba)') : null))));
    }
    if (o.napsano != null && !o.uzZobrazeno) {
      odpovedi.push(el('div', { class: 'karta moje' }, el('div', { class: 'typ' }, 'Napsal jsi'), el('p', { class: 'predformat' }, o.napsano || '—')));
    }
    if (!o.uzZobrazeno && (!o.moznosti || jeSadaVsPredpis(karta))) odpovedi.push(odpovedBlok(karta, 'Správná odpověď'));

    let aktualni = vysledek;
    const uznat = zpusobPolozeni(karta) === 'napis' && vysledek === 'spatne' && o.napsano
      ? el('button', {
        class: 'tlacitko druhe', type: 'button',
        onclick: (e) => { aktualni = 'spravne'; e.currentTarget.replaceWith(el('p', { class: 'tlumeny' }, 'Uznáno jako správně.')); banner.className = 'vysledek spravne'; banner.firstChild.textContent = 'Správně!'; },
      }, 'Mám to správně jinými slovy (uznat)')
      : null;

    const banner = el('div', { class: `vysledek ${vysledek}` }, el('strong', {}, nadpis), o.body ? el('span', {}, ` ${o.body} bodů`) : null);

    zobrazit(
      otazkaBlok(karta),
      banner,
      odpovedi,
      uznat,
      o.uzZobrazeno ? null : poznamkyBlok(karta),
      o.uzZobrazeno ? null : zdrojBlok(karta),
      el('p', { class: 'nadpis-volby' }, 'Jak jistý sis byl?'),
      el('div', { class: 'tri' }, JISTOTY.map((j) =>
        el('button', {
          class: 'tlacitko druhe jistota', type: 'button',
          onclick: () => ulozitAPokracovat(karta, aktualni, j.hodnota, o),
        }, j.text))),
      el('button', {
        class: 'tlacitko odlozit', type: 'button',
        onclick: async () => {
          odlozit(karta, den);
          await ctx.ulozit();
          dalsi({ karta, vysledek: 'odlozeno' });
        },
      }, 'Odložit o měsíc'),
    );
  }

  async function ulozitAPokracovat(karta, vysledek, jistota, o) {
    const poznamka = o.body ? `klíčové body ${o.body} (Elingo)` : 'Elingo';
    zapsatOdpoved(karta, { vysledek, jistota, poznamka }, den, pauzy);
    await ctx.ulozit();
    dalsi({ karta, vysledek });
  }

  function dalsi(zaznam) {
    lekce.vysledky.push(zaznam);
    if (zaznam.vysledek === null) {
      ctx.aplikace.videno = { ...(ctx.aplikace.videno || {}), [zaznam.karta.id]: den };
      ctx.ulozit();
    }
    lekce.index++;
    if (lekce.index < karty.length) polozit();
    else konec();
  }

  /* ---------- 3. konec lekce ---------- */
  function konec() {
    const hodnocene = lekce.vysledky.filter((v) => v.vysledek && v.vysledek !== 'odlozeno');
    const spravnych = hodnocene.filter((v) => v.vysledek === 'spravne').length;
    const castecnych = hodnocene.filter((v) => v.vysledek === 'castecne').length;
    const podil = hodnocene.length ? spravnych / hodnocene.length : 0;
    const xp = spocitatXP(spravnych);
    const vysledek = { spravnych, castecnych, hodnocenych: hodnocene.length, podil, xp, jednotka: ctx.jednotka, den };

    ctx.obsah.replaceChildren(
      el('div', { class: 'konec-lekce' },
        el('div', { class: 'velky' }, hodnocene.length ? `${Math.round(podil * 100)} %` : '✓'),
        el('h2', {}, hodnocene.length && podil >= HRANICE_USPECHU ? 'Výborně, splněno!' : 'Lekce dokončena'),
        el('p', { class: 'tlumeny' },
          hodnocene.length
            ? `Správně ${spravnych} z ${hodnocene.length}` + (castecnych ? `, částečně ${castecnych}` : '') + '. Hranice je 80 %, stejně jako u zkoušky.'
            : 'V lekci byly jen karty bez hodnocení.'),
        el('p', { class: 'xp' }, `+${xp} XP`),
      ),
      el('button', { class: 'tlacitko', type: 'button', onclick: () => ctx.konec(vysledek) }, 'Pokračovat'),
    );
  }

  /* ---------- pomocné bloky ---------- */
  function odpovedBlok(karta, nadpis) {
    if (jeSadaVsPredpis(karta)) {
      const overit = /ověřit/i.test(karta.poznamka_overeni || '');
      return el('div', { class: 'dvojice' },
        el('div', { class: 'karta' }, el('div', { class: 'typ' }, 'Co chce sada otázek'), el('p', { class: 'predformat' }, karta.odpoved)),
        el('div', { class: 'karta norma' },
          el('div', { class: 'typ' }, 'Co říká platná norma', overit ? el('span', { class: 'stitek ucim' }, 'ověřit') : null),
          el('p', { class: 'predformat' }, karta.poznamka_overeni || '—')),
      );
    }
    return el('div', { class: 'karta' }, el('div', { class: 'typ' }, nadpis), el('p', { class: 'predformat' }, karta.odpoved || '—'));
  }

  function poznamkyBlok(karta) {
    const bloky = [];
    if (!jeSadaVsPredpis(karta) && karta.poznamka_overeni) {
      bloky.push(el('div', { class: 'karta norma' }, el('div', { class: 'typ' }, 'Poznámka k ověření'), el('p', {}, karta.poznamka_overeni)));
    }
    const terminologie = karta.terminologie
      || (STARE_POJMY.test(`${karta.otazka} ${Object.values(karta.moznosti || {}).join(' ')} ${karta.odpoved}`) ? ctx.data.nastaveni?.terminologie : null);
    if (terminologie) {
      bloky.push(el('div', { class: 'karta norma' }, el('div', { class: 'typ' }, 'Dnešní názvy (NV 194/2022)'), el('p', {}, terminologie)));
    }
    return bloky;
  }

  function zdrojBlok(karta) {
    return karta.zdroj ? el('p', { class: 'zdroj' }, el('strong', {}, 'Zdroj: '), karta.zdroj) : null;
  }

  polozit();
}
