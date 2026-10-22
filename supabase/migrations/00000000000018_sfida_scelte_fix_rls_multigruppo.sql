-- Corregge un difetto nelle policy RLS di 00000000000015/00000000000016:
-- il pattern `<colonna> = (select id from membri where utente_id =
-- auth.uid())`, usato per "questa riga è la mia", non specifica MAI il
-- gruppo. membri ha vincolo unique(gruppo_id, utente_id), non
-- unique(utente_id): un utente che appartiene a più di un gruppo (il caso
-- normale per questo progetto - CLAUDE.md vieta di assumere "due
-- persone", e la Home mostra esplicitamente "i TUOI gruppi" al plurale)
-- ha più righe in membri con lo stesso utente_id. La sottoquery
-- restituirebbe più di una riga e Postgres solleva un errore a runtime
-- ("more than one row returned by a subquery used as an expression"),
-- rompendo QUALUNQUE lettura/scrittura protetta da queste policy (intere
-- pagine sfida/notifiche) per chiunque sia in più di un gruppo.
--
-- Scoperto durante Task 17, progettando la campanella delle notifiche in
-- Home (una pagina multi-gruppo, che ha fatto notare il problema). Corretto
-- qui con drop+create delle policy coinvolte (stessa migration successiva
-- append-only già seguita per le altre correzioni di questa sessione),
-- ri-scrivendo ogni sottoquery scoped al gruppo giusto: via gruppo_id
-- diretto per notifiche, via join a sfide_turni/sfide_scelta per
-- sfide_voti, via join a sfide_scelta per sfide_opzioni.

drop policy sfide_opzioni_select on public.sfide_opzioni;
create policy sfide_opzioni_select on public.sfide_opzioni for select
  using (
    exists (select 1 from public.sfide_scelta s where s.id = sfide_opzioni.sfida_id and e_membro_di(s.gruppo_id))
    and (
      not personalizzata
      or proposta_da = (
        select m.id from public.membri m
        join public.sfide_scelta s2 on s2.gruppo_id = m.gruppo_id
        where s2.id = sfide_opzioni.sfida_id and m.utente_id = auth.uid()
      )
      or exists (
        select 1 from public.sfide_turni t
        where t.sfida_id = sfide_opzioni.sfida_id and t.stato <> 'in_corso'
      )
    )
  );

drop policy sfide_voti_select on public.sfide_voti;
create policy sfide_voti_select on public.sfide_voti for select
  using (
    membro_id = (
      select m.id from public.membri m
      join public.sfide_turni t on t.id = sfide_voti.turno_id
      join public.sfide_scelta s on s.id = t.sfida_id
      where m.gruppo_id = s.gruppo_id and m.utente_id = auth.uid()
    )
  );

drop policy sfide_voti_insert on public.sfide_voti;
create policy sfide_voti_insert on public.sfide_voti for insert
  with check (
    membro_id = (
      select m.id from public.membri m
      join public.sfide_turni t on t.id = sfide_voti.turno_id
      join public.sfide_scelta s on s.id = t.sfida_id
      where m.gruppo_id = s.gruppo_id and m.utente_id = auth.uid()
    )
    and exists (
      select 1 from public.sfide_turni t
      join public.sfide_scelta s on s.id = t.sfida_id
      where t.id = sfide_voti.turno_id and e_membro_di(s.gruppo_id)
    )
  );

-- notifiche ha gruppo_id direttamente in colonna: scoping più semplice,
-- niente join.
drop policy notifiche_select on public.notifiche;
create policy notifiche_select on public.notifiche for select
  using (
    destinatario_membro_id = (
      select id from public.membri where utente_id = auth.uid() and gruppo_id = notifiche.gruppo_id
    )
  );

drop policy notifiche_update on public.notifiche;
create policy notifiche_update on public.notifiche for update
  using (
    destinatario_membro_id = (
      select id from public.membri where utente_id = auth.uid() and gruppo_id = notifiche.gruppo_id
    )
  )
  with check (
    destinatario_membro_id = (
      select id from public.membri where utente_id = auth.uid() and gruppo_id = notifiche.gruppo_id
    )
  );
