import assert from "node:assert/strict";
import { test } from "node:test";
import {
  setupActionMessages,
  setupFileError,
} from "../src/lib/i18n/setup-actions";
import { validationMessage } from "../src/lib/i18n/validation";

test("worker and numerical errors have German translations", () => {
  const messages = [
    "GM fitting failed.",
    "CE fitting failed.",
    "A simulation is already running in this worker.",
    "Simulation failed.",
    "Quadrature did not converge for this configuration.",
    "Could not calculate the Student-t confidence interval.",
  ];

  for (const message of messages) {
    assert.notEqual(validationMessage(message, "de"), message);
    assert.equal(validationMessage(message, "en"), message);
  }
});

test("combined validation and setup errors translate each issue", () => {
  const issues =
    "Enter a positive initial capital in euros. Enter an impoverishment level of at least €1.";
  const translated = validationMessage(issues, "de");

  assert.equal(
    translated,
    "Geben Sie ein positives Anfangskapital in Euro ein. Geben Sie eine Verarmungsgrenze von mindestens 1 € ein.",
  );
  assert.equal(
    setupFileError(`Invalid setup inputs: ${issues}`, "de"),
    `Ungültige Konfigurationseingaben: ${translated}`,
  );
  assert.equal(
    setupFileError(setupActionMessages.en.tooLarge, "de"),
    setupActionMessages.de.tooLarge,
  );
});

test("dynamic error translations preserve technical details and unknown errors", () => {
  assert.equal(
    validationMessage("Could not load cohort data (404).", "de"),
    "Die Kohortendaten konnten nicht geladen werden (HTTP 404).",
  );
  assert.equal(
    validationMessage(
      "Could not initialize a TensorFlow backend (cpu: unavailable).",
      "de",
    ),
    "Es konnte kein TensorFlow-Backend initialisiert werden (cpu: unavailable).",
  );
  assert.equal(
    validationMessage("alpha must be finite and positive.", "de"),
    "alpha muss endlich und positiv sein.",
  );
  assert.equal(
    validationMessage("Unknown driver error", "de"),
    "Unknown driver error",
  );
});
