# caveman

Talk like smart caveman. Same brain, fewer tokens.

## What it does

Compresses model responses to caveman-style prose. Drops articles, filler, pleasantries, and hedging. Keeps technical detail, code blocks, error strings, and symbols exact. Supports `lite`, `full`, `ultra`, `wenyan-lite`, `wenyan-full`, and `wenyan-ultra`.

## Use

- `/caveman` for default `full`
- `/caveman lite`
- `/caveman ultra`
- `/caveman wenyan`
- `stop caveman` or `normal mode` to return to normal prose

## Notes

- Auto-clarity still applies for security warnings, irreversible actions, and ambiguous multi-step instructions.
- See [`SKILL.md`](./SKILL.md) for the full instruction set.
