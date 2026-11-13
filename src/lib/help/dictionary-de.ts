import type { DictionaryEntry, DictionaryTermId } from "./dictionary";

/** Translated prose; IDs and mathematical formulas remain language-independent. */
type GermanEntry = Pick<
  DictionaryEntry,
  "title" | "summary" | "explanation" | "technical" | "keywords"
> & { symbols?: string };

/** German explanations for every glossary entry, keyed by its stable ID. */
export const germanDictionary: Record<DictionaryTermId, GermanEntry> = {
  impoverishment: {
    title: "Verarmungsgrenze",
    summary:
      "Der gewählte Vermögensstand, ab dem Ihre Ruhestandsfinanzierung unter eine für Sie akzeptable Grenze fällt.",
    explanation:
      "Das Erreichen dieser Grenze bedeutet nicht unbedingt, dass Ihr Vermögen null ist.",
    technical:
      "Der Verarmungszeitpunkt ist der erste Zeitpunkt, zu dem das Vermögen die gewählte Grenze erreicht oder unterschreitet.",
    symbols:
      "X ist das Vermögen; xᵢₘₚ ist die Grenze. Betrachtet wird das Erreichen der Grenze vor dem Tod.",
    keywords: "Schwelle Vermögen Grenze Verarmung",
  },
  withdrawal: {
    title: "Jährliche Auszahlung und Anfangskapital",
    summary:
      "Das Anfangskapital ist das zum Ruhestandsbeginn verfügbare Vermögen. Die Auszahlung ist der Betrag, den Sie sich zur Finanzierung Ihrer Ausgaben auszahlen.",
    explanation:
      "Das Modell verwendet eine konstante jährliche Auszahlung in heutiger Kaufkraft. Berücksichtigte regelmäßige Einnahmen sind von der modellierten Auszahlung abgezogen.",
    technical:
      "Das zeitstetige Modell zieht die konstante reale Auszahlungsrate C vom Vermögen ab; der angezeigte Betrag ist in Euro pro Jahr angegeben.",
    keywords: "Kapital Ausgaben Einkommen Auszahlung Entnahme",
  },
  "safe-boundary": {
    title: "Sichere Grenze",
    summary:
      "Die Vermögensgrenze, ab der die gewählte Auszahlung im Modell ohne Anlagerisiko bis zum Sterblichkeitsendpunkt finanziert werden kann.",
    explanation:
      "Sie dient als Vergleichsmaßstab für den Kapitalbedarf bei zugelassenem Anlagerisiko. Sie ist ein Modellergebnis und keine Garantie für ein reales Produkt.",
    technical:
      "Im nicht entarteten Modell mit endlichem Horizont, r > 0 und C > r xᵢₘₚ lautet die sichere Grenze:",
    symbols:
      "C ist die jährliche Auszahlung, xᵢₘₚ die Grenze, r der reale risikofreie Zinssatz und T der Endpunkt der Restlebensdauer.",
    keywords: "risikofrei Kapital sichere Grenze Auszahlung",
  },
  "capital-relief": {
    title: "Kapitalentlastung und Überschuss",
    summary:
      "Die Kapitalentlastung vergleicht den Kapitalbedarf bei Risikoübernahme mit der sicheren Grenze für dieselbe jährliche Auszahlung.",
    explanation:
      "Bei einem Risiko von null wird Kapital oberhalb des sicheren Mindestbetrags als Überschuss angezeigt. Der Vergleich verwendet das unbeschränkte CE-Modell.",
    technical:
      "C bleibt fest. Bei positivem gewähltem Risiko ist die Entlastung die sichere Grenze bei Ruhestand abzüglich des gewählten Anfangskapitals; benachbarte Risikowerte werden relativ zu α variiert.",
    keywords: "sicher Kapitalbedarf Risiko Überschuss",
  },
  "nominal-real": {
    title: "Nominal, real und Inflation",
    summary:
      "Nominale Beträge verwenden den Geldwert zum jeweiligen Zeitpunkt; reale Beträge berücksichtigen die gewählte Inflationsannahme.",
    explanation:
      "Inflation verringert die Kaufkraft eines festen Geldbetrags. Die App nimmt einen nominalen Zinssatz entgegen und zeigt den daraus abgeleiteten realen Modellzins.",
    technical:
      "Der reale Modellzins r verwendet den effektiven nominalen Zinssatz iᴺ und die Inflation ι:",
    symbols:
      "Das Ergebnis ist stetig verzinst; dieselbe Inflationskonvention wird für Anlagerenditen verwendet.",
    keywords: "Inflation Deflation nominal real Kaufkraft",
  },
  "risk-free-rate": {
    title: "Risikofreier Zinssatz",
    summary:
      "Die im Modell angenommene Rendite der risikofreien Anlage, je nach Kennzeichnung vor oder nach Inflation.",
    explanation:
      "Dies ist eine Modellannahme. Ein reales Produkt kann seinen Zinssatz ändern oder Kaufkraft verlieren.",
    technical:
      "Das aktuelle CE-Modell benötigt einen strikt positiven, stetig verzinsten realen risikofreien Zinssatz r.",
    keywords: "Zins risikofrei nominal real",
  },
  growth: {
    title: "Erwartetes jährliches Wachstum",
    summary:
      "Eine Annahme über das jährlich aufgezinste nominale Wachstum einer Anlage vor der gewählten Inflationsanpassung.",
    explanation:
      "Historische Schätzungen hängen von den eingegebenen Daten ab und sind keine Prognosen. Die hier verwendete Konvention ist nicht identisch mit der erwarteten prozentualen Einjahresrendite.",
    technical:
      "Für annualisiertes logarithmisches Wachstum a ist der eingegebene aufgezinste Wert g = exp(a) − 1. Die arithmetische Drift des Modells enthält zusätzlich die halbe Varianz der logarithmischen Renditen.",
    keywords: "Rendite Wachstum Drift historisch nominal",
  },
  volatility: {
    title: "Volatilität",
    summary:
      "Ein Maß dafür, wie stark die modellierten Renditen einer Anlage schwanken.",
    explanation:
      "Ein höherer Wert bedeutet größere modellierte Schwankungen; er sagt für sich genommen weder Gewinn noch Verlust voraus.",
    technical:
      "Die jährliche Volatilität ist die annualisierte Standardabweichung logarithmischer Renditen, üblicherweise pro Quadratwurzel eines Jahres gemessen.",
    keywords: "Schwankung Standardabweichung Sigma",
  },
  correlation: {
    title: "Korrelation und Korrelationsmatrix",
    summary:
      "Die Korrelation beschreibt den linearen Zusammenhang zwischen den modellierten Renditen zweier Anlagen.",
    explanation:
      "Positive Werte zeigen eine Tendenz zu gleichgerichteten, negative zu gegenläufigen Bewegungen. Null garantiert im Allgemeinen keine Unabhängigkeit.",
    technical:
      "Die Diagonale ist eins und die Matrix symmetrisch. Die App verlangt eine positiv definite und ausreichend gut konditionierte Matrix; paarweise Schätzungen können dies verletzen.",
    keywords: "Matrix Diversifikation Korrelation positiv definit",
  },
  covariance: {
    title: "Kovarianzmatrix",
    summary:
      "Eine Tabelle, die die Volatilitäten der Anlagen und ihre gemeinsamen Bewegungen verbindet.",
    explanation:
      "Sie modelliert gemeinsame Marktschwankungen und wird zur Bestimmung der Portfolioanteile verwendet.",
    technical:
      "Mit Volatilitäten σᵢ und Korrelationen Rᵢⱼ ergibt sich die jährliche Kovarianz:",
    keywords: "Volatilität Korrelation Matrix positiv definit",
  },
  "adjusted-prices": {
    title: "Angepasste Schlusskurse",
    summary:
      "Historische Schlusskurse, die etwa um Aktiensplits und Ausschüttungen bereinigt wurden.",
    explanation:
      "Importieren Sie bereits angepasste Kurse in Euro. Die App nimmt weder Anpassungen noch Währungsumrechnung oder Ergänzung fehlender Kurse vor.",
    technical:
      "Die CSV enthält aufsteigende Datumswerte und eine Spalte pro Anlage. Renditeintervalle verwenden vorhandene Beobachtungen und verstrichene Kalenderzeit.",
    keywords: "CSV Import Kurse Dividenden Splits Euro",
  },
  "historical-uncertainty": {
    title: "Unsicherheit historischer Schätzungen",
    summary:
      "Ein Bereich, der die Unsicherheit bei der Schätzung eines Marktparameters aus den eingegebenen historischen Daten beschreibt.",
    explanation:
      "Die Intervalle hängen von Daten und Modellannahmen ab. Sie sind weder Prognosen künftiger Renditen noch Monte-Carlo-Intervalle der Simulation.",
    technical:
      "Ein 95%-Konfidenzverfahren ist unter seinen Annahmen so ausgelegt, dass es den festen Parameter in ungefähr 95 % wiederholter Stichproben überdeckt. Paarintervalle verwenden gemeinsame Beobachtungszeitpunkte.",
    keywords: "Konfidenzintervall historisch Stichprobe Korrelation",
  },
  "market-direction": {
    title: "Merton-Vektor und Marktrisikoprämie ρ",
    summary:
      "Diese aus den Marktannahmen berechneten Größen helfen bei der Festlegung der modellierten Anlagestrategie.",
    explanation:
      "Der Merton-Vektor ist eine Richtung und für sich genommen kein Portfolio. Eine negative Komponente bedeutet im riskanten Bereich einen Leerverkauf der betreffenden Anlage durch die unbeschränkte Strategie.",
    technical:
      "Für den Überschussrenditevektor θ und die Kovarianzmatrix Σ sind die Richtung m und die Risikoprämie ρ:",
    symbols:
      "Der Faktor ein Halb gehört zur Definition von ρ. Das kompatible CE-Modell verlangt ρ > 0.",
    keywords: "Merton rho Risikoprämie Überschussrendite Leerverkauf",
  },
  cohort: {
    title: "Kohorte und Langlebigkeitsszenario",
    summary:
      "Eine Kohorte fasst Personen desselben Geburtsjahres zusammen; ein Langlebigkeitsszenario beschreibt eine angenommene Sterblichkeitsentwicklung der Bevölkerung.",
    explanation:
      "Die mitgelieferten deutschen Tabellen enthalten beobachtete und projizierte Sterblichkeit. Niedrige, mittlere und hohe Szenarien sind keine individuellen Vorhersagen.",
    technical:
      "Die App erstellt aus Kohorte und Szenario eine Überlebenskurve der Restlebensdauer, bedingt auf das Erreichen des gewählten Ruhestandsalters.",
    keywords: "Destatis Geburtsjahr Sterbetafel Sterblichkeit",
  },
  survival: {
    title: "Überlebenswahrscheinlichkeit und Mischung",
    summary:
      "Das Überleben ist die modellierte Wahrscheinlichkeit, ein späteres Alter zu erreichen, unter der Voraussetzung, das gewählte Ruhestandsalter erreicht zu haben.",
    explanation:
      "Der Schieberegler mischt die weibliche und männliche Überlebenskurve: 0 steht für weiblich, 1 für männlich. Die Mischung wird gewählt und ist nicht automatisch nach Bevölkerung gewichtet.",
    technical:
      "Für die Restlebensdauer D gilt S(t) = P(D > t). Die Mischung kombiniert die beiden zuvor jeweils bedingt erstellten Überlebenskurven.",
    keywords: "Überleben Wahrscheinlichkeit Geschlecht Mischung",
  },
  "mortality-fit": {
    title: "Anpassung der Sterblichkeitsmodelle",
    summary:
      "Bei der Anpassung werden Modellparameter so gewählt, dass ein Überlebensmodell die gewählten Kohortendaten annähert.",
    explanation:
      "Die App passt GM und das marktkompatible CE-Modell an. Änderungen relevanter Marktannahmen können eine neue CE-Anpassung erfordern; die Kohortendaten bleiben unverändert.",
    technical:
      "Die Zielfunktion vergleicht jährliche Sterbewahrscheinlichkeiten und den abschließenden Überlebensrest mittels KL-Divergenz. Konvergenz des Optimierers misst für sich genommen nicht die Anpassungsgüte.",
    keywords: "Anpassung Kalibrierung KL Konvergenz",
  },
  "mortality-models": {
    title: "CE- und GM-Sterblichkeitsmodelle",
    summary:
      "CE und GM sind zwei mathematische Beschreibungen der Restlebensdauer für unterschiedliche Teile der App.",
    explanation:
      "Das kompaktifizierte Exponentialmodell (CE) wird passend zur analytischen Strategie angepasst. Gompertz–Makeham (GM) dient als Referenzmodell zur Bewertung des simulierten Risikos.",
    technical:
      "CE besitzt einen endlichen Endpunkt der Restlebensdauer. GM besitzt eine mit dem Alter steigende Sterberate und einen konstanten Anteil und kann über den CE-Simulationshorizont hinausreichen.",
    keywords: "kompaktifiziert Exponential Gompertz Makeham Überleben",
  },
  "mortality-diagnostics": {
    title: "Diagnostik der Sterblichkeitsanpassung",
    summary:
      "Die Diagnostik beschreibt den Vergleich der angepassten Kurven mit den Kohortendaten und das Verhalten des Optimierers.",
    explanation:
      "Eine kleinere KL-Divergenz bedeutet nach diesem Kriterium eine bessere Übereinstimmung, garantiert aber keine Prognosegüte. Konvergenz beschreibt das Abbruchverhalten des Optimierers und ist keine Qualitätsbewertung.",
    technical:
      "KL vergleicht jährliche Sterbewahrscheinlichkeiten und den abschließenden Überlebensrest. Die größte Differenz ist die maximale absolute Überlebensdifferenz auf dem jährlichen Raster.",
    keywords: "KL Divergenz Optimierer Konvergenz Anpassungsgüte",
  },
  "mortality-horizon": {
    title: "Sterblichkeitsendpunkt und Simulationshorizont",
    summary:
      "Der CE-Endpunkt und der Simulationshorizont sind Modellgrenzen in Jahren nach Ruhestandsbeginn und kein bekannter Todeszeitpunkt.",
    explanation:
      "Die GM-Sterblichkeit kann über den CE-Horizont hinausreichen. Das simulierte GM-Risiko berücksichtigt nur Ereignisse bis zum Simulationshorizont.",
    technical:
      "T bezeichnet den deterministischen rechten Endpunkt der CE-Restlebensdauerverteilung; der zufällige Todeszeitpunkt ist eine andere Größe. Die Kohortendaten enden bei Alter 100.",
    keywords: "Endpunkt Horizont Restlebensdauer",
  },
  "target-risk": {
    title: "Zielrisiko",
    summary:
      "Die gewählte Wahrscheinlichkeit einer Verarmung vor dem Tod, aus der das CE-Modell eine Auszahlung ableitet.",
    explanation:
      "Das analytische Ziel gilt unter seinen Voraussetzungen für die unbeschränkte CE-Strategie. Bei GM-Sterblichkeit oder Projektion kann das Risiko abweichen.",
    technical:
      "Für ein positives Zielrisiko erfüllt die abgeleitete Strategie im kompatiblen unbeschränkten CE-Modell:",
    symbols:
      "α ist die Zielwahrscheinlichkeit, τᵢₘₚ der Verarmungszeitpunkt und 𝒯 der zufällige Todeszeitpunkt. Dieses α ist nicht der ebenfalls α genannte GM-Sterblichkeitsparameter.",
    keywords: "alpha Wahrscheinlichkeit Lebenszeit Auszahlung Ziel",
  },
  "gm-risk": {
    title: "Geschätztes GM-Risiko",
    summary:
      "Die geschätzte Wahrscheinlichkeit einer Verarmung vor dem Tod bei Bewertung der Strategie mit angepasster Gompertz–Makeham-Sterblichkeit.",
    explanation:
      "Sie kann wegen eines anderen Sterblichkeitsmodells oder einer anderen Strategie vom CE-Ziel abweichen. Es handelt sich um eine modellbasierte Schätzung, nicht um ein bekanntes zukünftiges Risiko.",
    technical:
      "Simulierte Ersttrefferzeiten werden bis zum CE-Laufhorizont mit der GM-Überlebenswahrscheinlichkeit gewichtet. GM-Überleben kann über diesen Horizont hinausreichen.",
    keywords: "Gompertz Makeham Sterblichkeit Simulation Projektion",
  },
  "percentage-points": {
    title: "Prozentpunkte",
    summary:
      "Prozentpunkte messen die direkte Differenz zwischen zwei Prozentangaben.",
    explanation:
      "Eine Änderung von 5 % auf 6 % entspricht einem Anstieg um einen Prozentpunkt oder relativ um 20 % von 5 %.",
    technical:
      "Eine relative Erhöhung von 5 % ausgehend von 5 % ergibt 5,25 %, also eine Änderung um 0,25 Prozentpunkte. Der Kapitalvergleich verwendet relative Änderungen von α.",
    keywords: "Prozentpunkte pp Prozent Differenz relativ",
  },
  "monte-carlo": {
    title: "Monte-Carlo-Unsicherheit",
    summary:
      "Eine Monte-Carlo-Schätzung verwendet simulierte Pfade; bei Wiederholung mit anderen Zufallszahlen kann sich das Ergebnis ändern.",
    explanation:
      "Standardfehler und approximatives 95%-Intervall beschreiben Stichprobenunsicherheit, nicht sämtliche Unsicherheit über die Zukunft.",
    technical:
      "Das Intervall umfasst weder Unsicherheit der Marktparameter oder des Sterblichkeitsmodells noch Zeitschritt- oder Brückenfehler oder Ereignisse nach dem Simulationshorizont.",
    keywords: "Stichprobe Standardfehler Konfidenzintervall Monte Carlo",
  },
  "simulation-detail": {
    title: "Pfade, Zeitschritt und Stapelgröße",
    summary:
      "Pfade sind alternative simulierte finanzielle Verläufe; der Zeitschritt legt fest, wie häufig das Modell sie fortschreibt.",
    explanation:
      "Mehr Pfade können Stichprobenrauschen verringern. Ein kleinerer Zeitschritt kann den Approximationsfehler verändern. Die Stapelgröße gruppiert Pfade für Leistung und Fortschrittsanzeige und ist keine Risikopräferenz.",
    technical:
      "Abbruch und Restzeitschätzung werden zwischen Stapeln aktualisiert. Ein kleinerer Zeitschritt allein belegt nicht, dass alle Diskretisierungsfehler vernachlässigbar sind.",
    keywords: "Pfade Zeitschritt Stapel Diskretisierung",
  },
  seed: {
    title: "Zufallsstartwert und Wiederholbarkeit",
    summary:
      "Ein Zufallsstartwert initialisiert die Folge der simulierten Zufallszahlen.",
    explanation:
      "Derselbe Startwert allein garantiert keine identischen Ergebnisse nach Änderung von Pfadanzahl, Stapelgröße, Algorithmus oder Rechenplattform.",
    technical:
      "Tabellenzeilen verwenden getrennt abgeleitete Zufallsfolgen. Gepaarte Strategiesimulationen teilen Marktzufallszahlen, sodass ihre Differenz anhand zusammengehöriger Pfade geschätzt werden kann.",
    keywords: "Startwert Seed Wiederholbarkeit Zufall Stapel",
  },
  "first-passage": {
    title: "Erster Grenzübertritt und Brückenapproximation",
    summary:
      "Der erste Grenzübertritt ist der erste Zeitpunkt, an dem ein Pfad eine gewählte Grenze erreicht.",
    explanation:
      "Ein Pfad kann eine Grenze zwischen gespeicherten Zeitschritten überschreiten. Die Simulation schätzt solche vom Raster möglicherweise übersehenen Übertritte mithilfe einer Brückenapproximation.",
    technical:
      "Die Brücke approximiert die modellierten beweglichen Grenzen. Erste Kreditaufnahme und Kreditdauer verwenden unterschiedliche Näherungen; deren Fehler sind nicht in Monte-Carlo-Intervallen enthalten.",
    keywords: "Brücke erster Treffer Grenzübertritt Zeitschritt",
  },
  policy: {
    title: "Portfoliostrategie und Aufteilung",
    summary:
      "Eine Portfoliostrategie beschreibt, wie das Vermögen bei veränderten Bedingungen auf Anlagen verteilt wird.",
    explanation:
      "Das Aufteilungsdiagramm zeigt Vermögensanteile für einen gewählten Zeitpunkt und Vermögensstand, keine Prognose individueller Bestände. Negative Anteile riskanter Anlagen bedeuten Leerverkäufe; ein negativer risikofreier Anteil bedeutet Kreditaufnahme.",
    technical:
      "Die unbeschränkte CE-Strategie hängt vom Abstand zur sicheren Grenze, dem Vermögen und der Merton-Richtung ab. Ihre Gewichte müssen das Simplex ohne Leerverkäufe und Kreditaufnahme nicht erfüllen.",
    keywords: "Portfolio Anteile Strategie Leerverkauf Kredit",
  },
  projection: {
    title: "Projektion",
    summary:
      "Eine Methode, Portfolioanteile so anzupassen, dass die gewählten Anlagebeschränkungen erfüllt sind.",
    explanation:
      "Hier verhindert die Projektion Leerverkäufe und Kreditaufnahme. Sie ist eine zulässige Vergleichsstrategie, keine nachgewiesen optimale beschränkte Strategie.",
    technical:
      "Die kovarianzgewichtete Projektion der unbeschränkten riskanten Aufteilung π lautet:",
    symbols:
      "p enthält die Gewichte der riskanten Anlagen und Σ ist die Kovarianzmatrix.",
    keywords: "Projektion Strategie Kredit Leerverkauf Simplex",
  },
  "global-feasibility": {
    title: "Globale Zulässigkeit und ζ",
    summary:
      "Globale Zulässigkeit fragt, ob die Strategie im gesamten relevanten riskanten Bereich Leerverkäufe und Kreditaufnahme vermeidet.",
    explanation:
      "Das ist etwas anderes als die Wahrscheinlichkeit einer Kreditaufnahme auf einem bestimmten Pfad. Unter den angegebenen Annahmen an den Merton-Vektor bedeutet ζ > 1, dass Kreditaufnahme irgendwo möglich, aber nicht unausweichlich ist.",
    technical:
      "Für nichtnegative Merton-Komponenten mit M = Σᵢmᵢ > 0 ist die unbeschränkte CE-Strategie bei ζ ≤ 1 zulässig:",
    symbols:
      "Die Aktion bei ζ = 1 verändert die Verarmungsgrenze und hält die gewählte Zieleingabe fest. Die projizierte Strategie ist konstruktionsbedingt zulässig.",
    keywords: "zeta Simplex Merton global Kredit zulässig",
  },
  borrowing: {
    title: "Kreditaufnahme",
    summary:
      "Eine Kreditaufnahme liegt vor, wenn die Strategie eine negative Position in der risikofreien Anlage zur Finanzierung riskanter Positionen benötigt.",
    explanation:
      "Die Wahrscheinlichkeit einer Kreditaufnahme betrifft Kreditaufnahme zu Lebzeiten vor Verarmung oder Simulationshorizont. Die erwartete Kreditdauer mittelt über alle Pfade einschließlich derer ohne Kreditaufnahme.",
    technical:
      "Die Kennzahlen verwenden GM-Überlebensgewichtung. Erste Kreditaufnahme und Belegungszeit verwenden unterschiedliche numerische Näherungen und können sich pfadweise unterscheiden.",
    keywords: "Kredit Dauer Wahrscheinlichkeit Hebel",
  },
  timing: {
    title: "Prognose und bedingte Aktualisierung",
    summary:
      "Das Zeitdiagramm zeigt das bis zum Simulationshorizont noch bevorstehende Verarmungsrisiko.",
    explanation:
      "Die Prognose bewertet dieses Risiko zum Ruhestandsbeginn. Die bedingte Aktualisierung setzt voraus, dass die Person zum gewählten Alter lebt und die Grenze noch nicht erreicht hat. Beobachtetes aktuelles Vermögen wird nicht verwendet.",
    technical:
      "Für den gewählten Zeitpunkt a und Horizont H ist die Prognose P(a < τ ≤ H, τ < D); die Aktualisierung bedingt auf τ > a und D > a. Spätere Kurvenpunkte behalten denselben Bedingungszeitpunkt.",
    keywords: "Alter Restrisiko bedingt Überleben Prognose",
  },
  density: {
    title: "Verbleibendes Risiko und Dichte",
    summary:
      "Das verbleibende Risiko ist die modellierte Wahrscheinlichkeit eines noch bevorstehenden relevanten Verarmungsereignisses bis zum Horizont.",
    explanation:
      "Die Kurve fällt zum Horizont hin auf null. Dichtebalken zeigen Risiko pro Jahr; die Fläche über einem Altersbereich entspricht einem Wahrscheinlichkeitsbeitrag.",
    technical:
      "Das angezeigte überlebensgewichtete Risiko ist nicht auf 100 % normiert. Eine Dichte in einem einzelnen Alter ist nicht selbst die Wahrscheinlichkeit eines Ereignisses genau in diesem Alter.",
    keywords: "Dichte Verteilung kumulativ Histogramm Wahrscheinlichkeit",
  },
  durbin: {
    title: "Durbin-Näherung und Fehlerdiagnostik",
    summary:
      "Eine mathematische Näherung für das Verarmungszeitverhalten der unbeschränkten Strategie.",
    explanation:
      "Die optionale Einblendung ist zusätzliche technische Information und kein exaktes Simulationsergebnis.",
    technical:
      "Die angezeigte CE-Schranke in Totalvariation betrifft die Zeitverteilung bedingt auf Verarmung vor dem Tod unter CE-Sterblichkeit. Sie gilt weder für das GM-Diagramm noch für die altersbedingte Aktualisierung. Der empirische CDF-Abstand enthält Stichproben- und numerische Fehler.",
    keywords: "Durbin Näherung Schranke CDF Abstand Fehler",
  },
  trajectories: {
    title: "Beispielhafte Vermögenspfade",
    summary:
      "Beispielpfade zeigen mögliche modellierte Vermögensverläufe, keine Vorhersagen für die Zukunft einer bestimmten Person.",
    explanation:
      "Sie setzen voraus, dass die Person am Leben bleibt, und enden bei Verarmung oder am Strategiehorizont. Mischen ändert die angezeigte Stichprobe ohne neue Simulation.",
    technical:
      "Es werden nur eine begrenzte Auswahl von Pfaden und ein reduziertes Darstellungsraster gespeichert; kurze Schwankungen können in der Darstellung fehlen.",
    keywords: "Vermögen Pfade Beispiele Mischen Simulation",
  },
  "comparison-tables": {
    title: "Varianten in Vergleichstabellen",
    summary:
      "Jede Tabellenzeile ändert die aufgeführten Eingaben und verwendet gemeinsame Markt-, Sterblichkeits- und numerische Einstellungen.",
    explanation:
      "Ein Lauf hält diese Einstellungen fest. Eine spätere Eingabeänderung kann dazu führen, dass ein älteres Ergebnis aktualisiert werden muss; der Zeilenname ist nur eine Beschriftung.",
    technical:
      "Die Auszahlungstabelle verwendet unbeschränkte CE-Werte und simuliert das GM-Risiko für die gewählte Strategie. Die Zulässigkeitstabelle betrifft unbeschränkte Kreditaufnahme unter ihren jeweiligen Voraussetzungen.",
    keywords: "Variante Zeile Strategie Einstellungen Vergleich",
  },
  "setup-results": {
    title: "Konfiguration, Ergebnisse und lokale Wiederherstellung",
    summary:
      "Eine Konfiguration enthält Eingaben; Ergebnisse sind die durch Berechnungen gewonnenen Schätzungen.",
    explanation:
      "Editierbare Eingaben werden normalerweise in diesem Browser gespeichert. Anpassungen und Simulationsergebnisse werden nach dem Neuladen nicht wiederhergestellt. Ein Konfigurationsimport ersetzt die Eingaben und löscht alte Ergebnisse.",
    technical:
      "Konfigurations-JSON, Ergebnis-JSON, Tabellen-CSV und Diagrammdateien erfüllen unterschiedliche Zwecke. Die ursprünglichen historischen Kursdateien und sämtliche simulierten Pfade sind nicht in diesen Zusammenfassungen enthalten.",
    keywords: "Speichern Import Export Browser JSON CSV Ergebnisse",
  },
};
