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
  assert.match(renderGerman(<QuickStart />), /Schnellstart/);
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
