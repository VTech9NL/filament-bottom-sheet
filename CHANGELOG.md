# Changelog

## v0.1.0 - 2026-11-20

First release.

- `->bottomSheet()` on a Filament action or section. Below the breakpoint the part is a bottom sheet. At and above the breakpoint, the action stays a modal and the section stays in its place.
- Snap points, an initial height of `content` or a snap point, drag, flick, body scroll, and dismiss by a drag, a backdrop tap or Escape.
- Stacked sheets. A nested action needs `->overlayParentActions()`.
- Section sheets open with `open-bottom-sheet` and close with `close-bottom-sheet`. A section sheet needs an `id()` or a `key()`.
- Below the breakpoint, a section sheet is hidden from the first paint, before Alpine starts.
