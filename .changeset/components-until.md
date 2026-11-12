---
"@cutcraft/kit": patch
---

The ready-made components take `duration={{ until: "id" }}`, as plain elements do. A `LowerThird`, `TypeCard` or any other component can now last until a clip ends, and every one of its parts ends there, however late the part comes in. Before, a component refused the prop with "duration Invalid input".
