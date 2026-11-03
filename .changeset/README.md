# Changesets

Every pull request that changes what a published package does adds a changeset: `pnpm changeset`, pick the
packages, the size (`patch`, `minor`, `major`; before 1.0 a breaking change is a `minor`) and a sentence or two for
the changelog, written for someone using the package. A change that users do not see (tests, docs, CI) needs
none, or `pnpm changeset --empty` when CI asks for one.

All `@cutcraft/*` packages and the `cutcraft` CLI share one version. On `main`, the release workflow keeps a
"Version packages" pull request open; merging it bumps the versions, writes each package's `CHANGELOG.md` and
publishes to npm.
