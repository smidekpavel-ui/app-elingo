# Elingo

Trénink na zkoušku revizního technika **E2A** (elektrická zařízení do 1000 V,
NV 194/2022 Sb., zákon 250/2021 Sb.) ve stylu Duolinga. Čisté HTML, CSS a
JavaScript, bez serveru a bez účtu. Funguje offline a jde přidat na plochu
telefonu.

## Důležité: otázky nejsou součástí aplikace

Sada otázek není veřejná. Proto:

- `karty.json` **není v repozitáři** (je v `.gitignore`) a nikdy se nenahrává na web,
- aplikace se nasadí prázdná, karty si nahraješ tlačítkem **Importovat karty.json**,
- karty a postup jsou uložené **jen v tvém zařízení** (IndexedDB v prohlížeči).

> ⚠️ Vymazáním dat prohlížeče (nebo odinstalací aplikace z plochy) se postup
> smaže. Pravidelně používej **Exportovat karty.json** a soubor si ulož.

Pro vývoj a testy je tu `karty.ukazka.json` s 5 vymyšlenými kartami
(jasně označenými „UKÁZKA“).

## Nasazení na GitHub Pages

1. Na GitHubu vytvoř repozitář `app-elingo` a nahraj do něj obsah této složky
   (bez `karty.json`, ten `.gitignore` sám vynechá).
2. V repozitáři otevři **Settings → Pages**.
3. U **Source** vyber **Deploy from a branch**, větev `main`, složka `/ (root)`, **Save**.
4. Za minutu až dvě bude aplikace na adrese
   `https://<tvůj-login>.github.io/app-elingo/`.

Před každým `git push` si zkontroluj `git status`, že v něm není `karty.json`.

## Přidání na plochu

Nejdřív otevři adresu aplikace v telefonu.

**Android (Chrome):** menu ⋮ → **Přidat na plochu** / **Nainstalovat aplikaci** → Přidat.

**iPhone (Safari):** tlačítko Sdílet (čtvereček se šipkou) → **Přidat na plochu** → Přidat.
Na iPhonu musí být aplikace otevřená v Safari, jinak tahle volba chybí.

Pak aplikaci spusť z plochy a v ní **Karty a záloha → Importovat karty.json**.
Na iPhonu má aplikace na ploše vlastní úložiště, takže karty importuj až v ní,
ne v Safari.

## Jak aplikace funguje

- **Jednotky:** 36 hodnot pole `tema` se převádí na 9 jednotek (`js/jednotky.js`).
  Soubor se tím nemění.
- **Lekce:** hlavní tlačítko „Smíchaná lekce“ vezme 8 otázek napříč všemi jednotkami a zamíchá je; případně si vybereš jednu jednotku (5–8 otázek). Všechny jednotky jsou hned přístupné, ⭐ = lekce v jednotce na ≥ 80 % správně.
- **Typy otázek:** výběr z možností (vždy zamíchané), psaná odpověď u karet, které
  už umíš z výběru (tolerantní k diakritice, mezerám, čárce/tečce), ústní otázky
  s odškrtáváním klíčových bodů, otevřené otázky se sebehodnocením.
  Ústní karty bez klíčových bodů jsou jen „zkus vysvětlit“, bez hodnocení.
- **Jistota:** 1 = tipuju, 2 = asi, 3 = vím jistě.
- **Leitner:** přihrádky podle `pauzy_dny`. Správně s jistotou 3 → o přihrádku výš,
  s jistotou 1–2 → zůstává, špatně nebo částečně → přihrádka 0.
- **Pestrost:** jedna karta nejvýš 1× za 7 dní (počítá se i historie z ranních otázek),
  proto se pokažená karta vrací za 7 dní. Odložená karta se vrátí až po měsíci.
- **Série:** den se počítá po dokončení aspoň jedné lekce, 1 den volna týdně sérii
  nepřeruší. Denní cíl a XP jsou jen v aplikaci, ne v souboru.
- **Import:** slučuje podle `id`. Text otázky, odpověď, klíčové body, zdroj a stav
  z importu, historie sjednocená bez duplicit (datum + výsledek), přihrádka a `pristi`
  od strany s nejnovějším záznamem. Odložených karet se nedotkne.
- **Export:** přesně stejný formát jako vstup (včetně `nastaveni`, `serie`
  a polí, kterým aplikace nerozumí). Záznamy z aplikace mají poznámku „Elingo“.

## Struktura

```
index.html, manifest.json, sw.js   aplikace, PWA, offline
css/app.css                        vzhled (světlý i tmavý režim)
js/app.js                          obrazovky
js/lekce.js                        průběh lekce
js/leitner.js                      přihrádky, odklad, pestrost
js/vyber.js                        výběr karet do lekce
js/slouceni.js                     import a export
js/serie.js                        série a odemykání jednotek
js/jednotky.js                     převod témat na jednotky
js/porovnani.js                    porovnání psané odpovědi
js/datum.js, db.js, ui.js, tema.js pomocné moduly
js/v2/                             místo pro 2. verzi
tests/                             testy (node --test)
karty.ukazka.json                  vymyšlené ukázkové karty
```

## Testy

```
npm test
KARTY_JSON=/cesta/k/karty.json npm test   # navíc ověří, že export tvého souboru je beze změny
```

Lokálně spustíš aplikaci třeba přes `python3 -m http.server` a otevřeš
`http://localhost:8000` (moduly JavaScriptu nefungují z `file://`).
