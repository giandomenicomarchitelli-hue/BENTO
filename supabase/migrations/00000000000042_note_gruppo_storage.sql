-- Bucket di storage per le foto delle note di gruppo. Sempre PRIVATO, URL
-- firmati a scadenza lato client (vedi src/api/fotoNoteGruppo.ts), stesso
-- schema del bucket "note-personali".
--
-- Percorso di ogni file: "<gruppo_id>/<nota_id>/<timestamp>.<estensione>"
-- - e_membro_di_percorso() (gia' definita in 00000000000021 per
-- carte-buoni) e' il cancello giusto qui: stesso formato di percorso,
-- primo segmento = gruppo_id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-gruppo', 'note-gruppo', false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

create policy note_gruppo_storage_select on storage.objects for select
  using (bucket_id = 'note-gruppo' and e_membro_di_percorso(name));

create policy note_gruppo_storage_insert on storage.objects for insert
  with check (bucket_id = 'note-gruppo' and e_membro_di_percorso(name));

create policy note_gruppo_storage_delete on storage.objects for delete
  using (bucket_id = 'note-gruppo' and e_membro_di_percorso(name));
