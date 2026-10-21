-- Il trigger trg_faccende_aggiornata_il usa set_aggiornato_il(), che imposta
-- new.aggiornato_il = now(). Ma in public.faccende la colonna si chiama
-- aggiornata_il (non aggiornato_il): ogni UPDATE fallisce con
-- "record 'new' has no field aggiornato_il" prima ancora di arrivare alla RLS.
--
-- Soluzione: nuova funzione set_aggiornata_il() e ricollego il trigger.

create or replace function public.set_aggiornata_il()
returns trigger
language plpgsql
as $$
begin
  new.aggiornata_il = now();
  return new;
end;
$$;

create or replace trigger trg_faccende_aggiornata_il
before update on public.faccende
for each row execute function public.set_aggiornata_il();
