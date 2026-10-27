import { aggiungiMesiStessoGiorno, istanteImpegno, calcolaOccorrenzeMancantiImpegno } from './ricorrenzaImpegni';

describe('aggiungiMesiStessoGiorno', () => {
  it('somma un mese mantenendo lo stesso giorno', () => {
    expect(aggiungiMesiStessoGiorno('2026-03-15', 1)).toBe('2026-04-15');
  });

  it('clampa al 28 quando il giorno 31 cade in febbraio (anno non bisestile)', () => {
    expect(aggiungiMesiStessoGiorno('2027-01-31', 1)).toBe('2027-02-28');
  });

  it('clampa al 29 quando il giorno 31 cade in febbraio bisestile', () => {
    expect(aggiungiMesiStessoGiorno('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('torna al 31 quando il mese successivo è di nuovo lungo', () => {
    expect(aggiungiMesiStessoGiorno('2026-01-31', 2)).toBe('2026-03-31');
  });
});

describe('istanteImpegno', () => {
  it('con ora nulla restituisce la mezzanotte locale del fuso orario', () => {
    const istante = istanteImpegno('2026-06-15', null, 'Europe/Rome');
    // 2026-06-15 00:00 CEST (UTC+2) = 2026-06-14T22:00:00.000Z
    expect(istante).toBe('2026-06-14T22:00:00.000Z');
  });

  it('con ora impostata restituisce quell\'istante locale esatto', () => {
    const istante = istanteImpegno('2026-06-15', '14:30', 'Europe/Rome');
    expect(istante).toBe('2026-06-15T12:30:00.000Z');
  });
});

const FUSO = 'Europe/Rome';

describe('calcolaOccorrenzeMancantiImpegno', () => {
  it('una_tantum genera una sola occorrenza alla data di inizio', () => {
    const def = { frequenza: 'una_tantum' as const, intervalloRicorrenza: null, dataInizio: '2026-11-15', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2026-12-31', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2026-11-15']);
  });

  it('una_tantum non genera nulla se già generata', () => {
    const def = { frequenza: 'una_tantum' as const, intervalloRicorrenza: null, dataInizio: '2026-11-15', ora: null };
    expect(calcolaOccorrenzeMancantiImpegno(def, '2026-11-15', '2026-12-31', FUSO)).toEqual([]);
  });

  it('settimanale genera ogni 7 giorni a partire dalla data di inizio, non dalla settimana contenente', () => {
    const def = { frequenza: 'settimanale' as const, intervalloRicorrenza: null, dataInizio: '2026-11-04', ora: null }; // un mercoledì
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2026-11-25', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
  });

  it('mensile mantiene il giorno del mese e clampa nei mesi corti', () => {
    const def = { frequenza: 'mensile' as const, intervalloRicorrenza: null, dataInizio: '2026-12-31', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2027-03-01', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2026-12-31', '2027-01-31', '2027-02-28']);
  });

  it('personalizzata rispetta intervalloRicorrenza in giorni', () => {
    const def = { frequenza: 'personalizzata' as const, intervalloRicorrenza: 10, dataInizio: '2026-11-01', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2026-11-25', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2026-11-01', '2026-11-11', '2026-11-21']);
  });

  it('chiamare due volte con lo stesso ultimaDataGenerata produce lo stesso risultato (idempotenza del calcolo)', () => {
    const def = { frequenza: 'giornaliera' as const, intervalloRicorrenza: null, dataInizio: '2026-11-01', ora: null };
    const a = calcolaOccorrenzeMancantiImpegno(def, '2026-11-05', '2026-11-10', FUSO);
    const b = calcolaOccorrenzeMancantiImpegno(def, '2026-11-05', '2026-11-10', FUSO);
    expect(a).toEqual(b);
  });

  it('rispetta il tetto MAX_PERIODI_PER_SINCRONIZZAZIONE', () => {
    const def = { frequenza: 'giornaliera' as const, intervalloRicorrenza: null, dataInizio: '2020-01-01', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2026-12-31', FUSO);
    expect(risultato.length).toBeLessThanOrEqual(60);
  });

  it('ogni occorrenza porta anche l\'istante calcolato con istanteImpegno', () => {
    const def = { frequenza: 'una_tantum' as const, intervalloRicorrenza: null, dataInizio: '2026-11-15', ora: '09:00' };
    const [occorrenza] = calcolaOccorrenzeMancantiImpegno(def, null, '2026-12-31', FUSO);
    expect(occorrenza.istanteISO).toBe('2026-11-15T08:00:00.000Z');
  });

  it('una_tantum oltre l\'orizzonte genera comunque la sua unica occorrenza', () => {
    // dataInizio è oltre orizzonteISO: senza una generazione futura in
    // elenco, un impegno così non sarebbe mai visibile/editabile/eliminabile
    // (la UI è guidata solo dalle occorrenze, non c'è un elenco di impegni).
    const def = { frequenza: 'una_tantum' as const, intervalloRicorrenza: null, dataInizio: '2027-06-01', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, null, '2026-12-31', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2027-06-01']);
  });

  it('riparte da dataInizio quando ultimaDataGenerata è un cursore scaduto (data_inizio spostata avanti)', () => {
    // ultimaDataGenerata (vecchio cursore) precede la nuova dataInizio:
    // deve riallinearsi su dataInizio invece di continuare la serie dal
    // vecchio cursore, stantio dopo la modifica.
    const def = { frequenza: 'settimanale' as const, intervalloRicorrenza: null, dataInizio: '2026-12-01', ora: null };
    const risultato = calcolaOccorrenzeMancantiImpegno(def, '2026-11-04', '2026-12-22', FUSO);
    expect(risultato.map((r) => r.dataISO)).toEqual(['2026-12-01', '2026-12-08', '2026-12-15', '2026-12-22']);
  });
});
