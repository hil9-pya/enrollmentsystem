# Repo Instructions


- Before editing, inspect the relevant files first.
- Use `apply_patch` for manual file edits.
- Prefer `rg` for searching and `rg --files` for listing files.
- Do not revert unrelated user changes.
- Avoid destructive git commands unless explicitly requested.
- Run focused verification after code changes when practical.

## Frontend and UI

- Use the `uncodixfy` skill for frontend and UI generation, redesign, and visual audits.
- Preserve NCST branding, including the existing navy and blue palette, logo treatment, typography, and institutional tone.
- Preserve accessibility, responsive behavior, enrollment workflow clarity, and existing functional status colors.
- Reuse established shared components and design tokens before creating new variants.
- Keep the numeric enrollment stepper and the project's compact badges, buttons, alerts, forms, tables, and status panels consistent.
- Do not redesign already-consistent components unless the user explicitly requests it.
- Project requirements and explicit user instructions override the skill's general aesthetic preferences.
