import type { Language } from "./messages";

/** Plain-language introduction and detailed guidance for the four workflow steps. */
export interface GettingStartedMessages {
  welcomeLabel: string;
  welcomeTitle: string;
  purpose: string;
  workflow: string;
  welcomeSteps: readonly string[];
  limitation: string;
  guideLink: string;
  continue: string;
  doNotShow: string;
  storageError: string;
  language: string;
  whyLabel: string;
  whyTitle: string;
  whyParagraphs: readonly string[];
  guideLabel: string;
  guideTitle: string;
  steps: readonly {
    title: string;
    paragraphs: readonly string[];
    action: string;
  }[];
}

/** The manuscript's motivation and the website's workflow, translated together. */
export const gettingStartedMessages: Record<Language, GettingStartedMessages> =
  {
    en: {
      welcomeLabel: "WELCOME TO STILLWELL",
      welcomeTitle: "Plan withdrawals for retirement",
      purpose:
        "Explore how much you could withdraw each year and the risk that your savings fall below a level you choose while you are alive. You can choose a risk or enter a withdrawal amount.",
      workflow: "Start with the example, then make it your own:",
      welcomeSteps: [
        "Review the market assumptions or import historical prices.",
        "Enter your retirement details and the savings level you want to protect.",
        "Choose a withdrawal or target risk, then run the simulation.",
        "Compare alternatives and export your setup or results.",
      ],
      limitation:
        "Results depend on your assumptions and the model. They are estimates, not predictions or guarantees.",
      guideLink: "Read the detailed guide in Dictionary & help",
      continue: "Get started",
      doNotShow: "Do not show this again on this browser",
      storageError:
        "This browser could not save your welcome-screen preference.",
      language: "Language",
      whyLabel: "WHY THIS MATTERS",
      whyTitle: "Planning income for an uncertain retirement",
      whyParagraphs: [
        "Retirement can last many years, but no one knows exactly how long. At the same time, investments fluctuate and inflation changes what money can buy. A fixed rule for everyone cannot reflect each person's savings, spending and circumstances.",
        "The question is how much income your savings might support while limiting the chance of falling below a level you consider unacceptable. That level need not be zero: you may want to preserve a reserve for essential or unexpected expenses, rather than wait until all your savings are gone.",
        "The simulator compares choices under a simplified model of markets and longevity. It can help you understand trade-offs, but it cannot predict your lifespan or future returns, or guarantee that your savings will last.",
      ],
      guideLabel: "STEP-BY-STEP GUIDE",
      guideTitle: "How to use the simulator",
      steps: [
        {
          title: "Set up the market",
          action: "Open Market & investor",
          paragraphs: [
            "Open Market & investor and select Market. The example starts with two assets. For each, enter a name, expected annual growth and volatility; volatility describes how much returns fluctuate. Enter the nominal risk-free rate and your inflation assumption as annual percentages.",
            "Under the asset list, open the correlation matrix to describe how assets move together. You may use up to ten assets. Alternatively, import a CSV with dates and adjusted closing prices already expressed in euros. The app estimates the market inputs and shows uncertainty for the imported data.",
            "These are assumptions, not promises. Historical estimates depend on the data and period chosen and do not predict future returns. The market checks flag inputs that cannot be used by the model.",
          ],
        },
        {
          title: "Set up the investor",
          action: "Open Market & investor",
          paragraphs: [
            "Select Investor & mortality. Enter your birth year and expected retirement year, then choose the mortality table and longevity scenario. The cohort information describes a population, not your personal lifespan.",
            "Enter the savings available at retirement and an impoverishment level below that amount. This is the threshold you consider too low; for example, it could preserve a reserve for essential or unexpected expenses. The simulator models the chance of reaching it while you are alive. The smallest supported threshold is €1.",
            "The mortality models fit automatically as relevant inputs change. You can review the survival chart and fit diagnostics on this tab; if a fit fails, check the inputs and retry.",
          ],
        },
        {
          title: "Choose a withdrawal and run",
          action: "Open Evaluation",
          paragraphs: [
            "Open Evaluation and Simulation settings. Choose a target risk to calculate an annual withdrawal, or enter a withdrawal to see its corresponding model risk. The amounts are in today's purchasing power.",
            "The analytical CE relationship uses the unconstrained strategy. That strategy can involve borrowing or short selling. Turn on projection to compare a strategy that prevents both; the projection is a feasible comparison, not a claim of constrained optimality.",
            "Select Run simulation to estimate risk under GM mortality and explore the available charts. Simulation settings control paths and time step. Monte Carlo intervals describe sampling uncertainty, not uncertainty in assumptions or all numerical errors; displayed GM results cover the simulation horizon.",
          ],
        },
        {
          title: "Compare and save",
          action: "Open Data & tables",
          paragraphs: [
            "Open Data & tables to compare variations using shared market, investor and simulation settings. Add rows, choose each row's inputs and compute them. Changing relevant settings can make earlier results need updating.",
            "Export a setup to save editable inputs and table configurations. Export results separately; table and chart menus also offer downloads. Browser storage normally restores your inputs, but not previous simulation results. Imported historical price files and their diagnostics are not included in the setup export.",
          ],
        },
      ],
    },
    de: {
      welcomeLabel: "WILLKOMMEN BEI STILLWELL",
      welcomeTitle: "Auszahlungen im Ruhestand planen",
      purpose:
        "Erkunden Sie, wie viel Sie sich jährlich auszahlen könnten und wie groß das Risiko ist, dass Ihr Vermögen zu Lebzeiten unter eine von Ihnen gewählte Grenze fällt. Sie können ein Risiko vorgeben oder einen Auszahlungsbetrag eingeben.",
      workflow: "Beginnen Sie mit dem Beispiel und passen Sie es an:",
      welcomeSteps: [
        "Prüfen Sie die Marktannahmen oder importieren Sie historische Kurse.",
        "Geben Sie Ihre Ruhestandsdaten und die gewünschte Vermögensgrenze ein.",
        "Wählen Sie eine Auszahlung oder ein Zielrisiko und starten Sie die Simulation.",
        "Vergleichen Sie Alternativen und exportieren Sie Konfiguration oder Ergebnisse.",
      ],
      limitation:
        "Die Ergebnisse hängen von Ihren Annahmen und dem Modell ab. Sie sind Schätzungen, keine Vorhersagen oder Garantien.",
      guideLink: "Ausführliche Anleitung in Glossar & Hilfe lesen",
      continue: "Loslegen",
      doNotShow: "In diesem Browser nicht mehr anzeigen",
      storageError:
        "Die Einstellung für den Willkommensdialog konnte in diesem Browser nicht gespeichert werden.",
      language: "Sprache",
      whyLabel: "WARUM DAS WICHTIG IST",
      whyTitle: "Einkommen für einen ungewissen Ruhestand planen",
      whyParagraphs: [
        "Der Ruhestand kann viele Jahre dauern, aber niemand weiß genau, wie lange. Gleichzeitig schwanken Anlagen und die Inflation verändert die Kaufkraft. Eine feste Regel für alle kann persönliche Ersparnisse, Ausgaben und Lebensumstände nicht berücksichtigen.",
        "Die Frage ist, wie viel Einkommen Ihr Vermögen ermöglichen könnte, während Sie das Risiko begrenzen, unter eine für Sie nicht mehr akzeptable Vermögensgrenze zu fallen. Diese Grenze muss nicht null sein: Vielleicht möchten Sie eine Reserve für notwendige oder unerwartete Ausgaben bewahren, statt erst das Aufbrauchen Ihres gesamten Vermögens zu betrachten.",
        "Der Simulator vergleicht Möglichkeiten anhand eines vereinfachten Modells für Märkte und Lebenserwartung. Er kann Zielkonflikte verdeutlichen, aber weder Ihre Lebensdauer oder künftige Renditen vorhersagen noch garantieren, dass Ihr Vermögen ausreicht.",
      ],
      guideLabel: "SCHRITT-FÜR-SCHRITT-ANLEITUNG",
      guideTitle: "So nutzen Sie den Simulator",
      steps: [
        {
          title: "Markt konfigurieren",
          action: "Markt & Person öffnen",
          paragraphs: [
            "Öffnen Sie Markt & Person und wählen Sie Markt. Das Beispiel beginnt mit zwei Anlagen. Geben Sie für jede Anlage einen Namen, das erwartete jährliche Wachstum und die Volatilität ein; die Volatilität beschreibt, wie stark Renditen schwanken. Geben Sie den nominalen risikofreien Zinssatz und Ihre Inflationsannahme als jährliche Prozentwerte ein.",
            "Öffnen Sie unter der Anlageliste die Korrelationsmatrix, um das gemeinsame Verhalten der Anlagen zu beschreiben. Sie können bis zu zehn Anlagen verwenden. Alternativ importieren Sie eine CSV-Datei mit Datum und bereits in Euro vorliegenden angepassten Schlusskursen. Die App schätzt daraus die Markteingaben und zeigt deren Unsicherheit.",
            "Dies sind Annahmen, keine Zusagen. Historische Schätzungen hängen von den Daten und dem gewählten Zeitraum ab und sagen künftige Renditen nicht voraus. Die Marktprüfung kennzeichnet Eingaben, die das Modell nicht verwenden kann.",
          ],
        },
        {
          title: "Persönliche Daten eingeben",
          action: "Markt & Person öffnen",
          paragraphs: [
            "Wählen Sie Person & Sterblichkeit. Geben Sie Ihr Geburtsjahr und das erwartete Ruhestandsjahr ein und wählen Sie die Sterbetafel und das Langlebigkeitsszenario. Die Kohortendaten beschreiben eine Bevölkerung, nicht Ihre persönliche Lebensdauer.",
            "Geben Sie Ihr verfügbares Vermögen zum Ruhestandsbeginn und eine darunterliegende Verarmungsgrenze ein. Diese kann zum Beispiel für eine gewünschte Reserve für notwendige oder unerwartete Ausgaben stehen. Der Simulator modelliert das Risiko, diese Grenze zu Lebzeiten zu erreichen. Die kleinste unterstützte Grenze beträgt 1 €.",
            "Die Sterblichkeitsmodelle werden bei relevanten Eingabeänderungen automatisch angepasst. Auf diesem Reiter können Sie Überlebenskurve und Anpassungsdiagnostik prüfen; falls eine Anpassung fehlschlägt, prüfen Sie die Eingaben und versuchen Sie es erneut.",
          ],
        },
        {
          title: "Auszahlung wählen und Simulation starten",
          action: "Auswertung öffnen",
          paragraphs: [
            "Öffnen Sie Auswertung und die Simulationseinstellungen. Wählen Sie ein Zielrisiko, um eine jährliche Auszahlung zu berechnen, oder geben Sie eine Auszahlung ein, um das zugehörige Modellrisiko zu sehen. Die Beträge sind in heutiger Kaufkraft angegeben.",
            "Der analytische CE-Zusammenhang verwendet die unbeschränkte Strategie. Diese kann Kreditaufnahme oder Leerverkäufe beinhalten. Mit der Projektion vergleichen Sie eine Strategie, die beides verhindert; sie ist eine zulässige Vergleichsstrategie und nicht nachweislich beschränkt optimal.",
            "Starten Sie die Simulation, um das Risiko unter GM-Sterblichkeit zu schätzen und die Diagramme zu betrachten. Die Einstellungen bestimmen Pfadanzahl und Zeitschritt. Monte-Carlo-Intervalle beschreiben Stichprobenunsicherheit, nicht die Unsicherheit der Annahmen oder alle numerischen Fehler; das angezeigte GM-Ergebnis reicht bis zum Simulationshorizont.",
          ],
        },
        {
          title: "Vergleichen und speichern",
          action: "Daten & Tabellen öffnen",
          paragraphs: [
            "Unter Daten & Tabellen vergleichen Sie Varianten mit gemeinsamen Markt-, Personen- und Simulationseinstellungen. Fügen Sie Zeilen hinzu, wählen Sie deren Eingaben und berechnen Sie sie. Relevante Änderungen können eine Aktualisierung früherer Ergebnisse erfordern.",
            "Exportieren Sie eine Konfiguration, um Eingaben und Tabellen zu speichern. Ergebnisse werden getrennt exportiert; auch Tabellen und Diagramme können heruntergeladen werden. Der Browser stellt normalerweise Ihre Eingaben wieder her, aber keine früheren Simulationsergebnisse. Importierte Kursdateien und deren Diagnostik sind nicht im Konfigurationsexport enthalten.",
          ],
        },
      ],
    },
  };
