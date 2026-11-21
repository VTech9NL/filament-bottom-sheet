# Changelog

## v0.2.1 - 2026-11-21

### Added

- A focus on a text field in the top sheet moves the sheet to its highest snap point, as the keyboard opens. The `bottom-sheet:resize` event gives the reason `focus`. The focus of the Filament autofocus, at the open, does not move the sheet.

## v0.2.0 - 2026-11-21

The bottom sheet is the mobile-first window type of a Filament action.

### Breaking

- The section sheet is removed: `->bottomSheet()` on a `Section`, and the `open-bottom-sheet` and `close-bottom-sheet` events.
- The `$until` argument of `->bottomSheet()` is removed, with its short form `->bottomSheet('lg')`. Use `->bottomSheet()->modalFrom('lg')`.
- `->bottomSheet()` alone is a sheet at each width.
- The default snap points are `[0.25, 0.5, 0.75, 1.0]`.
- The first height is free: each open starts at `initialHeight`, which is not a rest point and is capped only at the viewport height. After a drag, the sheet rests at a snap point only.

### Deprecated

- `->bottomSheetSnapPoints()`, `->bottomSheetInitialHeight()` and `->bottomSheetOverlay()`. Use the named arguments of `->bottomSheet()`. The last call wins.

### Added

- `->bottomSheet(snapPoints: ..., initialHeight: ..., overlay: ...)`: the options as named arguments. A `null` argument does not change the option.
- `overlay: false`: the sheet type has no dark layer. The page behind stays visible. A tap outside closes the top sheet and does not reach the page, and the page does not scroll.
- `x-bottom-sheet:element`: the same sheet for any element, with an optional condition. It opens and closes with the `bottom-sheet:open` and `bottom-sheet:close` window events, and keeps its content mounted while it is closed. It sends `bottom-sheet:opened`, `bottom-sheet:closed` and `bottom-sheet:resize`, and sets `--bottom-sheet-height`.
- `data-bottom-sheet-outside="pass"` on an element sheet: no dark layer, an outside tap reaches the page, and the focus is free.
- Full height: at the `1.0` snap point the sheet fills the visible viewport, with the handle and the header below the top safe area.
- The sheet follows the visual viewport: with the keyboard open, it stays above the keyboard and keeps its snap point.
- The drag handle is focusable and has an accessible name. Enter or Space closes the sheet.
- `->modalFrom($breakpoint)`: from the breakpoint and up, the action is the Filament modal.
- `->slideOverFrom($breakpoint)`: from the breakpoint and up, the action is a Filament slide-over.
- A resize changes the window type of an open action, with no close and no loss of the form data.
- With two sheets open, only the top sheet takes an outside tap, Escape and the focus. A sheet under it lets a tap through and does not trap the focus.
- A snap point or a first height must be finite.
- Conflict checks: `->bottomSheet()` with `->slideOver()` or `->modal(false)`, `->modalFrom()`, `->slideOverFrom()` or `->bottomSheetOverlay()` without `->bottomSheet()`, and one breakpoint for the two types throw an `InvalidArgumentException`.

## v0.1.0 - 2026-11-20

First release.

- `->bottomSheet()` on a Filament action or section. Below the breakpoint the part is a bottom sheet. At and above the breakpoint, the action stays a modal and the section stays in its place.
- Snap points, an initial height of `content` or a snap point, drag, flick, body scroll, and dismiss by a drag, a backdrop tap or Escape.
- Stacked sheets. A nested action needs `->overlayParentActions()`.
- Section sheets open with `open-bottom-sheet` and close with `close-bottom-sheet`. A section sheet needs an `id()` or a `key()`.
- Below the breakpoint, a section sheet is hidden from the first paint, before Alpine starts.
