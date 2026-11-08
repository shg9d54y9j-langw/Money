# Money – Ausgaben-Journal

Schlanke Web-App (HTML/CSS/JS, keine Abhängigkeiten) zum Erfassen von Ausgaben – auch für dich **und deine Partnerin**.

## Funktionen
- **Ausgaben erfassen**: Betrag, Kategorie, Datum, Notiz
- **Für wen?** Nur ich · Wir beide (50/50) · Nur Partnerin – plus **wer hat bezahlt**
- **Partner-Saldo**: zeigt, wer wem wie viel schuldet, inkl. „Ausgleichen“
- **Journal**: nach Tagen gruppiert, Suche & Filter (Kategorie, Für wen, Monat), Tippen zum Bearbeiten/Löschen
- **Auswertung**: Woche/Monat/Jahr, Ausgaben nach Bereichen (Donut), Verlauf, Aufteilung
- **Limits**: Tages-, Wochen-, Monatslimit mit Fortschrittsbalken, Vorwarnung ab 80 % und Warnung bei Überschreitung
- Wahlweise zählt für die Limits nur **dein Anteil** oder **alles, was du bezahlt hast**
- Backup als JSON exportieren/importieren, CSV-Export
- Als App installierbar (PWA), funktioniert offline; Daten bleiben lokal im Browser

## Starten
Beliebigen statischen Server im Ordner starten, z. B.:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen. Auf dem Handy: „Zum Home-Bildschirm hinzufügen“.
Alternativ lässt sich der Ordner direkt über GitHub Pages veröffentlichen.
