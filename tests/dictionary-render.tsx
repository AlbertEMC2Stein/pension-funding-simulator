import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "../src/components/LanguageContext";
import { DraftContext } from "../src/components/common";

/** Render a workspace component with the navigation actions its term links use. */
export function renderWithDictionary(element: ReactElement): string {
  return renderToStaticMarkup(
    <LanguageProvider language="en">
      <DraftContext.Provider value={{ navigate: () => {}, notice: () => {} }}>
        {element}
      </DraftContext.Provider>
    </LanguageProvider>,
  );
}
