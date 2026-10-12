import { Alert, Platform } from 'react-native';

/**
 * Chiede conferma prima di un'azione, in modo che funzioni sia su mobile
 * (Alert.alert nativo) sia su web — react-native-web non implementa
 * Alert.alert (è uno stub vuoto), quindi lì serve window.confirm.
 */
export function confermaAzione(
  titolo: string,
  messaggio: string,
  testoConferma: string
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${titolo}\n\n${messaggio}`));
  }

  return new Promise((resolve) => {
    Alert.alert(titolo, messaggio, [
      { text: 'Annulla', style: 'cancel', onPress: () => resolve(false) },
      { text: testoConferma, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
