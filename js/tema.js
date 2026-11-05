// Světlý / tmavý režim: auto (podle systému), nebo ručně. Drobnost → localStorage.
const KLIC = 'elingo-tema';

export function nacistTema() {
  try { return localStorage.getItem(KLIC) || 'svetly'; } catch { return 'svetly'; }
}

export function nastavitTema(tema) {
  try { localStorage.setItem(KLIC, tema); } catch { /* ignorovat */ }
  pouzitTema(tema);
}

export function pouzitTema(tema = nacistTema()) {
  if (tema === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = tema === 'tmavy' ? 'dark' : 'light';
}
