import type { Metadata } from "next";
import "katex/dist/katex.min.css";
// These layers are deliberately ordered: layout, theme, then newer adjustments.
import "./styles/base/foundations.css";
import "./styles/base/shell.css";
import "./styles/base/evaluation.css";
import "./styles/base/setup.css";
import "./styles/base/tables.css";
import "./styles/base/footer.css";
import "./styles/base/responsive.css";
import "./styles/theme/palette.css";
import "./styles/theme/common.css";
import "./styles/theme/timing-chart.css";
import "./styles/theme/diagnostics.css";
import "./styles/theme/responsive.css";
import "./styles/theme/dark-adjustments.css";
import "./styles/adjustments/common.css";
import "./styles/adjustments/market-editor.css";
import "./styles/adjustments/responsive.css";
import "./styles/adjustments/selects.css";
import "./styles/adjustments/details.css";
import "./styles/adjustments/status.css";
import "./styles/adjustments/run-control.css";

/** Static page metadata included in the exported site. */
export const metadata: Metadata = {
  title: "Stillwell — Pension funding simulator",
  description:
    "Explore retirement withdrawals and risks under your chosen assumptions.",
};

/** Shared document wrapper and global styles for every Next.js page. */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
