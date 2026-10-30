import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

import { risolviNome, type MembroRisolvibile } from '@/calcolo/risoluzioneAzioni';
import type { RispostaInterpretazione } from '@/calcolo/schemaAzioni';
import type { AzioneRisolta } from '@/api/interpretazione';
import { BentoButton } from '@/components/BentoButton';
import { formattaEuro } from '@/lib/formato';

type Azione = RispostaInterpretazione['azioni'][number];

type Props = {
  azioni: RispostaInterpretazione['azioni'];
  membri: MembroRisolvibile[];
  confermando: boolean;
  onConferma: (azioniRisolte: AzioneRisolta[]) => void;
};

/** Nomi di persona citati in un'azione che vanno risolti a un membro (`acquisto` e `crea_impegno`). */
function nomiNecessari(azione: Azione): string[] {
  if (azione.tipo === 'acquisto') {
    const nomiDivisoTra = azione.diviso_tra && azione.diviso_tra.length > 0 ? azione.diviso_tra : [];
    return [azione.pagato_da, ...nomiDivisoTra];
  }
  if (azione.tipo === 'crea_impegno' && azione.assegnatoA !== null) {
    return [azione.assegnatoA];
  }
  return [];
}

/** Schermata di conferma delle azioni interpretate dall'AI: l'utente puo' rimuovere
 * azioni sbagliate e deve risolvere manualmente ogni nome ambiguo prima di confermare
 * (regola fondamentale: mai registrare spese senza conferma esplicita). */
export function ConfermaAzioni({ azioni, membri, confermando, onConferma }: Props) {
  const [rimosse, setRimosse] = useState<Set<number>>(new Set());
  const [scelteManuali, setScelteManuali] = useState<Record<string, string>>({});

  function risolvi(nome: string): string | null {
    const risultato = risolviNome(nome, membri);
    return risultato.stato === 'risolto' ? risultato.membroId : scelteManuali[nome] ?? null;
  }

  function rimuovi(indice: number) {
    setRimosse((precedente) => new Set(precedente).add(indice));
  }

  function scegli(nome: string, membroId: string) {
    setScelteManuali((precedente) => ({ ...precedente, [nome]: membroId }));
  }

  const azioniAttive = azioni
    .map((azione, indice) => ({ azione, indice }))
    .filter(({ indice }) => !rimosse.has(indice));

  if (azioniAttive.length === 0) {
    return (
      <View style={styles.contenitore}>
        <Text style={styles.messaggioVuoto}>Nessuna azione da confermare.</Text>
      </View>
    );
  }

  const nonRisolto = azioniAttive.some(({ azione }) =>
    nomiNecessari(azione).some((nome) => risolvi(nome) === null)
  );

  function conferma() {
    const azioniRisolte: AzioneRisolta[] = azioniAttive.map(({ azione }) => ({
      azione,
      idPerNome: new Map(nomiNecessari(azione).map((nome) => [nome, risolvi(nome) as string])),
    }));
    onConferma(azioniRisolte);
  }

  return (
    <View style={styles.contenitore}>
      {azioniAttive.map(({ azione, indice }) => (
        <View key={indice} style={styles.riga}>
          <View style={styles.rigaTesto}>
            {azione.tipo === 'aggiungi_articolo' ? (
              <Text style={[styles.testo, styles.rigaTesto2]}>Aggiungi: {azione.articoli.join(', ')}</Text>
            ) : azione.tipo === 'acquisto' ? (
              <RigaAcquisto azione={azione} membri={membri} risolvi={risolvi} scegli={scegli} scelteManuali={scelteManuali} />
            ) : azione.tipo === 'aggiungi_voce_lista' ? (
              <Text style={[styles.testo, styles.rigaTesto2]}>
                Aggiungi a "{azione.nomeLista}": {azione.voci.join(', ')}
              </Text>
            ) : azione.tipo === 'crea_impegno' ? (
              <RigaImpegno azione={azione} membri={membri} risolvi={risolvi} scegli={scegli} scelteManuali={scelteManuali} />
            ) : (
              // Nessun tipo rimanente oggi (azione: never): se un futuro tipo di azione
              // arriva qui senza un ramo dedicato, fallire rumorosamente invece di
              // mostrare una riga vuota e confermabile (CLAUDE.md regola 5).
              ((): never => {
                throw new Error(`Tipo di azione non gestito in ConfermaAzioni: ${(azione as Azione).tipo}`);
              })()
            )}
            <Pressable onPress={() => rimuovi(indice)} style={styles.rimuovi}>
              <Text style={styles.testoRimuovi}>X</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <BentoButton
        etichetta="Conferma"
        onPress={conferma}
        variante="primario"
        disabilitato={confermando || nonRisolto}
        caricando={confermando}
      />
    </View>
  );
}

function RigaAcquisto({
  azione,
  membri,
  risolvi,
  scegli,
  scelteManuali,
}: {
  azione: Azione & { tipo: 'acquisto' };
  membri: MembroRisolvibile[];
  risolvi: (nome: string) => string | null;
  scegli: (nome: string, membroId: string) => void;
  scelteManuali: Record<string, string>;
}) {
  const divisoTra = azione.diviso_tra && azione.diviso_tra.length > 0 ? azione.diviso_tra : null;
  // Nomi non risolti: mostrati come placeholder nella frase e con il
  // chip-selettore subito sotto (una View non puo' annidarsi in un Text).
  const nomiDaRisolvere = [...new Set([azione.pagato_da, ...(divisoTra ?? [])])].filter(
    (nome) => risolvi(nome) === null
  );
  const testoNome = (nome: string) => (risolvi(nome) !== null ? nome : '(scegli)');

  return (
    <View style={styles.rigaTesto2}>
      <Text style={styles.testo}>
        Registra spesa: {formattaEuro(Math.round(azione.importo_euro * 100))} pagati da{' '}
        {testoNome(azione.pagato_da)}, divisi tra{' '}
        {divisoTra === null ? 'tutti' : divisoTra.map(testoNome).join(', ')}
      </Text>
      {nomiDaRisolvere.map((nome) => (
        <SelettoreMembro key={nome} nome={nome} membri={membri} scelte={scelteManuali} onScegli={scegli} />
      ))}
    </View>
  );
}

function RigaImpegno({
  azione,
  membri,
  risolvi,
  scegli,
  scelteManuali,
}: {
  azione: Azione & { tipo: 'crea_impegno' };
  membri: MembroRisolvibile[];
  risolvi: (nome: string) => string | null;
  scegli: (nome: string, membroId: string) => void;
  scelteManuali: Record<string, string>;
}) {
  const nomiDaRisolvere =
    azione.assegnatoA !== null && risolvi(azione.assegnatoA) === null ? [azione.assegnatoA] : [];
  const testoNome = (nome: string) => (risolvi(nome) !== null ? nome : '(scegli)');
  const dataFormattata = format(new Date(`${azione.dataInizio}T00:00:00`), 'EEEE d MMMM yyyy', { locale: it });

  return (
    <View style={styles.rigaTesto2}>
      <Text style={styles.testo}>
        Crea impegno: "{azione.titolo}" il {dataFormattata}
        {azione.ora !== null ? ` alle ${azione.ora}` : ''}
        {azione.assegnatoA === null ? ', di gruppo' : `, assegnato a ${testoNome(azione.assegnatoA)}`}
      </Text>
      {nomiDaRisolvere.map((nome) => (
        <SelettoreMembro key={nome} nome={nome} membri={membri} scelte={scelteManuali} onScegli={scegli} />
      ))}
    </View>
  );
}

/** Riga di chip per risolvere manualmente un nome non trovato (o ambiguo) tra i membri. */
function SelettoreMembro({
  nome,
  membri,
  scelte,
  onScegli,
}: {
  nome: string;
  membri: MembroRisolvibile[];
  scelte: Record<string, string>;
  onScegli: (nome: string, membroId: string) => void;
}) {
  return (
    <View style={styles.selettore}>
      <Text style={styles.etichettaSelettore}>Chi è «{nome}»?</Text>
      <View style={styles.righeChip}>
        {membri.map((membro) => {
          const selezionato = scelte[nome] === membro.id;
          return (
            <Pressable
              key={membro.id}
              style={[styles.chip, selezionato && styles.chipSelezionato]}
              onPress={() => onScegli(nome, membro.id)}
            >
              <Text style={[styles.testoChip, selezionato && styles.testoChipSelezionato]}>{membro.nome}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    gap: 12,
  },
  messaggioVuoto: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
  },
  riga: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  rigaTesto: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  testo: {
    fontSize: 15,
    color: '#333',
  },
  rigaTesto2: {
    flex: 1,
  },
  rimuovi: {
    paddingHorizontal: 6,
  },
  testoRimuovi: {
    fontSize: 16,
    color: '#c0392b',
    fontWeight: '700',
  },
  selettore: {
    marginTop: 8,
  },
  etichettaSelettore: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  righeChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelezionato: {
    backgroundColor: '#2d6cdf',
    borderColor: '#2d6cdf',
  },
  testoChip: {
    fontSize: 14,
    color: '#333',
  },
  testoChipSelezionato: {
    color: '#fff',
  },
});
