# wizrd-cli composite stability contract

Everything under `.github/workflows/*.yml` and `.github/actions/*/action.yml` is **public API** — consumed by ~20 Digitaliko repos via `@v1` references.

## What's additive (stays on @v1)

- Adding a new composite workflow file.
- Adding a new composite action.
- Adding a new input to an existing composite, with a default that preserves prior behavior.
- Adding a new output to an existing composite.
- Adding a new optional secret to an existing composite (with a sensible fallback if missing).
- Changing the internal implementation of a composite as long as inputs/outputs/secrets stay the same.

## What's breaking (requires cutting @v2)

- Removing or renaming a composite workflow or action.
- Removing or renaming an existing input, output, or secret.
- Changing the type of an existing input.
- Changing the default of an existing input in a way that flips behavior.
- Changing required permissions or `runs-on` target.
- Changing the meaning of an existing label transition.

## Bump rhythm

- Additive changes: PR + merge, then `git tag -fa v1 && git push --force-with-lease origin v1`.
- Breaking changes: cut `v2` tag, leave `v1` floating where it is. Email/Slack-equivalent the rollout — every consumer migrates on their own timeline.

## Labels are also public API

The `wizrd:*` label namespace is contract. Renaming `wizrd:plan` → `wizrd:planning` is breaking. Same `v2` rule applies.

## Deprecated (removal in Phase G after fleet rollout)

These composites are superseded by the pipeline stages and will be removed once every repo is on the pipeline:

- `.github/workflows/wizrd-agent.yml` — reactive `@claude`/`ai: implement` one-shot. Replaced by the full triage → … → verify cascade.
- `.github/actions/wizrd-agent/` — same logic as composite action. Same replacement.
- `.github/workflows/wizrd-review.yml` — one-shot multi-agent review. Folded into `wizrd-stage-review.yml`, which invokes the same `/code-review` plugin inside the review loop.

Until removed they keep working; the deprecation is a *flag*, not a behavior change.

## When in doubt

Treat composite inputs and labels like database columns: easy to add, painful to remove.
