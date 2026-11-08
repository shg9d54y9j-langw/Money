// Firebase-Konfiguration für die Cloud-Speicherung.
// Werte aus der Firebase-Konsole einfügen: Projekteinstellungen → Allgemein → „Meine Apps“ → Web-App → Konfiguration.
// Diese Werte sind kein Geheimnis (sie landen ohnehin im Browser). Geschützt werden die Daten
// durch die Anmeldung und die Sicherheitsregeln in firestore.rules.
// Solange hier null steht, speichert die App nur lokal auf dem Gerät.
export const firebaseConfig = null;

/* Beispiel:
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "dein-projekt.firebaseapp.com",
  projectId: "dein-projekt",
  storageBucket: "dein-projekt.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123",
};
*/
