---
"@intrnl/velvet-compiler": patch
"@intrnl/velvet": patch
---

Introduce firstChild and nextSibling helper functions

These function calls takes less of a hit on the component source size, and we
can mark the calls as pure without splattering pure comments (not that it would
work, Terser does not support explicitly marking one getter as pure.)
