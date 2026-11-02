-- Impedisce la creazione concorrente di due liste quasi identiche nello
-- stesso gruppo (es. due conferme ravvicinate della chat che nominano
-- entrambe una lista "ristoranti" non ancora esistente): senza questo
-- vincolo, il controllo "esiste già?" fatto da eseguiAzioniConfermate
-- (src/api/interpretazione.ts) è una semplice lettura-poi-scrittura, non
-- atomica.
--
-- L'espressione approssima normalizzaTesto() lato app (case/spazi
-- esterni), non la replica esattamente (niente normalizzazione Unicode
-- NFKC in SQL) - riduce la finestra della race quasi a zero, non la
-- elimina per ogni possibile variante di scrittura del nome.
create unique index liste_gruppo_nome_normalizzato_idx
  on public.liste (gruppo_id, lower(trim(nome)));
