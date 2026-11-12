import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LanguageProvider,
  useLanguage,
} from "../src/components/LanguageContext";
import { shellMessages } from "../src/lib/i18n/messages";

/** Render selected shell text through the context used by future panels. */
function SampleNavigation() {
  const { language, shell } = useLanguage();

  return <nav lang={language}>{shell.navigation.evaluation}</nav>;
}

test("both languages provide the same shell and navigation keys", () => {
  assert.deepEqual(
    Object.keys(shellMessages.en).sort(),
    Object.keys(shellMessages.de).sort(),
  );
  assert.deepEqual(
    Object.keys(shellMessages.en.navigation).sort(),
    Object.keys(shellMessages.de.navigation).sort(),
  );
  assert.notEqual(
    shellMessages.en.navigation.evaluation,
    shellMessages.de.navigation.evaluation,
  );
});

test("selected language is available to nested components", () => {
  const english = renderToStaticMarkup(
    <LanguageProvider language="en">
      <SampleNavigation />
    </LanguageProvider>,
  );
  const german = renderToStaticMarkup(
    <LanguageProvider language="de">
      <SampleNavigation />
    </LanguageProvider>,
  );

  assert.match(english, /lang="en">Evaluation/);
  assert.match(german, /lang="de">Auswertung/);
});
