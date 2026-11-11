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