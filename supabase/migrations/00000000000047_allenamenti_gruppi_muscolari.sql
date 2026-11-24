-- Gruppi muscolari coperti da una scheda (petto, dorso, spalle, bicipiti,
-- tricipiti...), per filtrare le schede nella vista Allenamenti. Testo
-- libero in un array, non un enum: lasciare aperto a nuovi gruppi senza
-- una migration per ognuno, stesso approccio di allenamenti.giorni_settimana.
alter table public.allenamenti add column gruppi_muscolari text[] not null default '{}';
