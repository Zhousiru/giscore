# CLAUDE.md

## Goal

Write maintainable software that is easy to change safely. Prefer clarity over cleverness, and correctness over premature optimization.

## Core Principles

- **Keep it small:** Do the simplest thing that works.
- **Stay DRY:** Remove duplication early; introduce abstractions only when duplication is real.
- **Refactor before adding features:** If the current design makes the feature awkward, **reshape the code first** to match best practices.
- **Let it crash:** Don’t hide failures. Fail fast, loudly, and close to the source.

## Code Style

- Prefer **small, composable functions** with single responsibilities.
- Use **clear names** over comments. Names should make intent obvious.
- Keep public APIs minimal and consistent.
- Avoid “magic”; prefer explicit configuration and obvious control flow.
- Prefer immutable data and pure functions when practical.

## Comments & Documentation

- **Only add comments when necessary**, e.g.:
  - explaining _why_ a non-obvious decision was made,
  - documenting constraints, invariants, or trade-offs,
  - warning about subtle edge cases.
- Do **not** comment what the code already says.
- If something needs heavy commenting to be understood, refactor for clarity.

## Error Handling (LetItCrash)

- Do not swallow exceptions or return “fake success.”
- Validate inputs at boundaries; once validated, keep inner code clean.
- Fail fast on invalid state; don’t limp forward with corrupted assumptions.
- Log and surface errors with actionable context (what, where, correlation id), but avoid noisy logs.
- If the runtime supports it, use supervision/retry **outside** core logic (e.g., job runner, supervisor, queue worker), not inside business code.

## Design & Refactoring Guidelines

- When adding a new feature:
  1. Identify duplication or awkward coupling.
  2. Refactor to a cleaner structure (rename, extract, isolate side effects).
  3. Add the feature with minimal new surface area.
- Prefer **composition** over inheritance.
- Keep side effects at the edges (I/O, network, DB), and keep core logic testable.

## Dependencies & Tooling

- Minimize dependencies; adopt only when they reduce total complexity.
- Keep versions pinned and updated deliberately.
- Prefer standard library features when adequate.

## Code Review Checklist

- Is the code DRY without premature abstraction?
- Is there an obvious place for this logic to live?
- Did we refactor underlying design issues before adding new behavior?
- Are errors handled via LetItCrash (no silent failure)?
- Are comments only where they add “why” or constraints?
- Are tests added/updated for meaningful coverage?
