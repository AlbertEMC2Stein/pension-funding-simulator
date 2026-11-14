import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "../src/components/LanguageContext";
import { WelcomeDialog } from "../src/components/WelcomeDialog";
import { HelpView } from "../src/components/HelpView";
import { DraftContext } from "../src/components/common";
import {
  dismissWelcomePermanently,
  shouldShowWelcome,
  WELCOME_DISMISSED_KEY,
} from "../src/lib/options/welcome-preference";

test("the welcome preference is stored only after an explicit opt-out", () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };

  assert.equal(shouldShowWelcome(storage), true);
  entries.set(WELCOME_DISMISSED_KEY, "invalid");
  assert.equal(shouldShowWelcome(storage), true);
  dismissWelcomePermanently(storage);
  assert.equal(shouldShowWelcome(storage), false);
});

test("the introduction and expanded guide are available in both languages", () => {
  for (const language of ["en", "de"] as const) {
    const welcome = renderToStaticMarkup(
      <LanguageProvider language={language}>
        <WelcomeDialog
          onOpenGuide={() => {}}
          onLanguageChange={() => {}}
          onStorageError={() => {}}
        />
      </LanguageProvider>,
    );
    const help = renderToStaticMarkup(
      <LanguageProvider language={language}>
        <DraftContext.Provider value={{ navigate: () => {}, notice: () => {} }}>
          <HelpView selectedTerm={null} />
        </DraftContext.Provider>
      </LanguageProvider>,
    );

    assert.match(
      welcome,
      language === "en" ? /Do not show this again/ : /nicht mehr anzeigen/,
    );
    assert.match(
      welcome,
      language === "en"
        ? /detailed guide in Dictionary/
        : /Anleitung in Glossar/,
    );
    assert.match(
      help,
      language === "en"
        ? /reserve for essential or unexpected expenses/
        : /Reserve für notwendige oder unerwartete Ausgaben/,
    );
    assert.ok(
      help.indexOf('id="detailed-guide-heading"') <
        help.indexOf('id="quick-start-heading"'),
    );
    assert.equal((help.match(/class="quick-start-step"/g) ?? []).length, 4);
  }
});
