# @intrnl/velvet-compiler

## 0.8.0

### Minor Changes

- 900eef4: Properly validate tag placements, this also removes the implicit wrapping of
  tr tags that are directly placed within a table

### Patch Changes

- 45ad53d: Handle builtin named expressions in the parser
- 09403dc: Move macro transformation to a separate export
- Updated dependencies [0ceb7cb]
- Updated dependencies [00b9886]
- Updated dependencies [6fb9b32]
- Updated dependencies [09403dc]
  - @intrnl/velvet@0.4.22

## 0.7.14

### Patch Changes

- 10c0e1a: Function stored in signals should not have `this` value be the signal
- a2f7c13: Mark undefined as primitive value
- 843c408: Allow peeking for component signals
- Updated dependencies [843c408]
  - @intrnl/velvet@0.4.21

## 0.7.13

### Patch Changes

- e4b345d: Incorrect whitespace minification with attributes on a self-closing tag

## 0.7.12

### Patch Changes

- 96b8472: Move createElement calls to a helper function
- e17fdbd: Make whitespace removal less aggressive
- b5a3d1e: Handle SVG self closing tags
- 5e80fc7: Clean up whitespace removal checks
- Updated dependencies [96b8472]
- Updated dependencies [8a6f73f]
  - @intrnl/velvet@0.4.20

## 0.7.11

### Patch Changes

- 152d547: Properly handle SVG and MathML in logic blocks
- Updated dependencies [152d547]
- Updated dependencies [8ec56e1]
  - @intrnl/velvet@0.4.19

## 0.7.10

### Patch Changes

- a2f3e66: Add group binding for radio inputs
- 7672a62: Optimize text nodes that are an only child of an element
- Updated dependencies [efdd122]
- Updated dependencies [7672a62]
  - @intrnl/velvet@0.4.18

## 0.7.9

### Patch Changes

- 7145950: Do some space-saving technique on the HTML template

## 0.7.8

### Patch Changes

- 75676e6: Check static nodes before conditional logic block
- c1527a5: Check static nodes before await logic block
- 093919d: Check static nodes before keyed logic block
- d133100: Check static nodes before loop logic block
- 022e48e: Account for index offsets
- c75f7a2: Trim text nodes when entering a fragment
- 05967ad: Aggressive whitespace minification

## 0.7.6

### Patch Changes

- 6ac7ded: Adjust location of let expressions

## 0.7.5

### Patch Changes

- 224dcd8: Improve for-loops
- Updated dependencies [224dcd8]
- Updated dependencies [97b1a28]
  - @intrnl/velvet@0.4.13

## 0.7.4

### Patch Changes

- 418de75: Fix broken catch clause declaration

## 0.7.3

### Patch Changes

- 72996c1: Add value binding for textarea element

## 0.7.2

### Patch Changes

- 259dfd7: Store subscription optimization for Signals
- Updated dependencies [9c07e0e]
- Updated dependencies [d3758d6]
- Updated dependencies [259dfd7]
  - @intrnl/velvet@0.4.5

## 0.7.1

### Patch Changes

- 972091f: Remove wireit dev dependency
- Updated dependencies [972091f]
  - @intrnl/velvet@0.4.1

## 0.7.0

### Minor Changes

- c2da157: Transform states into Signal values

### Patch Changes

- b636cf7: Run compiler code through Rollup
- Updated dependencies [5811ee0]
- Updated dependencies [c74df40]
- Updated dependencies [88584cd]
  - @intrnl/velvet@0.4.0
