-- unisciti_a_gruppo() non riattivava una vecchia iscrizione se chi si
-- univa l'aveva gia' lasciata in passato (uscito_il valorizzato): il
-- vincolo unique (gruppo_id, utente_id) fa scattare "on conflict do
-- nothing", quindi il COALESCE trovava semplicemente la riga esistente
-- senza mai azzerarne uscito_il. La RPC restituiva un id "di successo",
-- ma il membro restava fuori dal gruppo (e_membro_di la ignora comunque),
-- quindi il gruppo non ricompariva mai nell'elenco. Scoperto perche' un
-- utente non riusciva piu' a rientrare in un gruppo lasciato per errore.
create or replace function public.unisciti_a_gruppo(
  p_codice_invito text,
  p_nome text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_gruppo_id uuid;
  v_membro_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;

  select id into v_gruppo_id from public.gruppi where codice_invito = p_codice_invito;
  if v_gruppo_id is null then
    raise exception 'Codice invito non valido';
  end if;

  insert into public.membri (gruppo_id, utente_id, nome)
  values (v_gruppo_id, auth.uid(), p_nome)
  on conflict (gruppo_id, utente_id) do update
    set uscito_il = null, nome = excluded.nome
  returning id into v_membro_id;

  return v_membro_id;
end;
$$;
