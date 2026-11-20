---
"@uberscene/kit": minor
---

`Executor.can(action)` answers whether `execute` would accept an action, with the same errors, and changes nothing. `affordances(state, id)` says what can be done to one element: how each prop can be written (`literal`, `bound`, `locked`) and which actions are about it and accept it. Handlers that act on one element gain an optional `targets` face, and `actionTarget(input)` names the element an action is about.
