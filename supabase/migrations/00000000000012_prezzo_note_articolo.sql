-- Prezzo e note facoltativi su un articolo/voce comprato: puro promemoria
-- sull'oggetto (es. marca, dettagli) - non alimentano i saldi, quelli
-- restano calcolati solo dalle spese (vedi src/calcolo/). Si azzerano
-- quando l'acquisto viene annullato (torna "da comprare"/non fatto).
alter table public.articoli_spesa
  add column prezzo_centesimi integer check (prezzo_centesimi is null or prezzo_centesimi >= 0),
  add column note text;

alter table public.voci_lista
  add column prezzo_centesimi integer check (prezzo_centesimi is null or prezzo_centesimi >= 0),
  add column note text;
