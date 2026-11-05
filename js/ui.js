// Drobný pomocník na tvorbu prvků. Text se vkládá vždy jako text, nikdy jako HTML.
export function el(tag, vlastnosti = {}, ...deti) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(vlastnosti)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const d of deti.flat()) if (d != null && d !== false) e.append(d);
  return e;
}
