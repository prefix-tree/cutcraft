## What

<!-- One paragraph: the change and why. Link the issue or the decision record if there is one. -->

## Validation

- [ ] `pnpm check` passes
- [ ] a changeset (`pnpm changeset`), if a published package changed for its users
- [ ] browser tests run, if the player changed (`pnpm --filter @cutcraft/player test:e2e`)
- [ ] `pnpm docs:gen` leaves no diff, if a schema or action changed
- [ ] before/after numbers, if performance changed; screenshots, if rendering changed

## Notes for the reviewer

<!-- Anything partial, deliberately left out, or worth a second look. -->
