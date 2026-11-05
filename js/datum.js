// Datumy vždy podle času Europe/Prague, ve formátu YYYY-MM-DD.

const fmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Prague',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Dnešní datum v Praze (YYYY-MM-DD). */
export function dnes(ted = new Date()) {
  return fmt.format(ted);
}

function naUTC(datum) {
  const [r, m, d] = datum.split('-').map(Number);
  return new Date(Date.UTC(r, m - 1, d));
}

function zUTC(d) {
  return d.toISOString().slice(0, 10);
}

/** Přičte dny ke kalendářnímu datu. */
export function pricistDny(datum, dny) {
  const d = naUTC(datum);
  d.setUTCDate(d.getUTCDate() + dny);
  return zUTC(d);
}

/** Přičte kalendářní měsíce (31. 1. + 1 měsíc = 28./29. 2.). */
export function pricistMesice(datum, mesice) {
  const d = naUTC(datum);
  const den = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + mesice);
  const posledni = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(den, posledni));
  return zUTC(d);
}

/** Počet dní mezi dvěma daty (b − a). */
export function rozdilDni(a, b) {
  return Math.round((naUTC(b) - naUTC(a)) / 86400000);
}

/** Pondělí týdne, do kterého datum patří. */
export function pondeli(datum) {
  const d = naUTC(datum);
  const denTydne = (d.getUTCDay() + 6) % 7; // po = 0
  return pricistDny(datum, -denTydne);
}

export function maxDatum(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}
