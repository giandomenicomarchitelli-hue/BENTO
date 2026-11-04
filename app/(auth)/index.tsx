import { Redirect } from 'expo-router';

// (auth)/ non ha una schermata propria per "/" - da SDK 58 un gruppo senza
// index.tsx non risolve più l'URL radice (serviva initialRouteName su
// Stack, non più tipizzato/affidabile). Stesso pattern già usato altrove
// nell'app (es. Homepage -> /crea-profilo) per un redirect immediato.
export default function AuthIndex() {
  return <Redirect href="/accedi" />;
}
