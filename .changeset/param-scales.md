---
"@uberscene/kit": minor
"@uberscene/sdk": minor
---

A param's name now always says its scale. The zoom transition's `blur`, a strength from 0 to 1, is now `smear`, and the scanlines effect's `thickness`, a share of the spacing from 0 to 1, is now `coverage`. So `blur` and `thickness` are pixels wherever they appear. An old name is an error that names the new one, and `uberscene lint --fix` renames it, as for the other 0.6 renames.
