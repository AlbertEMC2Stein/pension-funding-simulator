import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftContext } from "../src/components/common";

/** Render a workspace component with the navigation actions its term links use. */
export function renderWithDictionary(element: ReactElement): string {
  return renderToStaticMarkup(
    <DraftContext.Provider value={{ navigate: () => {}, notice: () => {} }}>
      {element}
    </DraftContext.Provider>,
  );
}
