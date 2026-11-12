# Interface translations

`messages.ts` holds the shell's English and German text. The shared
`ShellMessages` type requires both languages to contain the same keys. Keep
keys stable and descriptive; add a matching translation for each language.

`LanguageProvider` exposes the persisted language to nested components through
`useLanguage()`. To translate another panel, add a typed message group for both
languages, then read the selected group in that panel. Keep financial model and
simulation values independent of display language.

Translation is incremental. The document is currently marked as English
because most panel content is still English; the translated shell regions carry
their selected `lang` attribute. Once all content is translated, revisit the
document language and remove the partial-translation hints.
