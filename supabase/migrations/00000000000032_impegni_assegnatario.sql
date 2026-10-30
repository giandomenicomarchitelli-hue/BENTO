alter table public.impegni
  add column assegnato_a uuid references public.membri (id) on delete set null;
