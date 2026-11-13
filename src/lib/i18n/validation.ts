import type { Language } from "./messages";

/** German equivalents of validation messages produced by the input parsers. */
const germanValidationMessages: Readonly<Record<string, string>> = {
  "Enter a nominal risk-free rate greater than −100%.":
    "Geben Sie einen nominalen risikofreien Zinssatz größer als −100 % ein.",
  "The nominal risk-free rate must exceed inflation, so the real rate is greater than 0%.":
    "Der nominale risikofreie Zinssatz muss über der Inflation liegen, damit der reale Zinssatz größer als 0 % ist.",
  "Enter an inflation assumption greater than −100%.":
    "Geben Sie eine Inflationsannahme größer als −100 % ein.",
  "The correlation matrix must be square.":
    "Die Korrelationsmatrix muss quadratisch sein.",
  "Enter a number between −1 and 1 for every correlation.":
    "Geben Sie für jede Korrelation eine Zahl zwischen −1 und 1 ein.",
  "Every diagonal correlation must equal 1.":
    "Alle Korrelationen auf der Diagonale müssen 1 sein.",
  "The correlation matrix must be symmetric.":
    "Die Korrelationsmatrix muss symmetrisch sein.",
  "The correlation matrix must be positive definite; these correlations are inconsistent or nearly singular.":
    "Die Korrelationsmatrix muss positiv definit sein; diese Korrelationen sind unvereinbar oder nahezu singulär.",
  "Enter a name for every asset.": "Geben Sie für jede Anlage einen Namen ein.",
  "Asset names must be unique.": "Anlagenamen dürfen nicht mehrfach vorkommen.",
  "Enter expected annual nominal growth greater than −100% for each asset.":
    "Geben Sie für jede Anlage ein erwartetes jährliches nominales Wachstum größer als −100 % ein.",
  "Enter a positive annual volatility for each asset.":
    "Geben Sie für jede Anlage eine positive jährliche Volatilität ein.",
  "The correlation matrix must match the number of assets.":
    "Die Korrelationsmatrix muss zur Anzahl der Anlagen passen.",
  "Enter a positive initial capital in euros.":
    "Geben Sie ein positives Anfangskapital in Euro ein.",
  "Enter an impoverishment level of at least €1.":
    "Geben Sie eine Verarmungsgrenze von mindestens 1 € ein.",
  "Initial capital must exceed the impoverishment level.":
    "Das Anfangskapital muss über der Verarmungsgrenze liegen.",
  "Mortality mixture weight must be between 0 and 1.":
    "Das Gewicht der Sterblichkeitsmischung muss zwischen 0 und 1 liegen.",
  "Target risk must be between 0% and 100%.":
    "Das Zielrisiko muss zwischen 0 % und 100 % liegen.",
  "Annual withdrawal must be non-negative.":
    "Die jährliche Entnahme darf nicht negativ sein.",
  "Number of paths must be a positive integer.":
    "Die Anzahl der Pfade muss eine positive ganze Zahl sein.",
  "Select a supported batch size.": "Wählen Sie eine unterstützte Stapelgröße.",
  "The unconstrained CE strategy is globally long-only and does not borrow in its risky region.":
    "Die unbeschränkte CE-Strategie ist global ohne Leerverkäufe und nimmt in ihrem riskanten Bereich keinen Kredit auf.",
  "The unconstrained CE strategy can require borrowing in part of its risky region.":
    "Die unbeschränkte CE-Strategie kann in einem Teil ihres riskanten Bereichs Kreditaufnahme erfordern.",
  "A Merton-vector component is negative. The unconstrained strategy requires short selling whenever wealth is below the safe boundary, so it is not globally simplex-feasible.":
    "Eine Merton-Komponente ist negativ. Die unbeschränkte Strategie erfordert unterhalb der sicheren Grenze Leerverkäufe und ist daher nicht global im Simplex zulässig.",
  "Global feasibility is unavailable for these inputs and this withdrawal.":
    "Die globale Zulässigkeit ist für diese Eingaben und diese Entnahme nicht verfügbar.",
  "The Merton vector must be non-negative with at least one positive component.":
    "Der Merton-Vektor muss nichtnegativ sein und mindestens eine positive Komponente haben.",
  "The required impoverishment level could not be calculated.":
    "Die erforderliche Verarmungsgrenze konnte nicht berechnet werden.",
  "The boundary cannot be represented within the supported investor inputs.":
    "Die Grenze kann mit den unterstützten persönlichen Eingaben nicht dargestellt werden.",
  "The boundary could not be verified at the supported numerical precision.":
    "Die Grenze konnte bei der unterstützten numerischen Genauigkeit nicht überprüft werden.",
  "The boundary cannot be calculated for the current assumptions.":
    "Die Grenze kann für die aktuellen Annahmen nicht berechnet werden.",
  "This comparison is available for the unconstrained policy only. Turn off projection to calculate it.":
    "Dieser Vergleich ist nur für die unbeschränkte Strategie verfügbar. Deaktivieren Sie die Projektion, um ihn zu berechnen.",
  "This capital comparison is not yet supported when withdrawal is at or below the interest on the impoverishment level.":
    "Dieser Kapitalvergleich wird noch nicht unterstützt, wenn die Entnahme höchstens den Zinsen auf die Verarmungsgrenze entspricht.",
  "The capital comparison is unavailable for this withdrawal and model.":
    "Der Kapitalvergleich ist für diese Entnahme und dieses Modell nicht verfügbar.",
  "Enter a random seed before running.":
    "Geben Sie vor dem Start einen Zufallsstartwert ein.",
  "The CE policy requires a positive market risk premium (rho).":
    "Die CE-Strategie erfordert eine positive Marktrisikoprämie (Rho).",
  "Fit both mortality models for the current investor and market settings before running.":
    "Passen Sie vor dem Start beide Sterblichkeitsmodelle an die aktuellen Personen- und Markteinstellungen an.",
  "Both current mortality fits must have converged before running.":
    "Beide aktuellen Sterblichkeitsanpassungen müssen vor dem Start konvergiert sein.",
  "Check the market inputs to calculate this curve.":
    "Prüfen Sie die Markteingaben, um diese Kurve zu berechnen.",
  "The CE relationship requires a positive market risk premium (rho).":
    "Der CE-Zusammenhang erfordert eine positive Marktrisikoprämie (Rho).",
  "Fit the mortality models in Market & investor to calculate this curve.":
    "Passen Sie die Sterblichkeitsmodelle unter Markt & Person an, um diese Kurve zu berechnen.",
  "The CE mortality fit needs updating after your input changes.":
    "Die CE-Sterblichkeitsanpassung muss nach den Eingabeänderungen aktualisiert werden.",
  "The CE mortality fit did not converge. Review the fit before using this curve.":
    "Die CE-Sterblichkeitsanpassung ist nicht konvergiert. Prüfen Sie die Anpassung, bevor Sie diese Kurve verwenden.",
  "Enter valid capital and impoverishment amounts, with capital above the threshold.":
    "Geben Sie gültiges Kapital und eine gültige Verarmungsgrenze ein; das Kapital muss über der Grenze liegen.",
  "The CE relationship could not be calculated.":
    "Der CE-Zusammenhang konnte nicht berechnet werden.",
  "Malformed CSV quotation.": "Fehlerhafte Anführungszeichen in der CSV-Datei.",
  "Unexpected text after a quoted CSV field.":
    "Unerwarteter Text nach einem zitierten CSV-Feld.",
  "Unclosed quoted CSV field.":
    "Ein zitiertes CSV-Feld wurde nicht geschlossen.",
  "The CSV needs a header and price observations.":
    "Die CSV-Datei benötigt eine Kopfzeile und Kursbeobachtungen.",
  'The first column must be a date index named "date" or left blank.':
    "Die erste Spalte muss eine Datumsspalte mit dem Namen „date“ sein oder leer bleiben.",
  "Asset column names must be nonempty and unique.":
    "Anlagenspalten benötigen eindeutige, nichtleere Namen.",
  "Dates must be unique and in ascending order.":
    "Datumswerte müssen eindeutig und aufsteigend sortiert sein.",
  "An estimated value is too large to display with two decimal places.":
    "Ein geschätzter Wert ist zu groß für die Darstellung mit zwei Dezimalstellen.",
  "An estimated growth rate or volatility is outside the supported range after rounding to two decimals.":
    "Eine geschätzte Wachstumsrate oder Volatilität liegt nach Rundung auf zwei Dezimalstellen außerhalb des unterstützten Bereichs.",
  "The saved setup could not be restored. New changes will be saved locally if browser storage is available.":
    "Die gespeicherte Konfiguration konnte nicht wiederhergestellt werden. Neue Änderungen werden lokal gespeichert, sofern der Browserspeicher verfügbar ist.",
  "Changes could not be saved in this browser. Export your setup to keep a copy.":
    "Änderungen konnten in diesem Browser nicht gespeichert werden. Exportieren Sie Ihre Konfiguration, um eine Kopie zu behalten.",
  "A simulation or mortality fit is running. Interrupt it and import this setup?":
    "Eine Simulation oder Sterblichkeitsanpassung läuft. Soll sie unterbrochen und diese Konfiguration importiert werden?",
  "A mortality fit is still running. Interrupt it and start a new fit with the current settings?":
    "Eine Sterblichkeitsanpassung läuft noch. Soll sie unterbrochen und mit den aktuellen Einstellungen neu gestartet werden?",
  "A simulation is still running. Interrupt it and start a new run with the current settings?":
    "Eine Simulation läuft noch. Soll sie unterbrochen und mit den aktuellen Einstellungen neu gestartet werden?",
  "Could not start the simulation worker.":
    "Der Simulationsprozess konnte nicht gestartet werden.",
  "The simulation worker failed to load or run.":
    "Der Simulationsprozess konnte nicht geladen oder ausgeführt werden.",
  "Could not send the settings to the simulation worker.":
    "Die Einstellungen konnten nicht an den Simulationsprozess übermittelt werden.",
  "Could not load cohort data.":
    "Die Kohortendaten konnten nicht geladen werden.",
  "Could not load the cohort data.":
    "Die Kohortendaten konnten nicht geladen werden.",
  "Could not start the fitting worker.":
    "Der Anpassungsprozess konnte nicht gestartet werden.",
  "Could not start the automatic mortality fit.":
    "Die automatische Sterblichkeitsanpassung konnte nicht gestartet werden.",
  "The automatic mortality fit could not be completed.":
    "Die automatische Sterblichkeitsanpassung konnte nicht abgeschlossen werden.",
  "The fitting worker failed.": "Der Anpassungsprozess ist fehlgeschlagen.",
  "The automatic mortality fitting worker failed.":
    "Der Prozess der automatischen Sterblichkeitsanpassung ist fehlgeschlagen.",
  "Could not send the cohort data to the fitting worker.":
    "Die Kohortendaten konnten nicht an den Anpassungsprozess übermittelt werden.",
  "The selected birth or retirement year is outside the supported cohort data.":
    "Das gewählte Geburts- oder Ruhestandsjahr liegt außerhalb der unterstützten Kohortendaten.",
  "The market inputs are not valid for the compatible mortality fit.":
    "Die Markteingaben sind für die kompatible Sterblichkeitsanpassung ungültig.",
  "Check the market inputs before calculating this table.":
    "Prüfen Sie die Markteingaben vor der Berechnung dieser Tabelle.",
  "The CE model requires a positive market risk premium (rho).":
    "Das CE-Modell erfordert eine positive Marktrisikoprämie (Rho).",
  "Fit the mortality models under Investor & mortality to calculate this table.":
    "Passen Sie die Sterblichkeitsmodelle unter Person & Sterblichkeit an, um diese Tabelle zu berechnen.",
  "The CE mortality fit needs updating for the current inputs.":
    "Die CE-Sterblichkeitsanpassung muss für die aktuellen Eingaben aktualisiert werden.",
  "The CE mortality fit did not converge. Review the fit before calculating this table.":
    "Die CE-Sterblichkeitsanpassung ist nicht konvergiert. Prüfen Sie die Anpassung vor der Tabellenberechnung.",
  "Enter valid starting capital and an impoverishment level below it.":
    "Geben Sie ein gültiges Anfangskapital und eine darunterliegende Verarmungsgrenze ein.",
  "The CE model is unavailable for these inputs.":
    "Das CE-Modell ist für diese Eingaben nicht verfügbar.",
  "Enter a target risk from 0% to less than 100%.":
    "Geben Sie ein Zielrisiko von 0 % bis unter 100 % ein.",
  "Enter a non-negative annual withdrawal in euros.":
    "Geben Sie eine nichtnegative jährliche Entnahme in Euro ein.",
  "Enter a non-negative annual withdrawal.":
    "Geben Sie eine nichtnegative jährliche Entnahme ein.",
  "The selected risk is outside the supported numerical range.":
    "Das gewählte Risiko liegt außerhalb des unterstützten numerischen Bereichs.",
  "The CE risk is outside the supported numerical range.":
    "Das CE-Risiko liegt außerhalb des unterstützten numerischen Bereichs.",
  "Could not calculate this row.": "Diese Zeile konnte nicht berechnet werden.",
  "Invalid row.": "Ungültige Zeile.",
  "Feasibility comparisons require an unconstrained policy without short selling.":
    "Zulässigkeitsvergleiche erfordern eine unbeschränkte Strategie ohne Leerverkäufe.",
  "The Merton vector requires short selling.":
    "Der Merton-Vektor erfordert Leerverkäufe.",
  "Borrowing diagnostics are unavailable for this row.":
    "Kreditdiagnosen sind für diese Zeile nicht verfügbar.",
  "The simulation worker failed.": "Der Simulationsprozess ist fehlgeschlagen.",
  "The borrowing results are missing.":
    "Die Ergebnisse zur Kreditaufnahme fehlen.",
  "The projected GM result is missing.": "Das projizierte GM-Ergebnis fehlt.",
  "The projected allocation could not be prepared.":
    "Die projizierte Aufteilung konnte nicht vorbereitet werden.",
  "The portfolio allocation could not be calculated.":
    "Die Portfolioaufteilung konnte nicht berechnet werden.",
  "The Durbin approximation could not be calculated.":
    "Die Durbin-Näherung konnte nicht berechnet werden.",
  "The CDF comparison could not be calculated.":
    "Der Vergleich der Verteilungsfunktionen konnte nicht berechnet werden.",
  "The Durbin approximation could not be evaluated.":
    "Die Durbin-Näherung konnte nicht ausgewertet werden.",
  "Risk-free rate and inflation do not match the real rate.":
    "Risikofreier Zinssatz und Inflation stimmen nicht mit dem Realzins überein.",
  "Asset names must be nonempty and unique.":
    "Anlagenamen müssen eindeutig und nichtleer sein.",
  "The calibrated market does not match the current market inputs.":
    "Der kalibrierte Markt stimmt nicht mit den aktuellen Markteingaben überein.",
  "Both mortality fits must have converged.":
    "Beide Sterblichkeitsanpassungen müssen konvergiert sein.",
  "Investor cohort and mortality settings are invalid.":
    "Die Kohorten- oder Sterblichkeitseinstellungen sind ungültig.",
  "Initial capital must exceed the impoverishment level of at least €1.":
    "Das Anfangskapital muss über der Verarmungsgrenze von mindestens 1 € liegen.",
  "Unsupported withdrawal mode.": "Der Entnahmemodus wird nicht unterstützt.",
  "Invalid path count or time step.":
    "Ungültige Pfadanzahl oder ungültiger Zeitschritt.",
  "Invalid batch size, horizon or trajectory setting.":
    "Ungültige Stapelgröße, ungültiger Horizont oder ungültige Pfadeinstellung.",
  "Seed, versions and data provenance must be specified.":
    "Zufallsstartwert, Versionen und Datenherkunft müssen angegeben sein.",
  "The simulation horizon must be finite and positive.":
    "Der Simulationshorizont muss endlich und positiv sein.",
  "Invalid time step or simulation horizon.":
    "Ungültiger Zeitschritt oder Simulationshorizont.",
  "Simulation requires a snapshot validated by createRunSnapshot.":
    "Die Simulation benötigt eine validierte Konfiguration.",
  "Prepared safe boundaries exceed the supported numerical range.":
    "Die vorbereiteten sicheren Grenzen überschreiten den unterstützten numerischen Bereich.",
  "Prepared wealth coefficients exceed the supported numerical range.":
    "Die vorbereiteten Vermögenskoeffizienten überschreiten den unterstützten numerischen Bereich.",
  "Paired policy results must have matching path counts.":
    "Gepaarte Strategieergebnisse müssen dieselbe Anzahl von Pfaden haben.",
  "Dimension must be a positive integer.":
    "Die Dimension muss eine positive ganze Zahl sein.",
  "Tensor simulation produced a non-finite result.":
    "Die Tensor-Simulation hat ein nichtendliches Ergebnis erzeugt.",
  "Projected tensor simulation produced a non-finite result.":
    "Die projizierte Tensor-Simulation hat ein nichtendliches Ergebnis erzeugt.",
  "The prepared projection must match the selected policy.":
    "Die vorbereitete Projektion muss zur gewählten Strategie passen.",
  "Simulation cancelled.": "Simulation abgebrochen.",
  "The trajectory sample is missing.":
    "Die Stichprobe der Vermögenspfade fehlt.",
  "The selected-policy hit times are missing.":
    "Die Trefferzeiten der gewählten Strategie fehlen.",
  "Borrowing occupation produced a non-finite result.":
    "Die Berechnung der Kreditdauer hat ein nichtendliches Ergebnis erzeugt.",
  "First borrowing produced a non-finite time.":
    "Die erste Kreditaufnahme hat einen nichtendlichen Zeitpunkt ergeben.",
  "The projected batch result is missing.":
    "Das Ergebnis des projizierten Stapels fehlt.",
  "A positive real rate and rho are required.":
    "Ein positiver Realzins und ein positives Rho sind erforderlich.",
  "The impoverishment level must be finite and positive.":
    "Die Verarmungsgrenze muss endlich und positiv sein.",
  "The Merton direction must be nonempty, finite and nonzero when rho is positive.":
    "Die Merton-Richtung muss bei positivem Rho nichtleer, endlich und von null verschieden sein.",
  "Invalid compatible mortality parameters.":
    "Ungültige kompatible Sterblichkeitsparameter.",
  "The CE elasticity does not satisfy the compatibility condition.":
    "Die CE-Elastizität erfüllt die Kompatibilitätsbedingung nicht.",
  "The mortality fit is not compatible with this market.":
    "Die Sterblichkeitsanpassung ist mit diesem Markt nicht kompatibel.",
  "Target risk must be strictly between zero and one.":
    "Das Zielrisiko muss strikt zwischen null und eins liegen.",
  "Withdrawal is outside the supported numerical range.":
    "Die Entnahme liegt außerhalb des unterstützten numerischen Bereichs.",
  "The risky-region width is outside the supported numerical range.":
    "Die Breite des riskanten Bereichs liegt außerhalb des unterstützten numerischen Bereichs.",
  "Required capital is outside the supported numerical range.":
    "Das erforderliche Kapital liegt außerhalb des unterstützten numerischen Bereichs.",
  "Wealth must be finite and non-negative.":
    "Das Vermögen muss endlich und nichtnegativ sein.",
  "Time must be before the mortality endpoint.":
    "Der Zeitpunkt muss vor dem Sterblichkeitsendpunkt liegen.",
  "Portfolio is outside the supported numerical range.":
    "Das Portfolio liegt außerhalb des unterstützten numerischen Bereichs.",
  "Feasibility diagnostic is outside the supported numerical range.":
    "Die Zulässigkeitsdiagnostik liegt außerhalb des unterstützten numerischen Bereichs.",
  "Covariance must be positive definite.":
    "Die Kovarianz muss positiv definit sein.",
  "Projection scale is outside the prepared range.":
    "Der Projektionsfaktor liegt außerhalb des vorbereiteten Bereichs.",
  "The real risk-free rate must be finite and positive.":
    "Der reale risikofreie Zinssatz muss endlich und positiv sein.",
  "The mortality endpoint must be positive or Infinity.":
    "Der Sterblichkeitsendpunkt muss positiv oder unendlich sein.",
  "The safe withdrawal is outside the supported numerical range.":
    "Die sichere Entnahme liegt außerhalb des unterstützten numerischen Bereichs.",
  "Annual withdrawal must be finite and positive.":
    "Die jährliche Entnahme muss endlich und positiv sein.",
  "Annual withdrawal must exceed interest at the impoverishment level.":
    "Die jährliche Entnahme muss die Zinsen auf die Verarmungsgrenze überschreiten.",
  "Time must be finite and non-negative.":
    "Der Zeitpunkt muss endlich und nichtnegativ sein.",
  "Time cannot be past the mortality endpoint.":
    "Der Zeitpunkt darf nicht nach dem Sterblichkeitsendpunkt liegen.",
  "The safe boundary exceeds the supported numerical range.":
    "Die sichere Grenze überschreitet den unterstützten numerischen Bereich.",
  "Covariance submatrix is not positive definite.":
    "Die Kovarianzuntermatrix ist nicht positiv definit.",
  "Covariance-weighted simplex projection did not converge.":
    "Die kovarianzgewichtete Simplex-Projektion ist nicht konvergiert.",
  "Durbin approximation is unavailable for these model inputs.":
    "Die Durbin-Näherung ist für diese Modelldaten nicht verfügbar.",
  "The Durbin boundary is outside the supported numerical range.":
    "Die Durbin-Grenze liegt außerhalb des unterstützten numerischen Bereichs.",
  "The Durbin approximation failed a numerical consistency check.":
    "Die Durbin-Näherung hat eine numerische Konsistenzprüfung nicht bestanden.",
  "The fitting grid must start at zero and increase strictly.":
    "Das Anpassungsraster muss bei null beginnen und streng steigen.",
  "The target must be a normalized non-increasing survival curve.":
    "Die Zielkurve muss eine normierte, nicht steigende Überlebenskurve sein.",
  "CE parameters are outside the supported numerical range.":
    "Die CE-Parameter liegen außerhalb des unterstützten numerischen Bereichs.",
  "CE parameters produced an invalid survival value.":
    "Die CE-Parameter haben einen ungültigen Überlebenswert erzeugt.",
  "Probability must be finite and between 0 and 1.":
    "Die Wahrscheinlichkeit muss endlich sein und zwischen 0 und 1 liegen.",
  "GM quantile is outside the supported numerical range.":
    "Das GM-Quantil liegt außerhalb des unterstützten numerischen Bereichs.",
  "Could not bracket the GM quantile.":
    "Das GM-Quantil konnte nicht eingegrenzt werden.",
  "No optimizer start produced a finite fit.":
    "Kein Optimierungsstart hat eine endliche Anpassung ergeben.",
  "CE fitting requires a positive real rate and positive rho.":
    "Die CE-Anpassung benötigt einen positiven Realzins und ein positives Rho.",
  "Invalid CE fit parameters.": "Ungültige Parameter der CE-Anpassung.",
  "Birth year must be between 1926 and 2026.":
    "Das Geburtsjahr muss zwischen 1926 und 2026 liegen.",
  "The cohort table has an unexpected format.":
    "Die Kohortentafel hat ein unerwartetes Format.",
  "The requested cohort is missing or duplicated.":
    "Die angeforderte Kohorte fehlt oder ist mehrfach vorhanden.",
  "The cohort row has an unexpected number of ages.":
    "Die Kohortenzeile enthält eine unerwartete Anzahl von Alterswerten.",
  "The cohort table contains an invalid probability.":
    "Die Kohortentafel enthält eine ungültige Wahrscheinlichkeit.",
  "A cohort requires valid annual probabilities for ages 0–99.":
    "Eine Kohorte benötigt gültige jährliche Wahrscheinlichkeiten für das Alter von 0–99 Jahren.",
  "Retirement age must be between 0 and 99.":
    "Das Ruhestandsalter muss zwischen 0 und 99 liegen.",
  "Mixture weight must be between 0 and 1.":
    "Das Mischungsgewicht muss zwischen 0 und 1 liegen.",
  "Select between 1 and 10 assets in euros.":
    "Wählen Sie zwischen 1 und 10 Anlagen in Euro.",
  "The real risk-free rate and inflation are outside the supported range.":
    "Der reale risikofreie Zinssatz und die Inflation liegen außerhalb des unterstützten Bereichs.",
  "Each asset needs valid expected growth and positive volatility.":
    "Jede Anlage benötigt ein gültiges erwartetes Wachstum und eine positive Volatilität.",
  "The correlation matrix must be symmetric, have a unit diagonal, and contain values from -1 to 1.":
    "Die Korrelationsmatrix muss symmetrisch sein, eine Einsdiagonale haben und Werte zwischen −1 und 1 enthalten.",
  "The correlation matrix is not positive definite or is numerically near-singular.":
    "Die Korrelationsmatrix ist nicht positiv definit oder numerisch nahezu singulär.",
  "Market parameters exceed the supported numerical range.":
    "Die Marktparameter überschreiten den unterstützten numerischen Bereich.",
  "The market calculation is numerically unstable or outside the supported range.":
    "Die Marktberechnung ist numerisch instabil oder liegt außerhalb des unterstützten Bereichs.",
  "Could not calculate borrowing diagnostics.":
    "Die Kreditdiagnostik konnte nicht berechnet werden.",
  "Could not import price data.":
    "Die Kursdaten konnten nicht importiert werden.",
  "Enter a four-digit retirement year.":
    "Geben Sie ein vierstelliges Ruhestandsjahr ein.",
};

/** Translate known validation errors without altering the underlying validation. */
export function validationMessage(message: string, language: Language): string {
  if (language === "en") return message;

  const birth = /^Enter a birth year from (\d+) to (\d+)\.$/.exec(message);
  if (birth)
    return `Geben Sie ein Geburtsjahr zwischen ${birth[1]} und ${birth[2]} ein.`;

  const retirement =
    /^Enter a year from (\d+) to (\d+) \(retirement age 0–99\)\.$/.exec(
      message,
    );
  if (retirement)
    return `Geben Sie ein Jahr zwischen ${retirement[1]} und ${retirement[2]} ein (Ruhestandsalter 0–99).`;

  const csvPatterns: readonly [RegExp, (...groups: string[]) => string][] = [
    [
      /^Invalid date: (.+)\. Use YYYY-MM-DD\.$/,
      (value) => `Ungültiges Datum: ${value}. Verwenden Sie JJJJ-MM-TT.`,
    ],
    [/^Invalid date: (.+)\.$/, (value) => `Ungültiges Datum: ${value}.`],
    [
      /^(.+) needs at least 3 usable return intervals\.$/,
      (name) => `${name} benötigt mindestens 3 verwendbare Renditeintervalle.`,
    ],
    [
      /^(.+) has zero or invalid return variation\.$/,
      (name) => `${name} hat keine oder eine ungültige Renditeschwankung.`,
    ],
    [
      /^Provide between 1 and (\d+) assets\.$/,
      (max) => `Geben Sie zwischen 1 und ${max} Anlagen an.`,
    ],
    [
      /^Row (\d+) has the wrong number of columns\.$/,
      (row) => `Zeile ${row} hat die falsche Anzahl an Spalten.`,
    ],
    [
      /^Invalid price for (.+) on (.+)\.$/,
      (name, date) => `Ungültiger Kurs für ${name} am ${date}.`,
    ],
    [
      /^Prices must be positive and finite \((.+), (.+)\)\.$/,
      (name, date) =>
        `Kurse müssen positiv und endlich sein (${name}, ${date}).`,
    ],
    [
      /^(.+) has a growth estimate outside the supported range\.$/,
      (name) =>
        `Die Wachstumsschätzung für ${name} liegt außerhalb des unterstützten Bereichs.`,
    ],
    [
      /^Could not estimate correlation for (.+)\.$/,
      (pair) => `Die Korrelation für ${pair} konnte nicht geschätzt werden.`,
    ],
  ];

  for (const [pattern, translate] of csvPatterns) {
    const match = pattern.exec(message);
    if (match) return translate(...match.slice(1));
  }

  const matrixPrefixes: readonly [string, string][] = [
    [
      "The estimated correlation matrix cannot be used: ",
      "Die geschätzte Korrelationsmatrix kann nicht verwendet werden: ",
    ],
    [
      "The estimated matrix cannot be used after rounding to two decimals: ",
      "Die geschätzte Matrix kann nach Rundung auf zwei Dezimalstellen nicht verwendet werden: ",
    ],
  ];
  for (const [prefix, translated] of matrixPrefixes) {
    if (message.startsWith(prefix))
      return (
        translated + validationMessage(message.slice(prefix.length), language)
      );
  }

  const boundary =
    /^The required impoverishment level must be at least €1 and less than your starting capital\. \(Required level: approx\. €(.+)\.\)$/.exec(
      message,
    );
  if (boundary)
    return `Die erforderliche Verarmungsgrenze muss mindestens 1 € und kleiner als Ihr Anfangskapital sein. (Erforderlicher Wert: ca. €${boundary[1]}.)`;

  return germanValidationMessages[message] ?? message;
}
