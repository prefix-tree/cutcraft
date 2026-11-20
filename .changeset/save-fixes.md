---
"@uberscene/sdk": patch
---

Undoing a delete and then saving no longer writes the element into the file twice. An element put back as the file has it keeps its own text, so a Layer's component, a function prop or a binding comes back as written; one that changed before it was deleted is written once, in its new form. Elements put back after the same sibling are written in the order the timeline shows them.
