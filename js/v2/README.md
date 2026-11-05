# Místo pro 2. verzi (zatím NEDĚLAT)

Připravené body napojení, aby šlo 2. verzi přidat bez přestavby:

- **Týdenní zkušební test** (`zkouska.js`): mix témat, časomíra, hodnocení 80 %.
  Výběr karet přes `vybratLekci()` z `../vyber.js` bez parametru `jednotka`
  a s větší velikostí; hranice `HRANICE_USPECHU` je v `../lekce.js`.
  Výsledky ukládat do `aplikace.vysledky_zkousek` (IndexedDB, ne do karty.json).
- **Ústní režim s nahráváním hlasu** (`hlas.js`): MediaRecorder, nahrávky jen v IndexedDB.
  Hodnocení stejné jako u ústních karet (`vysledekZBodu()` v `../lekce.js`).
- **Odpočet do `datum_zkousky`**: hodnota už je v `nastaveni.datum_zkousky` v karty.json.
- **Připomínky**: Notification API + periodická synchronizace (na iPhonu jen u aplikace na ploše).
