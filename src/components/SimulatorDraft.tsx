"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { DraftContext, type View } from "./common";
import { LanguageProvider } from "./LanguageContext";
import { shellMessages } from "../lib/i18n/messages";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  readDisplayPreferences,
  writeDisplayPreferences,
  type DisplayPreferences,
} from "../lib/options/display-preferences";
import { Evaluation } from "./evaluation/Evaluation";
import { Setup } from "./setup/Setup";
import { DataView } from "./DataView";
import { HelpView } from "./HelpView";
import {
  SimulationDraftProvider,
  useSimulationDraft,
} from "./SimulationDraftContext";

/** Navigation entries and their presentation order in the workspace rail. */
const navigation: { id: View; icon: string }[] = [
  { id: "evaluation", icon: "◫" },
  { id: "setup", icon: "◉" },
  { id: "data", icon: "▤" },
  { id: "help", icon: "ⓘ" },
];
// The constant guard lets production builds discard the development module.
const DeveloperView =
  process.env.NODE_ENV === "development"
    ? lazy(() => import("./dev/DeveloperView"))
    : null;
const visibleNavigation = DeveloperView
  ? [...navigation, { id: "developer" as const, icon: "⌘" }]
  : navigation;

/** Keep panels mounted during navigation, but recreate them after a setup import. */
function WorkspacePanels({ view, term }: { view: View; term: string | null }) {
  const { workspaceRevision } = useSimulationDraft();

  return (
    <div key={workspaceRevision}>
      <div hidden={view !== "evaluation"}>
        <Evaluation />
      </div>
      <div hidden={view !== "setup"}>
        <Setup />
      </div>
      <div hidden={view !== "data"}>
        <DataView />
      </div>
      <div hidden={view !== "help"}>
        <HelpView selectedTerm={term} />
      </div>
      {DeveloperView && (
        <div hidden={view !== "developer"}>
          <Suspense fallback={null}>
            <DeveloperView />
          </Suspense>
        </div>
      )}
    </div>
  );
}

/** Explain when browser storage could not recover or save the editable setup. */
function DraftStorageNotice() {
  const { storageWarning } = useSimulationDraft();
  return storageWarning ? (
    <p className="draft-storage-warning" role="alert">
      {storageWarning}
    </p>
  ) : null;
}

/**
 * Application shell: switches workspace panels and supplies navigation and
 * temporary notices. Display preferences are stored independently of editable
 * setup data, which are managed by the shared draft provider.
 */
export function SimulatorDraft() {
  const [view, setView] = useState<View>("evaluation");
  const [display, setDisplay] = useState<DisplayPreferences>(
    DEFAULT_DISPLAY_PREFERENCES,
  );
  const dark = display.theme === "dark";
  const text = shellMessages[display.language];
  const [toast, setToast] = useState("");
  // When navigation originates from a term link, HelpView focuses this entry.
  const [term, setTerm] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Replace any existing toast and restart its dismissal timer. */
  const notice = useCallback((message: string) => {
    setToast(message);

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => setToast(""), 3500);
  }, []);
  // Read only after hydration; never overwrite saved choices with initial defaults.
  useEffect(() => {
    try {
      setDisplay(readDisplayPreferences(window.localStorage));
    } catch {
      notice("Display preferences could not be restored from this browser.");
    }
  }, [notice]);

  /** Apply a display choice immediately and retain it for the next visit. */
  function updateDisplay(next: DisplayPreferences) {
    setDisplay(next);

    try {
      writeDisplayPreferences(window.localStorage, next);
      return true;
    } catch {
      notice(shellMessages[next.language].preferenceWriteError);
      return false;
    }
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  /** Switch the visible panel; `nextTerm` optionally targets a help entry. */
  const navigate = useCallback((next: View, nextTerm?: string) => {
    setTerm(nextTerm ?? null);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <LanguageProvider language={display.language}>
      <DraftContext.Provider value={{ navigate, notice }}>
        <SimulationDraftProvider>
          <div className="app-shell">
            <aside
              className="rail"
              lang={display.language}
              aria-label={text.workspace}
            >
              <a
                href="#overview"
                className="brand"
                aria-label={text.home}
                onClick={(event) => {
                  event.preventDefault();
                  navigate("evaluation");
                }}
              >
                <span className="brand-mark">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  stillwell<span className="brand-dot">.</span>
                  <small>PENSION LAB</small>
                </span>
              </a>
              <div className="rail-label">
                {text.workspace.toLocaleUpperCase(display.language)}
              </div>
              <nav className="nav" aria-label={text.workspace}>
                {visibleNavigation.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-item ${view === item.id ? "active" : ""}`}
                    aria-current={view === item.id ? "page" : undefined}
                    onClick={() => navigate(item.id)}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="nav-label">
                      {text.navigation[item.id]}
                    </span>
                  </button>
                ))}
              </nav>
              <div className="rail-bottom">
                <div className="rail-note">
                  <span className="sparkle">✳</span>
                  <strong>{text.railHeadline}</strong>
                  <p>{text.railDescription}</p>
                </div>
                <div className="rail-footer">
                  <span className="status-dot" /> {text.designDraft}{" "}
                  <span>v0.1</span>
                </div>
              </div>
            </aside>
            <main className="main" id="overview">
              <header className="topbar" lang={display.language}>
                <div className="breadcrumb">
                  {text.workspace.toLocaleUpperCase(display.language)}{" "}
                  <span>/</span>{" "}
                  <b>
                    {text.navigation[view].toLocaleUpperCase(display.language)}
                  </b>
                </div>
                <div className="top-actions">
                  <span className="draft-pill">
                    <span /> {text.preview.toLocaleUpperCase(display.language)}
                  </span>
                  <button
                    className="theme-toggle"
                    type="button"
                    aria-pressed={dark}
                    aria-label={dark ? text.switchToLight : text.switchToDark}
                    onClick={() =>
                      updateDisplay({
                        ...display,
                        theme: dark ? "light" : "dark",
                      })
                    }
                  >
                    {dark ? "☀" : "☾"}{" "}
                    <span>{dark ? text.themeLight : text.themeDark}</span>
                  </button>
                  <label className="language-control">
                    <span className="visually-hidden">
                      {text.languageLabel}
                    </span>
                    <select
                      value={display.language}
                      aria-label={text.languageLabel}
                      onChange={(event) => {
                        const language =
                          event.target.value === "de" ? "de" : "en";
                        if (updateDisplay({ ...display, language }))
                          notice(shellMessages[language].languagePartial);
                      }}
                    >
                      <option value="en">EN</option>
                      <option value="de">DE</option>
                    </select>
                  </label>
                </div>
              </header>
              <DraftStorageNotice />
              <WorkspacePanels view={view} term={term} />
              <footer className="page-footer" lang={display.language}>
                <span>
                  STILLWELL <b>✳</b> PENSION LAB
                </span>
                <span>{text.footer.toLocaleUpperCase(display.language)}</span>
              </footer>
            </main>
          </div>
          <div
            className={`toast ${toast ? "visible" : ""}`}
            role="status"
            aria-live="polite"
          >
            {toast}
          </div>
        </SimulationDraftProvider>
      </DraftContext.Provider>
    </LanguageProvider>
  );
}
