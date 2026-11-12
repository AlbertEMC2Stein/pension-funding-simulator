/** A value suitable for a CSV cell; null and undefined become empty cells. */
export type CsvCell = string | number | boolean | null | undefined;

/** Encode CSV with escaped quotes and protect text cells from spreadsheet formulas. */
export function makeCsv(rows: readonly (readonly CsvCell[])[]): string {
  return (
    rows
      .map((row) =>
        row
          .map((cell) => {
            let value = cell == null ? "" : String(cell);
            if (typeof cell === "string" && /^[\t\r\n ]*[=+\-@]/.test(value))
              value = `'${value}`;
            return /[",\r\n]/.test(value)
              ? `"${value.replaceAll('"', '""')}"`
              : value;
          })
          .join(","),
      )
      .join("\r\n") + "\r\n"
  );
}

/** Download text through a temporary object URL without navigating away. */
export function downloadText(
  filename: string,
  content: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
