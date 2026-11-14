import assert from "node:assert/strict";
import { test } from "node:test";
import { resourceLoadError } from "../src/lib/network/resource-errors";
import { validationMessage } from "../src/lib/i18n/validation";

test("loading failures give actionable, translated connectivity guidance", () => {
  const offline = resourceLoadError("Could not load cohort data.", true);
  const online = resourceLoadError("Could not load cohort data.", false);

  assert.match(offline, /browser reports that it is offline/);
  assert.match(offline, /Reconnect and try again/);
  assert.match(online, /Check your internet connection/);
  assert.doesNotMatch(online, /reports that it is offline/);
  assert.equal(
    validationMessage(offline, "de"),
    "Die Kohortendaten konnten nicht geladen werden. Ihr Browser meldet, dass er offline ist. Stellen Sie die Internetverbindung wieder her und versuchen Sie es erneut.",
  );
  assert.match(
    validationMessage(online, "de"),
    /Prüfen Sie Ihre Internetverbindung/,
  );
});
