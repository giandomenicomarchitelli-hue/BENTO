-- Data/ora in cui una voce è stata spuntata, per mostrarla nella sezione
-- "Spuntati" (liste di gruppo e liste personali). Calcolata lato client
-- quando fatto passa a true (azzerata se si riapre la voce), non da un
-- trigger: stesso pattern già usato altrove nel progetto per i timestamp
-- che derivano da un'azione utente specifica, non da "qualcosa è cambiato".
alter table public.voci_lista add column fatto_il timestamptz;
alter table public.voci_lista_personali add column fatto_il timestamptz;
