import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type FotoNotaPersonale = { id: string; percorso: string; url: string; creatoIl: string };

const BUCKET = 'note-personali';

const TIPI_CONTENUTO: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
};

function tipoContenutoDaEstensione(estensione: string): string {
  return TIPI_CONTENUTO[estensione.toLowerCase()] ?? 'image/jpeg';
}

/**
 * expo-file-system non è supportato sul web (la sua classe `File` è uno
 * stub che avvisa e basta): su quella piattaforma si legge invece il
 * `File`/`Blob` nativo del browser che `expo-image-picker` espone già in
 * `ImagePickerAsset.file`. Su nativo si legge `uri` con `File.arrayBuffer()`
 * di expo-file-system - non con `fetch(uri)`, che è la fragilità nota
 * che questa scelta evita (blob.type può essere vuoto su file://).
 */
async function leggiBytes(uri: string, fileWeb?: Blob): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    if (!fileWeb) {
      throw new Error('File non disponibile per il caricamento sul web');
    }
    return fileWeb.arrayBuffer();
  }
  return new File(uri).arrayBuffer();
}

/** Riconosce un errore "file non trovato" per poter eliminare comunque la riga anche se il file è già assente. */
function fileNonTrovato(errore: { message?: string; statusCode?: string | number } | null): boolean {
  if (errore === null) {
    return false;
  }
  if (errore.statusCode === '404' || errore.statusCode === 404) {
    return true;
  }
  return errore.message?.toLowerCase().includes('not found') ?? false;
}

export async function listaFotoNota(notaId: string): Promise<FotoNotaPersonale[]> {
  const { data, error } = await supabase
    .from('foto_note_personali')
    .select()
    .eq('nota_id', notaId)
    .order('creato_il', { ascending: true });

  if (error) {
    throw error;
  }
  if (data.length === 0) {
    return [];
  }

  const percorsi = data.map((riga) => riga.percorso);
  const { data: urlFirmati, error: erroreUrl } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(percorsi, 3600);

  if (erroreUrl) {
    throw erroreUrl;
  }

  const urlPerPercorso = new Map(urlFirmati.map((u) => [u.path, u.signedUrl]));

  return data.map((riga) => ({
    id: riga.id,
    percorso: riga.percorso,
    url: urlPerPercorso.get(riga.percorso) ?? '',
    creatoIl: riga.creato_il,
  }));
}

export async function aggiungiFotoNota(params: {
  utenteId: string;
  notaId: string;
  uri: string;
  /** Solo sul web: il `File`/`Blob` nativo del browser (`ImagePickerAsset.file`). */
  fileWeb?: Blob;
  /** Tipo MIME riportato dall'asset scelto (`ImagePickerAsset.mimeType`), più affidabile dell'estensione del nome file. */
  mimeType?: string | null;
}): Promise<void> {
  const ultimoSegmento = params.uri.split('.').pop();
  const estensione = ultimoSegmento && ultimoSegmento !== params.uri ? ultimoSegmento : 'jpg';
  const percorso = `${params.utenteId}/${params.notaId}/${Date.now()}.${estensione}`;
  const contentType = params.mimeType ?? tipoContenutoDaEstensione(estensione);
  const bytes = await leggiBytes(params.uri, params.fileWeb);

  const { error: erroreUpload } = await supabase.storage.from(BUCKET).upload(percorso, bytes, { contentType });
  if (erroreUpload) {
    throw erroreUpload;
  }

  const { error } = await supabase.from('foto_note_personali').insert({ nota_id: params.notaId, percorso });
  if (error) {
    throw error;
  }
}

export async function eliminaFotoNota(params: { id: string; percorso: string }): Promise<void> {
  const { error: erroreStorage } = await supabase.storage.from(BUCKET).remove([params.percorso]);
  if (erroreStorage !== null && !fileNonTrovato(erroreStorage)) {
    throw erroreStorage;
  }

  const { error } = await supabase.from('foto_note_personali').delete().eq('id', params.id);
  if (error) {
    throw error;
  }
}
