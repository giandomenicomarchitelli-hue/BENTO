-- Bucket di storage per le foto di Carte e buoni. Sempre PRIVATO (mai
-- public = true): un buono spesso ha un codice usa-e-getta, una carta
-- fedeltà spesso ha un codice a barre leggibile - la stessa attenzione
-- già data al segreto dei voti nel modulo Sfida delle scelte si
-- applica qui ai file, non solo alle righe del database. La lettura
-- lato client passa sempre da URL firmati a scadenza (vedi
-- src/api/carteBuoni.ts, urlFirmato), mai da un URL pubblico permanente.
--
-- file_size_limit/allowed_mime_types (10 MB, solo immagini): senza un
-- limite qui, né il client né il bucket impediscono di caricare un file
-- arbitrariamente grande - vedi anche il controllo lato client su
-- fileSize in app/(app)/carte-buoni/index.tsx, stesso limite.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'carte-buoni', 'carte-buoni', false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

-- Percorso di ogni file: "<gruppo_id>/<nome>.<estensione>" (vedi
-- generaPercorsoFile, src/calcolo/archiviazioneFile.ts) -
-- storage.foldername(name) restituisce i segmenti di cartella, il primo
-- è il gruppo_id. La stessa e_membro_di() già usata ovunque nel
-- progetto resta l'unico cancello, qui applicata al percorso invece che
-- a una colonna gruppo_id diretta (storage.objects è una tabella
-- condivisa tra tutti i bucket del progetto, per questo ogni policy
-- qui sotto è sempre scoperta anche da bucket_id = 'carte-buoni').
--
-- e_membro_di_percorso() invece di scrivere
-- "e_membro_di(((storage.foldername(name))[1])::uuid)" direttamente
-- nella policy: un percorso il cui primo segmento non è un uuid valido
-- (es. un path senza "/", o un bucket futuro con prefissi leggibili)
-- farebbe sollevare un errore 22P02 dal cast invece di restituire
-- "false" - un errore, non un diniego, su una tabella condivisa da ogni
-- bucket del progetto. Stessa classe di difetto già corretta altrove in
-- questo progetto (00000000000018, una sottoquery RLS che poteva
-- sollevare invece di restituire false): qui lo si evita alla fonte.
create or replace function public.e_membro_di_percorso(percorso text)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_gruppo_id uuid;
begin
  begin
    v_gruppo_id := ((storage.foldername(percorso))[1])::uuid;
  exception when others then
    return false;
  end;
  return e_membro_di(v_gruppo_id);
end;
$$;

create policy carte_buoni_storage_select on storage.objects for select
  using (bucket_id = 'carte-buoni' and e_membro_di_percorso(name));

create policy carte_buoni_storage_insert on storage.objects for insert
  with check (bucket_id = 'carte-buoni' and e_membro_di_percorso(name));

create policy carte_buoni_storage_delete on storage.objects for delete
  using (bucket_id = 'carte-buoni' and e_membro_di_percorso(name));
