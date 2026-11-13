import type { Language } from "./messages";

/** Labels for comparison tables and their shared settings. */
export interface TableMessages {
  eyebrow: string;
  title: string;
  intro: string;
  comparison: string;
  comparisonTitle: string;
  comparisonDescription: string;
  settings: string;
  exportTable: string;
  customize: string;
  closeSettings: string;
  settingsLead: string;
  detail: string;
  tableType: string;
  withdrawalTable: string;
  feasibilityTable: string;
  add: string;
  withdrawalDescription: string;
  feasibilityDescription: string;
  otherShared: string;
  withdrawalNote: string;
  feasibilityNote: string;
  projectedUnavailable: string;
  shortUnavailable: string;
  variation: string;
  riskOrWithdrawal: string;
  policy: string;
  ceResult: string;
  annualWithdrawal: string;
  ceRisk: string;
  withdrawalOrRisk: string;
  gmRisk: string;
  impoverishment: string;
  bandwidth: string;
  everBorrow: string;
  borrowingTime: string;
  gmStatus: string;
  status: string;
  targetRisk: string;
  withdrawal: string;
  unconstrained: string;
  projected: string;
  yearUnit: string;
  perYear: string;
  years: string;
  hideDetails: string;
  viewDetails: string;
  editName: string;
  nameLabel: (id: number) => string;
  typeLabel: (id: number) => string;
  policyLabel: (id: number) => string;
  removeLabel: (id: number) => string;
  valueLabel: (id: number, risk: boolean) => string;
  thresholdLabel: (id: number) => string;
  deleteConfirm: string;
  stopBatch: string;
  etaBatch: string;
  finishing: string;
  previous: string;
  stopBatches: string;
  estimateOverall: string;
  progress: string;
  batches: string;
  changed: string;
  withdrawalFooter: string;
  feasibilityFooter: string;
  cancelRows: string;
  computeRows: string;
  save: string;
  importExport: string;
  saveDescription: string;
  recreate: string;
  importSetup: string;
  output: string;
  exportResults: string;
  resultsDescription: string;
  setupDescription: string;
  setupLink: string;
  analyticalZero: string;
  mcUnavailable: string;
  calculatingGM: string;
  borrowingAtRetirement: string;
  yes: string;
  no: string;
  lastBorrow: string;
  never: string;
  yearsAfter: string;
  probabilityInterval: string;
  timeInterval: string;
  zeroNote: string;
  intervalNote: string;
  unavailable: string;
  etaAbout: string;
  etaLeft: string;
}

/** English and German text; internal row values and exported file schemas are unchanged. */
export const tableMessages: Record<Language, TableMessages> = {
  en: {
    eyebrow: "EXPLORE THE DETAILS",
    title: "Make room for questions",
    intro: "Compare variations of your setup and save your work.",
    comparison: "YOUR COMPARISON",
    comparisonTitle: "Comparison table",
    comparisonDescription:
      "Compare variations using the same market and investor settings. Export only the current table.",
    settings: "Simulation settings",
    exportTable: "Export table",
    customize: "MAKE IT YOURS",
    closeSettings: "Close simulation settings",
    settingsLead:
      "These settings are shared with Evaluation and apply to future simulation runs.",
    detail: "Simulation detail",
    tableType: "TABLE TYPE",
    withdrawalTable: "Withdrawal, risk & policy",
    feasibilityTable: "Feasibility sensitivity",
    add: "Add row",
    withdrawalDescription:
      "Compare withdrawals and risk across unconstrained and projected policies.",
    feasibilityDescription:
      "Vary risk or withdrawal and the impoverishment level for the unconstrained policy.",
    otherShared: "All other settings are shared.",
    withdrawalNote:
      "The CE value uses the unconstrained policy, including for projected rows. GM risk is for the selected policy, through the CE horizon.",
    feasibilityNote:
      "ζ ≤ 1 indicates global feasibility when all Merton-vector components are non-negative and at least one is positive. Negative components require short selling in the risky region. Borrowing probability and time use GM mortality; row-specific impoverishment levels start from the shared setup.",
    projectedUnavailable:
      "This comparison is available for the unconstrained policy only. Turn off projection to view it. The projected policy prevents borrowing and short selling by keeping allocations within the simplex.",
    shortUnavailable:
      "This comparison is unavailable because a Merton-vector component is negative. The unconstrained policy requires short selling whenever wealth is below the safe boundary.",
    variation: "VARIATION",
    riskOrWithdrawal: "RISK OR WITHDRAWAL",
    policy: "POLICY",
    ceResult: "CE RESULT",
    annualWithdrawal: "ANNUAL WITHDRAWAL",
    ceRisk: "CE LIFETIME RISK",
    withdrawalOrRisk: "WITHDRAWAL / CE RISK",
    gmRisk: "ESTIMATED GM RISK",
    impoverishment: "IMPOVERISHMENT LEVEL",
    bandwidth: "RELATIVE BANDWIDTH ζ",
    everBorrow: "EVER BORROWING (GM)",
    borrowingTime: "EXPECTED BORROWING TIME (GM)",
    gmStatus: "GM STATUS",
    status: "STATUS",
    targetRisk: "Target risk",
    withdrawal: "Withdrawal",
    unconstrained: "Unconstrained",
    projected: "Projected",
    yearUnit: "€ / year",
    perYear: "/ year",
    years: "years",
    hideDetails: "Hide details",
    viewDetails: "View details",
    editName: "Edit variation name",
    nameLabel: (id) => `Name for variation ${id}`,
    typeLabel: (id) => `Input type for variation ${id}`,
    policyLabel: (id) => `Policy for variation ${id}`,
    removeLabel: (id) => `Remove variation ${id}`,
    valueLabel: (id, risk) =>
      `Input value for variation ${id}, ${risk ? "percent" : "euros per year"}`,
    thresholdLabel: (id) => `Impoverishment level for variation ${id}, euros`,
    deleteConfirm: "Delete this variation and its calculated values?",
    stopBatch: "Stopping after current batch…",
    etaBatch: "ETA after first batch",
    finishing: "Finishing…",
    previous: "Previous setup or row inputs",
    stopBatches: "Stopping after the current batches…",
    estimateOverall: "Estimating overall time…",
    progress: "Table simulation progress",
    batches: "batches",
    changed: "Settings changed; this run continues with its captured setup.",
    withdrawalFooter:
      "CE values are analytical; GM risk is estimated through the CE horizon.",
    feasibilityFooter:
      "Borrowing estimates use GM mortality through the CE horizon.",
    cancelRows: "Cancel rows",
    computeRows: "▶  Compute rows",
    save: "SAVE AND RESTORE",
    importExport: "Import & export",
    saveDescription: "Keep your setup and your results separately.",
    recreate: "RECREATE YOUR SETUP",
    importSetup: "Import or export setup",
    output: "KEEP YOUR OUTPUTS",
    exportResults: "Export results",
    resultsDescription:
      "Save the computed tables and diagnostics, linked to the setup and run that produced them.",
    setupDescription:
      "Save or restore your inputs, table variations and run settings. Fits and results are not included. Learn about",
    setupLink: "setups and results",
    analyticalZero: "Analytical zero",
    mcUnavailable: "MC interval unavailable",
    calculatingGM: "Calculating GM risk",
    borrowingAtRetirement: "Borrowing at retirement",
    yes: "Yes",
    no: "No",
    lastBorrow: "Last possible borrowing time",
    never: "Never",
    yearsAfter: "years after retirement",
    probabilityInterval: "95% MC interval · ever borrowing",
    timeInterval: "95% MC interval · time borrowing",
    zeroNote: "Borrowing is analytically impossible when ζ ≤ 1.",
    intervalNote:
      "Intervals cover Monte Carlo uncertainty only. Borrowing estimates also depend on the time step and crossing approximations.",
    unavailable: "Unavailable",
    etaAbout: "About",
    etaLeft: "left",
  },
  de: {
    eyebrow: "DIE DETAILS ERKUNDEN",
    title: "Raum für Fragen",
    intro:
      "Vergleichen Sie Varianten Ihrer Konfiguration und speichern Sie Ihre Arbeit.",
    comparison: "IHR VERGLEICH",
    comparisonTitle: "Vergleichstabelle",
    comparisonDescription:
      "Vergleichen Sie Varianten mit denselben Markt- und Personeneinstellungen. Exportiert wird nur die aktuelle Tabelle.",
    settings: "Simulationseinstellungen",
    exportTable: "Tabelle exportieren",
    customize: "INDIVIDUELL ANPASSEN",
    closeSettings: "Simulationseinstellungen schließen",
    settingsLead:
      "Diese Einstellungen gelten auch für die Auswertung und für zukünftige Simulationsläufe.",
    detail: "Simulationsdetails",
    tableType: "TABELLENTYP",
    withdrawalTable: "Auszahlung, Risiko & Strategie",
    feasibilityTable: "Zulässigkeitssensitivität",
    add: "Zeile hinzufügen",
    withdrawalDescription:
      "Vergleichen Sie Auszahlungen und Risiken für unbeschränkte und projizierte Strategien.",
    feasibilityDescription:
      "Variieren Sie Risiko oder Auszahlung und die Verarmungsgrenze für die unbeschränkte Strategie.",
    otherShared: "Alle übrigen Einstellungen werden gemeinsam verwendet.",
    withdrawalNote:
      "Der CE-Wert gilt auch bei projizierten Zeilen für die unbeschränkte Strategie. Das GM-Risiko bezieht sich bis zum CE-Horizont auf die gewählte Strategie.",
    feasibilityNote:
      "ζ ≤ 1 zeigt globale Zulässigkeit an, wenn alle Merton-Komponenten nichtnegativ und mindestens eine positiv ist. Negative Komponenten erfordern im riskanten Bereich Leerverkäufe. Kreditwahrscheinlichkeit und -dauer verwenden GM-Sterblichkeit; zeilenspezifische Verarmungsgrenzen beginnen mit dem gemeinsamen Wert.",
    projectedUnavailable:
      "Dieser Vergleich ist nur für die unbeschränkte Strategie verfügbar. Deaktivieren Sie die Projektion. Die projizierte Strategie verhindert Kreditaufnahme und Leerverkäufe durch Beschränkung der Anteile auf das Simplex.",
    shortUnavailable:
      "Dieser Vergleich ist nicht verfügbar, weil eine Merton-Komponente negativ ist. Die unbeschränkte Strategie erfordert unterhalb der sicheren Grenze Leerverkäufe.",
    variation: "VARIANTE",
    riskOrWithdrawal: "RISIKO ODER AUSZAHLUNG",
    policy: "STRATEGIE",
    ceResult: "CE-ERGEBNIS",
    annualWithdrawal: "JÄHRLICHE AUSZAHLUNG",
    ceRisk: "LEBENSLANGES CE-RISIKO",
    withdrawalOrRisk: "AUSZAHLUNG / CE-RISIKO",
    gmRisk: "GESCHÄTZTES GM-RISIKO",
    impoverishment: "VERARMUNGSGRENZE",
    bandwidth: "RELATIVE BANDBREITE ζ",
    everBorrow: "KREDITWAHRSCHEINLICHKEIT (GM)",
    borrowingTime: "ERWARTETE KREDITDAUER (GM)",
    gmStatus: "GM-STATUS",
    status: "STATUS",
    targetRisk: "Zielrisiko",
    withdrawal: "Auszahlung",
    unconstrained: "Unbeschränkt",
    projected: "Projiziert",
    yearUnit: "€ / Jahr",
    perYear: "/ Jahr",
    years: "Jahre",
    hideDetails: "Details ausblenden",
    viewDetails: "Details anzeigen",
    editName: "Variantennamen bearbeiten",
    nameLabel: (id) => `Name der Variante ${id}`,
    typeLabel: (id) => `Eingabeart der Variante ${id}`,
    policyLabel: (id) => `Strategie der Variante ${id}`,
    removeLabel: (id) => `Variante ${id} entfernen`,
    valueLabel: (id, risk) =>
      `Eingabewert der Variante ${id}, ${risk ? "Prozent" : "Euro pro Jahr"}`,
    thresholdLabel: (id) => `Verarmungsgrenze der Variante ${id} in Euro`,
    deleteConfirm: "Diese Variante und ihre berechneten Werte löschen?",
    stopBatch: "Abbruch nach aktuellem Stapel…",
    etaBatch: "Restzeit nach dem ersten Stapel",
    finishing: "Abschluss läuft…",
    previous: "Frühere Konfiguration oder Zeileneingaben",
    stopBatches: "Abbruch nach den aktuellen Stapeln…",
    estimateOverall: "Gesamtrestzeit wird geschätzt…",
    progress: "Fortschritt der Tabellensimulation",
    batches: "Stapel",
    changed:
      "Einstellungen geändert; der Lauf verwendet weiterhin seine erfasste Konfiguration.",
    withdrawalFooter:
      "CE-Werte sind analytisch; das GM-Risiko wird bis zum CE-Horizont geschätzt.",
    feasibilityFooter:
      "Kreditschätzungen verwenden GM-Sterblichkeit bis zum CE-Horizont.",
    cancelRows: "Zeilen abbrechen",
    computeRows: "▶  Zeilen berechnen",
    save: "SPEICHERN UND WIEDERHERSTELLEN",
    importExport: "Import & Export",
    saveDescription: "Bewahren Sie Konfiguration und Ergebnisse getrennt auf.",
    recreate: "KONFIGURATION WIEDERHERSTELLEN",
    importSetup: "Konfiguration importieren oder exportieren",
    output: "ERGEBNISSE SICHERN",
    exportResults: "Ergebnisse exportieren",
    resultsDescription:
      "Speichern Sie die berechneten Tabellen und Diagnosen zusammen mit der zugehörigen Konfiguration und dem Simulationslauf.",
    setupDescription:
      "Speichern oder laden Sie Ihre Eingaben, Tabellenvarianten und Laufeinstellungen. Anpassungen und Ergebnisse sind nicht enthalten. Mehr zu",
    setupLink: "Konfiguration und Ergebnissen",
    analyticalZero: "Analytisch null",
    mcUnavailable: "Monte-Carlo-Intervall nicht verfügbar",
    calculatingGM: "GM-Risiko wird berechnet",
    borrowingAtRetirement: "Kreditaufnahme bei Ruhestandsbeginn",
    yes: "Ja",
    no: "Nein",
    lastBorrow: "Letztmöglicher Kreditzeitpunkt",
    never: "Nie",
    yearsAfter: "Jahre nach Ruhestandsbeginn",
    probabilityInterval: "95%-MC-Intervall · Kreditwahrscheinlichkeit",
    timeInterval: "95%-MC-Intervall · Kreditdauer",
    zeroNote: "Bei ζ ≤ 1 ist Kreditaufnahme analytisch ausgeschlossen.",
    intervalNote:
      "Intervalle beschreiben ausschließlich Monte-Carlo-Unsicherheit. Kreditschätzungen hängen auch von Zeitschritt und Grenzübertrittsnäherungen ab.",
    unavailable: "Nicht verfügbar",
    etaAbout: "Etwa",
    etaLeft: "verbleibend",
  },
};
