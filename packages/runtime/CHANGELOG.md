# @intrnl/velvet

## 0.4.15

### Patch Changes

- d00b5d0: Permanently stop effect when disposing
- dda020f: Refactor Signal implementation
- 645b6e4: Expose untrack as public API
- 94cd82b: Fix list iteration not receiving the right depth

## 0.4.14

### Patch Changes

- 7e3a70f: Fix rejected block being given incorrect state

## 0.4.13

### Patch Changes

- 224dcd8: Improve for-loops
- 97b1a28: Instantiate custom elements in HTML templates

## 0.4.12

### Patch Changes

- 3d61874: Reintroduce untrack function

## 0.4.10

### Patch Changes

- a287e8f: Fix broken attribute mapping

## 0.4.9

### Patch Changes

- 4b67c63: Revert nested effects

## 0.4.8

### Patch Changes

- 5baecea: Do not put effect cleanup on scope if nested
- 1c72867: Add additional way of untracking

## 0.4.7

### Patch Changes

- 7e7d7fc: Use the new Signals rewrite
- 72626d4: Update Signals implementation

## 0.4.6

### Patch Changes

- 32a72af: Refresh stale value if using peek
- 842b475: Update Signals implementation to match upstream

## 0.4.5

### Patch Changes

- 9c07e0e: Minor code optimization
- d3758d6: Remove HTML template cache
- 259dfd7: Store subscription optimization for Signals

## 0.4.4

### Patch Changes

- 31da6c2: Lock signal during eager activation
- 492b5a0: Don't call batch on top-level promise effect
- 39f645e: Ignore cyclic dependency instead of throwing

## 0.4.3

### Patch Changes

- 1d14c7c: Batch promise states

## 0.4.2

### Patch Changes

- 322560f: Fix missing public entrypoint

## 0.4.1

### Patch Changes

- 972091f: Remove wireit dev dependency

## 0.4.0

### Minor Changes

- 5811ee0: Replace reactivity implementation with Signals
- 88584cd: remove global store

### Patch Changes

- c74df40: Expose runtime version
