# Interface translations

`messages.ts` holds the shell's English and German text. The shared
`ShellMessages` type requires both languages to contain the same keys. Keep
keys stable and descriptive; add a matching translation for each language.

`LanguageProvider` exposes the persisted language to nested components through
`useLanguage()`. To translate another panel, add a typed message group for both
languages, then read the selected group in that panel. Keep financial model and
simulation values independent of display language.

The application updates the document language and metadata after restoring the
saved preference. The developer-only panel remains English and identifies its
language explicitly. File-format identifiers remain language-independent.

Glossary entries use stable IDs and share their equations across languages.
English content lives in `../help/dictionary.ts`; German prose is keyed by the
same IDs in `../help/dictionary-de.ts`. Update both when changing a definition,
and keep the mathematical assumptions and symbols consistent.
