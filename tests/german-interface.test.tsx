import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "../src/components/LanguageContext";
import { DraftContext } from "../src/components/common";
import { HelpView } from "../src/components/HelpView";
import { QuickStart } from "../src/components/QuickStart";
import { SimulationRunControl } from "../src/components/evaluation/SimulationRunControl";
import { StatusBadge } from "../src/components/StatusBadge";
import { PanelHelp } from "../src/components/PanelHelp";
import { SimulationDetailFields } from "../src/components/SimulationDetailFields";
import { initialSimulationDraft } from "../src/lib/options/simulation-options";

/** Render a translated workspace component with its normal navigation context. */
function renderGerman(element: React.ReactNode): string {
  return renderToStaticMarkup(
    <LanguageProvider language="de">
      <DraftContext.Provider value={{ navigate: () => {}, notice: () => {} }}>
        {element}
      </DraftContext.Provider>
    </LanguageProvider>,
  );
}

test("quick start and contextual help use German explanations", () => {
  assert.match(renderGerman(<QuickStart />), /Markt konfigurieren/);
  const help = renderGerman(<PanelHelp panel="timing" />);
  assert.match(help, /bedingte Aktualisierung/);
  assert.match(help, /Simulationshorizont/);
});

test("translated numerical controls retain language-independent values", () => {
  const draft = initialSimulationDraft();
  const html = renderGerman(
    <SimulationDetailFields
      simulation={draft.simulation}
      onChange={() => {}}
      idPrefix="test"
    />,
  );

  assert.match(html, /Anzahl der Pfade/);
  assert.match(html, /value="monthly"/);
  assert.match(html, /Monatlich/);
  assert.match(html, /value="auto"/);
});

test("run controls and status labels are translated", () => {
  const html = renderGerman(
    <SimulationRunControl
      run={null}
      stale={false}
      errors={[]}
      settingsOpen={false}
      onToggleSettings={() => {}}
      onStart={() => {}}
      onCancel={() => {}}
    />,
  );

  assert.match(html, /Simulation starten/);
  assert.match(
    renderGerman(<StatusBadge status="not-calculated" />),
    /NICHT BERECHNET/,
  );
});

test("German dictionary renders translated content and unchanged formulas", () => {
  const html = renderGerman(<HelpView selectedTerm={null} />);

  assert.match(html, /Verarmungsgrenze/);
  assert.match(html, /Sichere Grenze/);
  assert.match(html, /Technische Details/);
  assert.match(html, /katex/);
});

test("German setup and comparison controls preserve internal option values", async () => {
  const { Setup } = await import("../src/components/setup/Setup");
  const { DataView } = await import("../src/components/DataView");
  const { SimulationDraftProvider } =
    await import("../src/components/SimulationDraftContext");
  const setup = renderGerman(
    <SimulationDraftProvider>
      <Setup />
    </SimulationDraftProvider>,
  );
  const table = renderGerman(
    <SimulationDraftProvider>
      <DataView />
    </SimulationDraftProvider>,
  );

  assert.match(setup, /Marktannahmen/);
  assert.match(setup, /Geburtsjahr/);
  assert.match(setup, /value="female"/);
  assert.match(table, /Vergleichstabelle/);
  assert.match(table, /value="Target risk"/);
  assert.match(table, /value="Unconstrained"/);
});

test("German chart and validation labels retain data and error details", async () => {
  const { ChartExport, chartTracesCsv } =
    await import("../src/components/ChartExport");
  const { validationMessage } = await import("../src/lib/i18n/validation");
  const { setupFileError } = await import("../src/lib/i18n/setup-actions");
  const html = renderGerman(
    <ChartExport
      element={{ current: null }}
      filename="example"
      context={{ title: "Test", xUnit: "years", yUnit: "probability" }}
    />,
  );
  const csv = chartTracesCsv([{ name: "Serie", x: [1], y: [0.2] }], {
    title: "Test",
    xUnit: "years",
    yUnit: "probability",
  });

  assert.match(html, /Diagramm exportieren/);
  assert.match(
    csv,
    /chart,view,series,point,x,x_unit,y,y_unit,bar_width_x_units/,
  );
  assert.match(
    validationMessage("Enter a positive initial capital in euros.", "de"),
    /positives Anfangskapital/,
  );
  assert.match(
    validationMessage("Invalid price for TEST on 2020-01-01.", "de"),
    /TEST.*2020-01-01/,
  );
  assert.match(
    setupFileError("The file is not valid JSON.", "de"),
    /gültiges JSON/,
  );
});

test("German Evaluation retains numerical selection semantics", async () => {
  const { Evaluation } =
    await import("../src/components/evaluation/Evaluation");
  const { SimulationDraftProvider } =
    await import("../src/components/SimulationDraftContext");
  const html = renderGerman(
    <SimulationDraftProvider>
      <Evaluation />
    </SimulationDraftProvider>,
  );

  assert.match(html, /Ihre Möglichkeiten im Ruhestand/);
  assert.match(
    html,
    /Vergleichen Sie Auszahlungen, Risiken und Anlagestrategien/,
  );
  assert.match(html, /Verarmungsgrenze/);
  assert.match(html, /Simulation starten/);
  assert.match(html, /Globale Zulässigkeit/);
});
