import { supabase } from '@/lib/supabase';

export type FotoNotaPersonale = { id: string; percorso: string; url: string; creatoIl: string };

const BUCKET = 'note-personali';

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

export async function aggiungiFotoNota(params: { utenteId: string; notaId: string; uri: string }): Promise<void> {
  const ultimoSegmento = params.uri.split('.').pop();
  const estensione = ultimoSegmento && ultimoSegmento !== params.uri ? ultimoSegmento : 'jpg';
  const percorso = `${params.utenteId}/${params.notaId}/${Date.now()}.${estensione}`;

  const risposta = await fetch(params.uri);
  const blob = await risposta.blob();

  const { error: erroreUpload } = await supabase.storage.from(BUCKET).upload(percorso, blob, {
    contentType: blob.type,
  });
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
  if (erroreStorage) {
    throw erroreStorage;
  }

  const { error } = await supabase.from('foto_note_personali').delete().eq('id', params.id);
  if (error) {
    throw error;
  }
}
