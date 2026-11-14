"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageContext";
import { gettingStartedMessages } from "../lib/i18n/getting-started";
import type { Language } from "../lib/i18n/messages";
import {
  dismissWelcomePermanently,
  shouldShowWelcome,
} from "../lib/options/welcome-preference";

/** Introduce the simulator on first visit and link to the full guide. */
export function WelcomeDialog({
  onOpenGuide,
  onLanguageChange,
  onStorageError,
}: {
  onOpenGuide: () => void;
  onLanguageChange: (language: Language) => void;
  onStorageError: (message: string) => void;
}) {
  const { language } = useLanguage();
  const text = gettingStartedMessages[language];
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const [doNotShow, setDoNotShow] = useState(false);

  // Read only in the browser, after hydration and independently of saved setups.
  useEffect(() => {
    try {
      setVisible(shouldShowWelcome(window.localStorage));
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!visible || !element) return;

    if (!element.open) element.showModal();

    return () => {
      if (element.open) element.close();
    };
  }, [visible]);

  /** Close for this visit and persist the opt-out only when it was selected. */
  function dismiss() {
    if (doNotShow) {
      try {
        dismissWelcomePermanently(window.localStorage);
      } catch {
        onStorageError(text.storageError);
      }
    }

    dialog.current?.close();
    setVisible(false);
  }

  return (
    <dialog
      ref={dialog}
      className="help-dialog welcome-dialog"
      aria-labelledby="welcome-title"
      lang={language}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <div className="welcome-heading">
        <div>
          <span className="tiny-label">{text.welcomeLabel}</span>
          <h2 id="welcome-title">{text.welcomeTitle}</h2>
        </div>
        <label className="welcome-language">
          <span className="visually-hidden">{text.language}</span>
          <select
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value === "de" ? "de" : "en")
            }
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </label>
      </div>
      <p>{text.purpose}</p>
      <p>
        <strong>{text.workflow}</strong>
      </p>
      <ol className="welcome-steps">
        {text.welcomeSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>{text.limitation}</p>
      <button
        type="button"
        className="term-link welcome-guide-link"
        onClick={() => {
          dismiss();
          onOpenGuide();
        }}
      >
        {text.guideLink} →
      </button>
      <div className="welcome-footer">
        <label className="welcome-dismiss">
          <input
            type="checkbox"
            checked={doNotShow}
            onChange={(event) => setDoNotShow(event.target.checked)}
          />
          {text.doNotShow}
        </label>
        <button
          type="button"
          className="button button-primary"
          onClick={dismiss}
        >
          {text.continue}
        </button>
      </div>
    </dialog>
  );
}
