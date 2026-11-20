# Changelog

## v0.2.0 - unreleased

The bottom sheet is the mobile-first window type of a Filament action.

### Breaking

- The section sheet is removed: `->bottomSheet()` on a `Section`, and the `open-bottom-sheet` and `close-bottom-sheet` events.
- The `$until` argument of `->bottomSheet()` is removed, with its short form `->bottomSheet('lg')`. Use `->bottomSheet()->modalFrom('lg')`.
- `->bottomSheet()` alone is a sheet at each width.

### Added

- `->bottomSheetOverlay(false)`: the sheet type has no dark layer, and the page behind stays visible and usable.
- `->modalFrom($breakpoint)`: from the breakpoint and up, the action is the Filament modal.
- `->slideOverFrom($breakpoint)`: from the breakpoint and up, the action is a Filament slide-over.
- A resize changes the window type of an open action, with no close and no loss of the form data.
- Conflict checks: `->bottomSheet()` with `->slideOver()` or `->modal(false)`, `->modalFrom()`, `->slideOverFrom()` or `->bottomSheetOverlay()` without `->bottomSheet()`, and one breakpoint for the two types throw an `InvalidArgumentException`.

## v0.1.0 - 2026-11-20

First release.

- `->bottomSheet()` on a Filament action or section. Below the breakpoint the part is a bottom sheet. At and above the breakpoint, the action stays a modal and the section stays in its place.
- Snap points, an initial height of `content` or a snap point, drag, flick, body scroll, and dismiss by a drag, a backdrop tap or Escape.
- Stacked sheets. A nested action needs `->overlayParentActions()`.
- Section sheets open with `open-bottom-sheet` and close with `close-bottom-sheet`. A section sheet needs an `id()` or a `key()`.
- Below the breakpoint, a section sheet is hidden from the first paint, before Alpine starts.
