# Bundled research paper

`manuscript.pdf` is a snapshot of the research project's November 11, 2026
build. The website serves this copy independently of the research project.

When replacing the PDF, review `src/lib/help/paper-references.ts`: LaTeX can
change named destinations and page numbers between versions. Check that each
reference still points to the intended result and that both its destination and
page fallback work in the PDF viewers you intend to support. The page numbers
are physical PDF page numbers, which need not always match printed numbering.

The paper and the website may use different numerical methods. A reference
provides research context; it does not imply that every implementation detail
is identical.
