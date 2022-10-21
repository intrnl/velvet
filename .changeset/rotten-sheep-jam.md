---
"@intrnl/velvet": patch
---

Don't set textContent as optimization

Turns out this is causing a noticeable blip in update time.
