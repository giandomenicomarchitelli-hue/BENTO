-- Chi ha segnato un articolo della lista della spesa come comprato.
-- Stessa logica di creato_da: riferimento a membri, non a profili/utenti,
-- cosi' il nome resta leggibile anche se il membro esce dal gruppo. Si
-- azzera (on delete set null) se il membro viene rimosso, e va azzerato
-- esplicitamente dal client quando l'articolo torna "da_comprare".
alter table public.articoli_spesa
  add column comprato_da uuid references public.membri (id) on delete set null;
