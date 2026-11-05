# Changesets

Every pull request that changes what a published package does adds a changeset: `pnpm changeset`, pick the
packages, the size (`patch`, `minor`, `major`; before 1.0 a breaking change is a `minor`) and a sentence or two for
the changelog, written for someone using the package. A change that users do not see (tests, docs, CI) needs
none, or `pnpm changeset --empty` when CI asks for one.

All `@cutcraft/*` packages and the `cutcraft` CLI share one version. A release takes three steps, from `main`:

1. `GITHUB_TOKEN=<a token that can read the repository> pnpm changeset version` bumps every package to the next
   version, writes each package's `CHANGELOG.md` from the pending changesets (with links to their pull requests and
   authors) and deletes the changesets.
2. Read the changelogs, run `pnpm install` so the lockfile matches, and commit as `chore: version packages` in a pull
   request.
3. After it merges, tag the merge commit on `main` with the new version and push the tag:
   `git tag v0.2.0 && git push origin v0.2.0`. The tag starts the **Publish** workflow
   (`.github/workflows/publish.yml`). It checks that the tag matches the packages' version, points at `main` and has
   no pending changesets, builds and checks the packages, and publishes each version not yet on npm through npm
   trusted publishing (no token; npm adds provenance).
