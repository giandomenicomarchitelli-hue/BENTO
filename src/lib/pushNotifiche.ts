import { Platform } from 'react-native';

import { salvaSottoscrizionePush } from '@/api/pushSubscriptions';

/** Solo web: Expo Go e le build native usano expo-notifications, non questo. */
export function pushSupportata(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function suSafariIOS(): boolean {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** true se il sito è stato aperto dall'icona aggiunta alla schermata Home (PWA), non dal browser. */
function suSchermataHome(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export type StatoSupportoPush = 'supportata' | 'ios_va_aggiunto_a_home' | 'non_supportata';

/**
 * A differenza di pushSupportata() (booleano secco, usato per decidere se
 * mostrare il flusso di attivazione), distingue il caso più comune di
 * mancato supporto - Safari su iPhone/iPad non ancora aggiunto alla
 * schermata Home, dove PushManager semplicemente non esiste finché non lo
 * si fa - da un reale "non supportato", per spiegarlo invece di sparire
 * in silenzio.
 */
export function statoSupportoPush(): StatoSupportoPush {
  if (pushSupportata()) {
    return 'supportata';
  }
  if (suSafariIOS() && !suSchermataHome()) {
    return 'ios_va_aggiunto_a_home';
  }
  return 'non_supportata';
}

/** true se il browser ha già concesso il permesso di notifica. */
export function pushGiaAttiva(): boolean {
  return pushSupportata() && Notification.permission === 'granted';
}

/** La chiave pubblica VAPID è in formato URL-safe base64: PushManager vuole un Uint8Array. */
function chiaveVapidComeBytes(chiaveBase64: string): Uint8Array {
  const base64 = (chiaveBase64 + '='.repeat((4 - (chiaveBase64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Registra il service worker, chiede il permesso e salva la sottoscrizione per questo utente. */
export async function attivaPushNotifiche(utenteId: string): Promise<void> {
  if (!pushSupportata()) {
    throw new Error('Le notifiche push non sono supportate su questo browser.');
  }

  const permesso = await Notification.requestPermission();
  if (permesso !== 'granted') {
    throw new Error('Permesso per le notifiche non concesso.');
  }

  const registrazione = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const chiaveVapid = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (chiaveVapid === undefined) {
    throw new Error('Configurazione push mancante (EXPO_PUBLIC_VAPID_PUBLIC_KEY).');
  }

  const sottoscrizioneEsistente = await registrazione.pushManager.getSubscription();
  const sottoscrizione =
    sottoscrizioneEsistente ??
    (await registrazione.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chiaveVapidComeBytes(chiaveVapid) as BufferSource,
    }));

  const json = sottoscrizione.toJSON();
  if (json.endpoint === undefined || json.keys?.p256dh === undefined || json.keys.auth === undefined) {
    throw new Error('Sottoscrizione push incompleta.');
  }

  await salvaSottoscrizionePush({
    utenteId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });
}
