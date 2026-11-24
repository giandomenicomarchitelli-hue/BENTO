-- Colore della scheda, scelto dalla stessa palette usata per le caselle
-- personalizzabili (vedi src/theme/caselle.ts): nella striscia settimanale
-- il giorno si colora con il colore della sua scheda, per riconoscere a
-- colpo d'occhio "blu = dorso spalle tricipiti" senza aprire la scheda.
alter table public.allenamenti add column colore text not null default '#17A398';
