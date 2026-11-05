// Úvodní obrazovka: Elingo + „powered by“. Jednou za spuštění, klepnutím jde přeskočit.
// Logo partnera: stačí do icons/ dát soubor powered-by.svg (nebo upravit src v index.html).
export function spustitUvod() {
  const uvod = document.getElementById('uvod');
  if (!uvod) return;
  let uzVideno = false;
  try { uzVideno = sessionStorage.getItem('elingo-uvod') === '1'; sessionStorage.setItem('elingo-uvod', '1'); } catch { /* nic */ }
  const logo = document.getElementById('uvod-logo');
  const ukazatLogo = () => { logo.hidden = false; document.getElementById('uvod-text').hidden = true; };
  if (logo) { if (logo.complete && logo.naturalWidth) ukazatLogo(); else logo.addEventListener('load', ukazatLogo); }
  const skryt = () => { uvod.classList.add('pryc'); setTimeout(() => uvod.remove(), 500); };
  if (uzVideno) { uvod.remove(); return; }
  uvod.addEventListener('click', skryt);
  setTimeout(skryt, 2200);
}
