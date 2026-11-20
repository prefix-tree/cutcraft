---
"@uberscene/sdk": patch
---

Undoing a delete and then saving no longer writes the element into the file twice. An element put back as the file has it keeps its own text, so a Layer's component, a function prop or a binding comes back as written; one that changed before it was deleted is written once, in its new form. Elements put back after the same sibling are written in the order the timeline shows them.

Saving no longer changes the edit history it saves. A save used to take a settings change (`defaults`) and the fonts a picker asked for out of the history, so a second save, or a save that first had to write out a generated element, left them out.

Title text is written so the file reads it back as typed. Text with a brace or an angle bracket, such as `{50%}`, `a } b` or `x > y`, used to make the save fail or leave a file that did not compile; it is now written as a string in braces.

A save with new settings and an edit to a prop bound to them, such as the colour of a title written `color={accent}`, no longer fails with overlapping edits. The edited value goes into the one rewrite of `export const defaults`.

Strings with `&` are saved as they are. JSX reads HTML entities in an attribute string, so SVG content with `A &amp; B` used to come back as `A & B`. A string that an attribute cannot hold as it is, with an `&`, a quote, a backslash, a newline, a brace or an angle bracket, is now written in braces.
