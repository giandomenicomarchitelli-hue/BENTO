/** Messaggio leggibile da un errore di rete/Supabase, senza assumere una forma precisa. */
export function messaggioErrore(errore: unknown): string {
  if (errore instanceof Error && errore.message.trim() !== '') {
    return errore.message;
  }
  return 'Qualcosa è andato storto. Riprova.';
}
