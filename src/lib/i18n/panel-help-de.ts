/** German titles and explanations for the contextual panel-help dialogs. */
export const panelHelpGerman = {
  withdrawal: {
    title: "Auszahlung und Risiko",
    paragraphs: [
      "Die Kurve zeigt den Zusammenhang zwischen jährlicher Auszahlung und lebenslangem Verarmungsrisiko im analytischen CE-Modell. Der Punkt markiert das gewählte Risiko beziehungsweise die gewählte Auszahlung und den jeweils daraus berechneten Wert.",
      "Die Kurve gilt für die unbeschränkte Strategie. Ergebnisse für die GM-Sterblichkeit und die projizierte Strategie werden gesondert angezeigt.",
    ],
  },
  gm: {
    title: "Risiko unter GM-Sterblichkeit",
    paragraphs: [
      "Diese Karte vergleicht den Referenzwert des unbeschränkten CE-Modells mit dem simulierten Risiko unter dem angepassten Gompertz–Makeham-Modell. Bei einer vorgegebenen Auszahlung ist der CE-Wert das zugehörige Modellrisiko.",
      "Bei aktivierter Projektion zeigen gepaarte Pfade zusätzlich das projizierte Ergebnis und seine Differenz zum unbeschränkten Ergebnis. Die Schätzungen reichen bis zum Simulationshorizont; die GM-Überlebenswahrscheinlichkeit kann darüber hinaus positiv sein. Das Intervall beschreibt nur die Monte-Carlo-Unsicherheit.",
    ],
  },
  capital: {
    title: "Was bewirkt die Risikoübernahme?",
    paragraphs: [
      "Vergleichen Sie für dieselbe jährliche Auszahlung Ihr Anfangskapital mit dem modellierten Kapitalbedarf ohne Anlagerisiko. Die Differenz wird als Kapitalentlastung oder gegebenenfalls als Überschuss angezeigt.",
      "Die Tabelle zeigt zudem den Kapitalbedarf bei benachbarten CE-Risiken. Änderungen um 5 % beziehen sich relativ auf das gewählte Risiko, nicht auf fünf Prozentpunkte. Bei einem Risiko von null werden stattdessen 1 % und 5 % verglichen. Der Vergleich gilt für die unbeschränkte CE-Strategie.",
    ],
  },
  timing: {
    title: "Wann könnte Verarmung eintreten?",
    paragraphs: [
      "Die Prognose zeigt das ab dem gewählten Alter verbleibende Risiko aus Sicht des Ruhestandsbeginns. Die bedingte Aktualisierung setzt voraus, dass Sie zu diesem Alter leben und die Verarmungsgrenze noch nicht erreicht haben. Das aktuelle Vermögen wird nicht eingegeben.",
      "Die Kurve des verbleibenden Risikos fällt am Simulationshorizont auf null. Die Dichtebalken zeigen Risiko pro Jahr; ihre Fläche über einen Altersbereich entspricht einem Wahrscheinlichkeitsbeitrag. Die Ergebnisse reichen nur bis zum simulierten Horizont.",
    ],
  },
  borrowing: {
    title: "Kreditaufnahme",
    paragraphs: [
      "Die Wahrscheinlichkeit einer Kreditaufnahme schätzt, ob zu Lebzeiten vor Verarmung oder dem Simulationshorizont jemals ein Kredit aufgenommen wird. Die erwartete Dauer mittelt über alle Pfade, auch über solche ohne Kreditaufnahme.",
      "Dass eine Kreditaufnahme irgendwo möglich ist, bedeutet nicht, dass sie auf jedem Pfad eintritt. Diese Ansicht ist für die projizierte Strategie, die Kreditaufnahme verhindert, und bei negativen Merton-Komponenten, die Leerverkäufe bedingen, nicht verfügbar.",
    ],
  },
  allocation: {
    title: "Portfolioaufteilung",
    paragraphs: [
      "Die Kurven zeigen die Vermögensanteile oder Beträge der einzelnen Anlagen für den gewählten Zeitpunkt und Vermögensstand. Eurobeträge sind inflationsbereinigt. Sie sagen nicht die Entwicklung Ihres eigenen Vermögens voraus.",
      "Negative Positionen riskanter Anlagen bedeuten Leerverkäufe; eine negative risikofreie Position bedeutet Kreditaufnahme. Das Diagramm zeigt die gewählte Strategie. Zum Ruhestandsbeginn markiert eine Linie das Anfangskapital.",
    ],
  },
  mortality: {
    title: "Überlebenskurve und Modellanpassung",
    paragraphs: [
      "Die Kohortenkurve zeigt das Überleben ab dem gewählten Ruhestandsalter, unter der Voraussetzung, dass dieses Alter erreicht wird. Bei der Anpassung werden Modellkurven an die gewählten Kohortendaten angenähert. Die GM- und CE-Modelle erfüllen unterschiedliche Aufgaben im Simulator.",
      "Die technischen Kennzahlen zeigen Abweichungen von der Kohorte und ob der Optimierer konvergiert ist. Konvergenz allein belegt keine gute Anpassung; die Kurven sagen keine individuelle Lebensdauer voraus.",
    ],
  },
  withdrawalTable: {
    title: "Tabelle für Auszahlung, Risiko und Strategie",
    paragraphs: [
      "Jede Zeile verändert die dort angezeigten Eingaben; Markt-, Sterblichkeits- und Simulationseinstellungen werden gemeinsam verwendet. Ein Lauf hält diese Einstellungen fest. Nach Änderungen können Ergebnisse eine Aktualisierung benötigen.",
      "Der CE-Vergleichswert wird analytisch für die unbeschränkte Strategie berechnet. Das GM-Risiko wird für die in der Zeile gewählte Strategie bis zum Simulationshorizont simuliert.",
    ],
  },
  feasibilityTable: {
    title: "Tabelle zur Zulässigkeitssensitivität",
    paragraphs: [
      "Jede Zeile variiert das gewählte Risiko beziehungsweise die Auszahlung und die Verarmungsgrenze; die übrigen Einstellungen werden gemeinsam verwendet. Ein Lauf hält diese Einstellungen fest. Nach Änderungen können ältere Ergebnisse eine Aktualisierung benötigen.",
      "Die Tabelle betrifft die unbeschränkte Strategie. ζ beschreibt die globale Zulässigkeit, während Wahrscheinlichkeit und erwartete Dauer einer Kreditaufnahme simulierte Ergebnisse beschreiben. Bei negativen Merton-Komponenten und damit erforderlichen Leerverkäufen sind die Kreditkennzahlen nicht verfügbar.",
    ],
  },
} as const;
