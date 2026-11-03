-- Bucket di storage per le foto delle note personali. Sempre PRIVATO (mai
-- public = true): ogni foto appartiene a un utente, nessuno esterno la vede.
-- La lettura lato client passa sempre da URL firmati a scadenza, mai da un URL
-- pubblico permanente.
--
-- file_size_limit/allowed_mime_types (10 MB, solo immagini): senza un
-- limite qui, né il client né il bucket impediscono di caricare un file
-- arbitrariamente grande. Stesso limite imposto anche lato client.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-personali', 'note-personali', false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

-- Percorso di ogni file: "<utente_id>/<nota_id>/<timestamp>.<estensione>" —
-- il primo segmento è sempre l'utente_id, mai nota_id. La RLS sopra controlla
-- solo quel primo segmento via e_proprietario_percorso().
--
-- Nota sulla cancellazione: eliminare una nota (on delete cascade su
-- foto_note_personali, vedi Task 1) rimuove le righe dal database ma NON
-- gli oggetti nel bucket — nessun trigger/Edge Function di pulizia in questa
-- fase. Limite noto: oggetti orfani restano nel bucket privato, invisibili
-- all'utente, nessun impatto funzionale. Un upgrade futuro (fuori scope qui)
-- userebbe una Edge Function che ascolta la cancellazione della nota e chiama
-- storage.remove() sul prefisso <utente_id>/<nota_id>/.
--
-- La funzione e_proprietario_percorso() differisce da e_membro_di_percorso()
-- (usata per carte-buoni): qui non c'è group_id, solo il confronto diretto
-- auth.uid() = v_utente_id. L'exception handler previene errori 22P02
-- dal cast se il percorso non è un uuid valido (es. path senza "/", o bucket
-- futuro con prefissi leggibili): restituisce false, non un errore, su una
-- tabella condivisa da ogni bucket del progetto.
create or replace function public.e_proprietario_percorso(percorso text)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_utente_id uuid;
begin
  begin
    v_utente_id := ((storage.foldername(percorso))[1])::uuid;
  exception when others then
    return false;
  end;
  return v_utente_id = auth.uid();
end;
$$;

create policy note_personali_storage_select on storage.objects for select
  using (bucket_id = 'note-personali' and e_proprietario_percorso(name));

create policy note_personali_storage_insert on storage.objects for insert
  with check (bucket_id = 'note-personali' and e_proprietario_percorso(name));

create policy note_personali_storage_delete on storage.objects for delete
  using (bucket_id = 'note-personali' and e_proprietario_percorso(name));
