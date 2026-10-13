-- Identita' utente globale e fissa: un nome utente scelto una volta sola
-- alla registrazione (unico in tutto il sistema, mai piu' modificabile) e
-- un codice utente univoco generato automaticamente. E' questo nome -
-- non un nome scelto per ogni gruppo - che gli altri membri vedono.

create table public.profili (
  utente_id uuid primary key references auth.users(id) on delete cascade,
  nome_utente text not null unique
    check (char_length(trim(nome_utente)) between 3 and 30)
    check (nome_utente ~ '^[a-zA-Z0-9_]+$'),
  codice_utente text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  creato_il timestamptz not null default now()
);

alter table public.profili enable row level security;

-- Il nome utente e' pensato per essere visibile come un handle: chiunque
-- sia autenticato puo' leggere qualunque profilo (serve anche solo per
-- vedere i nomi degli altri membri nei gruppi condivisi).
create policy profili_select on public.profili for select
  using (auth.uid() is not null);

-- Si puo' creare solo il proprio profilo, una volta sola (la primary key
-- su utente_id impedisce i duplicati). Nessuna policy di update: il nome
-- utente non si cambia piu' dopo la creazione.
create policy profili_insert_self on public.profili for insert
  with check (utente_id = auth.uid());

grant select, insert on public.profili to authenticated;

-- membri.nome resta come copia del nome utente al momento dell'adesione
-- (evita di dover unire a profili ovunque si mostri il nome di un membro),
-- ma non deve piu' poter cambiare: un trigger lo blocca a livello DB,
-- indipendentemente da cosa fa il client.
create or replace function public.blocca_modifica_nome_membro()
returns trigger
language plpgsql
as $$
begin
  if new.nome <> old.nome then
    raise exception 'Il nome di un membro non si può modificare: deriva dal nome utente del profilo.';
  end if;
  return new;
end;
$$;

create trigger trg_blocca_modifica_nome_membro
before update on public.membri
for each row execute function public.blocca_modifica_nome_membro();

-- unisciti_a_gruppo() prendeva il nome da un parametro scelto dall'utente
-- ad ogni adesione: ora lo legge dal profilo, che deve gia' esistere.
drop function if exists public.unisciti_a_gruppo(text, text);

create or replace function public.unisciti_a_gruppo(p_codice_invito text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_gruppo_id uuid;
  v_membro_id uuid;
  v_nome text;
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;

  select nome_utente into v_nome from public.profili where utente_id = auth.uid();
  if v_nome is null then
    raise exception 'Devi prima creare il tuo profilo';
  end if;

  select id into v_gruppo_id from public.gruppi where codice_invito = p_codice_invito;
  if v_gruppo_id is null then
    raise exception 'Codice invito non valido';
  end if;

  insert into public.membri (gruppo_id, utente_id, nome)
  values (v_gruppo_id, auth.uid(), v_nome)
  on conflict (gruppo_id, utente_id) do update
    set uscito_il = null
  returning id into v_membro_id;

  return v_membro_id;
end;
$$;
