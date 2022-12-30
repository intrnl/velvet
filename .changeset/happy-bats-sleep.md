---
"@intrnl/velvet-compiler": patch
---

Stricter parsing rules

The previous solution for stricter rules around weird HTML parsing quirks wasn't
adequate, this improves it by adding the checks to include elements that are
within a conditional logic block, and adds additional cases that weren't present
before.

This does not constitute a breaking change, as weird HTML like these were
already considered invalid in the initial 0.8.0 release.
