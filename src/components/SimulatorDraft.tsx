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
const navigation: { id: View; label: string; icon: string }[] = [
  { id: "evaluation", label: "Evaluation", icon: "◫" },
  { id: "setup", label: "Market & investor", icon: "◉" },
  { id: "data", label: "Data & tables", icon: "▤" },
  { id: "help", label: "Dictionary & help", icon: "ⓘ" },
];
// The constant guard lets production builds discard the development module.
const DeveloperView =
  process.env.NODE_ENV === "development"
    ? lazy(() => import("./dev/DeveloperView"))
    : null;
const visibleNavigation = DeveloperView
  ? [
      ...navigation,
      { id: "developer" as const, label: "Developer tools", icon: "⌘" },
    ]
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
      notice("Display preferences could not be saved in this browser.");
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
    <DraftContext.Provider value={{ navigate, notice }}>
      <SimulationDraftProvider>
        <div className="app-shell">
          <aside className="rail" aria-label="Main navigation">
            <a
              href="#overview"
              className="brand"
              aria-label="Stillwell home"
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
            <div className="rail-label">WORKSPACE</div>
            <nav className="nav" aria-label="Workspace">
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
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="rail-bottom">
              <div className="rail-note">
                <span className="sparkle">✳</span>
                <strong>Plan with perspective.</strong>
                <p>A clearer view of the choices shaping retirement.</p>
              </div>
              <div className="rail-footer">
                <span className="status-dot" /> Design draft <span>v0.1</span>
              </div>
            </div>
          </aside>
          <main className="main" id="overview">
            <header className="topbar">
              <div className="breadcrumb">
                WORKSPACE <span>/</span>{" "}
                <b>
                  {visibleNavigation
                    .find((item) => item.id === view)
                    ?.label.toUpperCase()}
                </b>
              </div>
              <div className="top-actions">
                <span className="draft-pill">
                  <span /> INTERFACE PREVIEW
                </span>
                <button
                  className="theme-toggle"
                  type="button"
                  aria-pressed={dark}
                  aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
                  onClick={() =>
                    updateDisplay({
                      ...display,
                      theme: dark ? "light" : "dark",
                    })
                  }
                >
                  {dark ? "☀" : "☾"}{" "}
                  <span>{dark ? "Light mode" : "Dark mode"}</span>
                </button>
                <label className="language-control">
                  <span className="visually-hidden">
                    Language (preview only)
                  </span>
                  <select
                    value={display.language}
                    aria-label="Language (preview only)"
                    onChange={(event) => {
                      const language =
                        event.target.value === "de" ? "de" : "en";
                      if (updateDisplay({ ...display, language }))
                        notice(
                          language === "de"
                            ? "German selected for preview. The interface is still in English; translations are not implemented yet."
                            : "English selected. Language switching is a preview.",
                        );
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
            <footer className="page-footer">
              <span>
                STILLWELL <b>✳</b> PENSION LAB
              </span>
              <span>DESIGN DRAFT · ALL VALUES ILLUSTRATIVE</span>
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
  );
}
