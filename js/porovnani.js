// Tolerantní porovnání napsané odpovědi: bez ohledu na diakritiku,
// velikost písmen, mezery a desetinnou čárku/tečku.

export function normalizovat(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d)\s*[,.]\s*(\d)/g, '$1.$2') // 0,4 = 0.4 = 0, 4
    .replace(/[„“”"'‚‘’]/g, '')
    .replace(/[\s ]+/g, ' ')
    .replace(/\s*([.,;:!?()/=+\-–])\s*/g, '$1')
    .replace(/[.,;:!?]+$/g, '')
    .trim()
    .replace(/\s+/g, '');
}

export function shoda(napsano, spravne) {
  const a = normalizovat(napsano);
  return a.length > 0 && a === normalizovat(spravne);
}
