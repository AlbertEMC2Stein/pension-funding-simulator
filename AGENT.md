## Development Workflow

Optimize development efficiency and token consumption without compromising correctness, maintainability, security, or performance.

### Implementation
- Inspect only relevant files and dependencies; reuse previously established context.
- Plan nontrivial changes before editing, but avoid excessive planning.
- Implement coherent changes rather than repeatedly editing and reviewing small fragments.
- Follow existing architectural patterns and TypeScript conventions.
- Avoid unnecessary abstractions, dependencies, and unrelated refactoring.

### Verification
- Use risk-adaptive testing proportional to the scope and impact of changes.
- Prefer targeted tests during development; run comprehensive checks when warranted.
- Do not repeat successful checks on unchanged code.
- Diagnose failures before modifying code; avoid speculative trial-and-error.
- Preserve type safety, functionality, accessibility, and performance.

### Communication
- Keep explanations and progress updates concise.
- Avoid reproducing unchanged code or verbose tool outputs.
- Report only meaningful changes, verification results, and unresolved issues.

### Completion
Stop iterating once requirements are met, appropriate verification passes, and no known critical issues remain.

**Principle:** Minimize redundant work, not necessary engineering work. Use judgment rather than rigid procedures.

## Project coding conventions

- Write production code for human readers: keep it well structured, readable and easy for the project owner or a newcomer to modify.
- Organize related functionality into clear modules, components and folders. Keep the website independent of the research project at runtime.
- Add a detailed docstring to every function, including functions in React files. Document types and interfaces as well; document individual fields when their purpose, units or interpretation are not immediately clear.
- Use explanatory comments where they help readers understand non-obvious behavior, assumptions or decisions. Keep comments accurate when code changes.
- Separate semantic blocks with blank lines. For example, distinguish preparation, validation, calculation and return statements so the structure is easy to scan.
- Keep theme colors easy to change by hand, and design interfaces and text organization with future English/German language support in mind.
- In mathematical notation, write the exponential base upright as `\mathrm{e}` and use `\ln` for the natural logarithm.
- Develop the mathematical backend in small, reviewable steps so each feature and its results can be checked before building on it.
- Draft and demonstration code may be more disposable, but production code should meet the readability, structure and documentation requirements above.

## Research project boundary

- Keep this website separate from the sibling `gompertz-pension-funding` research project.
- Before using its manuscript or code, read its `AGENTS.md` and follow the applicable instructions. Treat research files as reference material; do not modify them unless explicitly authorized.
