# Progetto: app per gestire casa condivisa (spesa, conti, faccende)

## Cosa fa l'app
App mobile (iPhone e Android) per gruppi di persone che condividono la vita quotidiana:
coppie, coinquilini, uffici, viaggi tra amici. Le funzioni principali sono:
- lista della spesa condivisa
- spese condivise con calcolo automatico di chi deve cosa a chi
- faccende con peso (punti/percentuale) e, in futuro, sfida tra i membri
- input in linguaggio naturale, anche vocale (fase 2): l'utente parla o scrive
  e l'app capisce cosa fare

Esempio: "ho comprato il sale e la pasta e ho speso 4 euro" ->
toglie sale e pasta dalla lista, registra una spesa da 4 €, divisa in parti uguali.

## Stack
- App: React Native + Expo + TypeScript
- Backend: Supabase (Postgres, Auth, Realtime, Edge Functions)
- Interpretazione frasi: API di Claude, chiamata SOLO da una Edge Function (mai dall'app)
- Trascrizione audio (fase 2): Whisper o Deepgram, anch'essa lato server

## Regole fondamentali
1. **L'AI interpreta, il codice calcola.** Divisioni, saldi, punteggi e percentuali
   sono sempre calcolati con codice deterministico. Mai dall'LLM.
2. **Importi in centesimi (interi).** Mai float per i soldi.
3. **I saldi si calcolano dalle spese**, non si salvano a mano. Lo storico è la fonte di verità.
4. **Il gruppo è l'unità di base.** Ogni dato appartiene a un gruppo (casa, viaggio,
   ufficio) con N membri. Non scrivere mai codice che assuma "due persone".
5. **Conferma prima di registrare soldi.** Se l'interpretazione dell'AI è ambigua
   o riguarda importi, mostra una schermata di conferma e permetti di correggere.
6. **Ogni operazione è annullabile** e tracciata nello storico.
7. **La chiave API di Claude non va mai nell'app.** Solo variabili d'ambiente lato server.
8. **Privacy:** l'audio va cancellato dopo la trascrizione. Nessun dato personale nei log.

## Modello dati (bozza)
- `gruppi` (id, nome, tipo)
- `membri` (id, gruppo_id, utente_id, nome)
- `articoli_spesa` (id, gruppo_id, nome, stato: da_comprare | comprato)
- `spese` (id, gruppo_id, pagato_da, importo_centesimi, descrizione, data)
- `quote_spesa` (spesa_id, membro_id, quota_centesimi): come si divide ogni spesa
- `faccende` (id, gruppo_id, nome, peso)
- `faccende_completate` (id, faccenda_id, membro_id, data)
- Vista/funzione `saldi`: calcolata da spese e quote (chi deve cosa a chi)

## Formato JSON delle azioni (interpretazione)
L'LLM restituisce solo JSON valido, validato con uno schema (es. Zod) prima di usarlo:
```json
{
  "azioni": [
    { "tipo": "aggiungi_articolo", "articoli": ["sale"] },
    { "tipo": "acquisto", "articoli": ["sale", "pasta"], "importo_euro": 4,
      "pagato_da": "marito", "diviso_tra": ["marito", "moglie"] }
  ],
  "ambiguo": false,
  "domanda_chiarimento": null
}
```
Se qualcosa non è chiaro: `ambiguo: true` e una domanda da fare all'utente.

## Convenzioni di codice
- TypeScript strict, niente `any`
- Funzioni di calcolo (divisioni, saldi) in file separati e con test unitari
- Commenti e testi dell'interfaccia in italiano
- Commit piccoli e frequenti, messaggi chiari

## Roadmap (una fase alla volta, non anticipare)
1. Gruppo da 2 persone, lista della spesa e spese con saldo, solo input testuale
2. Input vocale + interpretazione con Claude
3. Faccende, punteggi e sfida
4. Gruppi con più membri e altri scenari (viaggio, coinquilini, ufficio)

## Come lavorare con me
- Prima proponi un piano, poi implementa a piccoli passi
- Dopo ogni passo dimmi come testarlo sul telefono (Expo Go)
- Se una scelta tecnica è importante, spiegala in due righe prima di farla
