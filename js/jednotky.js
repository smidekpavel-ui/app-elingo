// Mapa jednotek. Pole `tema` v karty.json zůstává beze změny,
// aplikace jen převádí podtémata (hlavně ústní a VUT karty) na jednotky.

export const JEDNOTKY = [
  { id: 'site', nazev: 'Sítě a vodiče', tema: 'sítě a vodiče' },
  { id: 'rcd', nazev: 'RCD a jištění', tema: 'RCD a jištění' },
  { id: 'uraz', nazev: 'Ochrana před úrazem', tema: 'ochrana před úrazem' },
  { id: 'koupelny', nazev: 'Koupelny a zvláštní prostory', tema: 'koupelny a zvláštní prostory' },
  { id: 'blesk', nazev: 'Ochrana před bleskem a přepětím', tema: 'ochrana před bleskem a přepětím (LPS, SPD)' },
  { id: 'prace', nazev: 'Kvalifikace a práce', tema: 'kvalifikace a práce' },
  { id: 'trakce', nazev: 'Trakce', tema: null },
  { id: 'revize', nazev: 'Revize, VTZ a dokumentace', tema: 'revize, VTZ a dokumentace' },
  { id: 'ostatni', nazev: 'Ostatní', tema: 'ostatní' },
];

// Podtémata → id jednotky.
export const PODTEMATA = {
  'uzemnění a blesk': 'blesk',
  'vnitřní a vnější ochrana před atmosférickým přepětím': 'blesk',
  'uzemnění': 'site',
  'vodiče PE/PEN': 'site',
  'barvy vodičů': 'site',
  'způsob uložení kabelových vedení': 'site',
  'druhy a popis elektrických sítí TN / IT / TT': 'site',
  'princip proudového chrániče': 'rcd',
  'charakteristiky jistících prvků': 'rcd',
  'hlídač izolačního stavu': 'rcd',
  'automatické odpojení': 'uraz',
  'automatické odpojení od zdroje': 'uraz',
  'impedanční smyčka': 'uraz',
  'ochrana malým napětím': 'uraz',
  'popis obvodů SELV / PELV / FELV': 'uraz',
  'oddělené obvody': 'uraz',
  'dvojitá izolace': 'uraz',
  'ochrana kryty a zábranami': 'uraz',
  'spotřebiče a přívody': 'uraz',
  'bezpečnost práce / zajištění elektrického zařízení pro práci bez napětí': 'prace',
  'bezpečné vzdálenosti': 'prace',
  'popis prací (podle pokynů / dohled / dozor)': 'prace',
  'lhůty revizí': 'revize',
  'rozdíl mezi UTZ a VTZ': 'revize',
  'zkoušky nouzového osvětlení': 'revize',
  'vnější vlivy': 'ostatni',
};

const podleTematu = new Map(JEDNOTKY.map((j) => [j.tema, j.id]));

/** Id jednotky pro kartu. Neznámé téma → „ostatní“. */
export function jednotkaKarty(karta) {
  const t = karta.tema || '';
  if (/trakce/i.test(t)) return 'trakce';
  return podleTematu.get(t) || PODTEMATA[t] || 'ostatni';
}
