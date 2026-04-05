# Documentation

This directory contains feature and change documentation for the vibeBots project.

## Documentation Policy

**Every PR must include a doc in this directory** describing what was added or changed. This keeps the project's history understandable for any LLM or contributor picking up the codebase.

### Rules

1. **Do NOT put feature docs in the root README.md** — the root README is a high-level overview only. Detailed feature documentation goes here in `docs/`.

2. **One doc per PR** — each PR should add a single markdown file to `docs/` covering everything in that PR.

3. **Naming convention**: `NNN-short-description.md` where `NNN` is a zero-padded incrementing number (e.g., `001-home-screen-and-options.md`, `002-enemy-ai.md`). Check the highest existing number and increment by 1.

4. **What to include in each doc**:
   - **Overview** — 1-2 sentence summary of what was added/changed
   - **New modules** — for each new file: purpose, public API, key details
   - **Modified modules** — what changed and why
   - **Navigation/flow changes** — if the PR affects screen flow or user interaction
   - **Design decisions** — any non-obvious choices made and the reasoning

5. **Keep it factual and concise** — describe what exists in the code, not aspirations. An LLM should be able to read a doc and understand exactly what the PR introduced.

6. **Update CLAUDE.md if architecture changes** — if your PR adds new modules to the dependency graph, changes the screen flow, or introduces new patterns, update the relevant sections in `CLAUDE.md` at the project root.

## Index

| Doc | Description |
|-----|-------------|
| [001-home-screen-and-options.md](001-home-screen-and-options.md) | Home screen, options screen, pause menu Exit button |
| [002-subcomponent-collision.md](002-subcomponent-collision.md) | Wheel and flipper collision detection with arena walls |
