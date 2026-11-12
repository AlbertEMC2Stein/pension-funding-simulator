import type { Language } from "./messages";

/** Copy for the numerical settings shared by Evaluation and comparison tables. */
export interface SimulationSettingsMessages {
  paths: string;
  pathUnit: string;
  timeStep: string;
  monthly: string;
  fortnightly: string;
  weekly: string;
  batch: string;
  automatic: string;
  seed: string;
  aboutSeed: string;
  seedBefore: string;
  seedAfter: string;
  settingsLink: string;
}

/** English and German labels and reproducibility guidance. */
export const simulationSettingsMessages: Record<
  Language,
  SimulationSettingsMessages
> = {
  en: {
    paths: "Number of paths",
    pathUnit: "paths",
    timeStep: "Time step",
    monthly: "Monthly",
    fortnightly: "Fortnightly",
    weekly: "Weekly",
    batch: "Batch size",
    automatic: "Automatic",
    seed: "Random seed",
    aboutSeed: "About the random seed",
    seedBefore: "Keep the",
    seedAfter:
      ", path count and batch size to repeat random draws. Table rows use separate streams. Results can differ across backends. Learn about",
    settingsLink: "simulation settings",
  },
  de: {
    paths: "Anzahl der Pfade",
    pathUnit: "Pfade",
    timeStep: "Zeitschritt",
    monthly: "Monatlich",
    fortnightly: "Zweiwöchentlich",
    weekly: "Wöchentlich",
    batch: "Stapelgröße",
    automatic: "Automatisch",
    seed: "Zufallsstartwert",
    aboutSeed: "Über den Zufallsstartwert",
    seedBefore: "Behalten Sie den",
    seedAfter:
      ", die Pfadanzahl und die Stapelgröße bei, um die Zufallszahlen zu wiederholen. Tabellenzeilen verwenden getrennte Zufallsfolgen. Ergebnisse können sich zwischen Rechenplattformen unterscheiden. Mehr zu den",
    settingsLink: "Simulationseinstellungen",
  },
};
