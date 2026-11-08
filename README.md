# Money – Ausgaben-Journal

Schlanke Web-App (HTML/CSS/JS, ohne Build-Schritt) zum Erfassen von Ausgaben, auch für dich **und deine Partnerin**.
Mit Firebase werden alle Daten automatisch in der Cloud gespeichert und sind auf jedem Gerät aktuell.

## Funktionen
- **Ausgaben erfassen**: Betrag, Kategorie, Datum, Notiz
- **Für wen?** Nur ich · Wir beide (50/50) · Nur Partnerin, dazu **wer bezahlt hat**
- **Partner-Saldo**: zeigt, wer wem wie viel schuldet, mit „Ausgleichen“
- **Journal**: nach Tagen gruppiert, mit Suche und Filtern (Kategorie, für wen, Monat); Tippen öffnet Bearbeiten/Löschen
- **Auswertung**: Woche/Monat/Jahr, Ausgaben nach Bereichen, Verlauf, Aufteilung
- **Limits**: Tages-, Wochen- und Monatslimit; Vorwarnung ab 80 %, Warnung beim Überschreiten
- **Cloud-Speicherung** (Firebase): Anmeldung mit E-Mail und Passwort, Synchronisation in Echtzeit, funktioniert auch offline
- Backup als JSON exportieren/importieren, CSV-Export
- Als App auf dem Home-Bildschirm installierbar (PWA)

Ohne Firebase-Konfiguration speichert die App nur lokal im Browser.

---

## Einrichtung: Cloud (Firebase), einmalig, ca. 10 Minuten

1. **Projekt anlegen**: <https://console.firebase.google.com> → „Projekt hinzufügen“ → Namen vergeben (z. B. `money`).
   Google Analytics wird nicht benötigt. Der kostenlose „Spark“-Tarif reicht völlig.
2. **Anmeldung aktivieren**: Links *Build → Authentication* → „Jetzt starten“ → Reiter *Sign-in method* →
   **E-Mail/Passwort** aktivieren → Speichern.
3. **Datenbank anlegen**: *Build → Firestore Database* → „Datenbank erstellen“ → Standort `eur3 (europe-west)` →
   „Im Produktionsmodus starten“.
4. **Sicherheitsregeln setzen**: In Firestore den Reiter *Regeln* öffnen, den Inhalt durch den der Datei
   [`firestore.rules`](firestore.rules) ersetzen und **Veröffentlichen**. Dann kann jeder nur seine eigenen Daten sehen.
5. **Web-App registrieren**: Zahnrad → *Projekteinstellungen* → unten „Meine Apps“ → Symbol `</>` (Web) →
   Namen eingeben (Hosting **nicht** ankreuzen) → „App registrieren“.
   Es erscheint ein Block `const firebaseConfig = { ... }`.
6. **Konfiguration eintragen**: In [`firebase-config.js`](firebase-config.js) `null` durch dieses Objekt ersetzen, also z. B.:
   ```js
   export const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "money-xyz.firebaseapp.com",
     projectId: "money-xyz",
     storageBucket: "money-xyz.firebasestorage.app",
     messagingSenderId: "123...",
     appId: "1:123...:web:abc...",
   };
   ```
   Diese Werte sind **kein Passwort**: Sie stehen bei jeder Firebase-Web-App öffentlich im Browser.
   Geschützt sind die Daten durch die Anmeldung und die Regeln aus Schritt 4.
7. **Domain freigeben**: *Authentication → Settings → Autorisierte Domains* → „Domain hinzufügen“ →
   `DEIN-GITHUB-NAME.github.io`.

## Einrichtung: Veröffentlichen auf GitHub Pages

1. Im Repository auf GitHub: *Settings → Pages* → bei **Source** „**GitHub Actions**“ wählen.
2. Bei jedem Push auf `main` (oder den aktuellen Arbeits-Branch) veröffentlicht der Workflow
   [`.github/workflows/pages.yml`](.github/workflows/pages.yml) die App automatisch.
   Ein manueller Start ist unter *Actions → „Auf GitHub Pages veröffentlichen“ → Run workflow* möglich.
3. Die Adresse lautet dann `https://DEIN-GITHUB-NAME.github.io/Money/`.

Hinweise:
- GitHub Pages ist bei **privaten** Repositories nur mit einem bezahlten GitHub-Tarif verfügbar. Sonst muss das Repository öffentlich sein.
  Das ist unbedenklich, weil deine Ausgaben nicht im Repository liegen, sondern geschützt in Firebase.
- Falls die Veröffentlichung mit „Branch is not allowed to deploy to github-pages“ scheitert:
  *Settings → Environments → github-pages* → den Branch zulassen, oder einfach nach `main` mergen.

## Nutzung
1. Adresse auf dem Handy öffnen → **Neues Konto erstellen** (E-Mail + Passwort).
2. Teilen-Menü → **Zum Home-Bildschirm** hinzufügen, dann verhält sich die App wie eine normale App.
3. Auf weiteren Geräten mit demselben Konto anmelden. Alles ist sofort synchron.

Waren vorher schon Ausgaben lokal gespeichert, fragt die App beim ersten Anmelden, ob sie in die Cloud übernommen werden sollen.

## Lokal starten (zum Testen)
```bash
python3 -m http.server 8000
```
Dann `http://localhost:8000` öffnen (`localhost` ist in Firebase standardmäßig freigegeben).
