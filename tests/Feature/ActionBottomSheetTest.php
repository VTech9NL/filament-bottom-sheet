<?php

declare(strict_types=1);

use Filament\Actions\Action;
use Filament\Support\Enums\SlideOverPosition;

it('marks the modal window and the overlay as a bottom sheet at each width', function (): void {
    $html = renderActionModal(Action::make('edit')->bottomSheet());

    expect(openingTag($html, 'fi-modal-window'))
        ->toContain('x-bottom-sheet=""')
        ->toContain('wire:ignore.self=""')
        ->toContain('data-bottom-sheet-snap-points="[0.25,0.5,0.75,1]"')
        ->toContain('data-bottom-sheet-initial-height="content"')
        ->not->toContain('data-bottom-sheet-modal-from')
        ->not->toContain('data-bottom-sheet-slide-over-from')
        ->and(openingTag($html, 'fi-modal-close-overlay'))
        ->toContain('data-bottom-sheet-overlay=""');
});

it('gives the breakpoint width of the modal from each breakpoint name', function (string $breakpoint, string $width): void {
    $html = renderActionModal(Action::make('edit')->bottomSheet()->modalFrom($breakpoint));

    expect(openingTag($html, 'fi-modal-window'))
        ->toContain("data-bottom-sheet-modal-from=\"{$width}\"")
        ->not->toContain('data-bottom-sheet-slide-over-from');
})->with([
    ['sm', '40rem'],
    ['md', '48rem'],
    ['lg', '64rem'],
    ['xl', '80rem'],
    ['2xl', '96rem'],
]);

it('gives the breakpoint width and the position of the slide-over', function (): void {
    $end = renderActionModal(Action::make('edit')->bottomSheet()->slideOverFrom('lg'));
    $start = renderActionModal(Action::make('edit')->slideOverPosition(SlideOverPosition::Start)->bottomSheet()->slideOverFrom('lg'));

    expect(openingTag($end, 'fi-modal-window'))
        ->toContain('data-bottom-sheet-slide-over-from="64rem"')
        ->toContain('data-bottom-sheet-slide-over-position="end"')
        ->not->toContain('data-bottom-sheet-modal-from')
        ->and(openingTag($start, 'fi-modal-window'))
        ->toContain('data-bottom-sheet-slide-over-position="start"');
});

it('gives the modal and the slide-over breakpoints together, in each order', function (): void {
    $html = renderActionModal(Action::make('edit')->slideOverFrom('md')->bottomSheet()->modalFrom('lg'));

    expect(openingTag($html, 'fi-modal-window'))
        ->toContain('data-bottom-sheet-slide-over-from="48rem"')
        ->toContain('data-bottom-sheet-modal-from="64rem"');
});

it('gives the sticky settings of the action to the slide-over type', function (): void {
    $default = renderActionModal(Action::make('edit')->bottomSheet()->slideOverFrom('lg'));
    $off = renderActionModal(Action::make('edit')->stickyModalHeader(false)->stickyModalFooter(false)->bottomSheet()->slideOverFrom('lg'));

    expect(openingTag($default, 'fi-modal-window'))
        ->toContain('data-bottom-sheet-slide-over-sticky-header="true"')
        ->toContain('data-bottom-sheet-slide-over-sticky-footer="true"')
        ->and(openingTag($off, 'fi-modal-window'))
        ->toContain('data-bottom-sheet-slide-over-sticky-header="false"')
        ->toContain('data-bottom-sheet-slide-over-sticky-footer="false"');
});

it('renders the modal root of a slide-over type as a Filament modal', function (): void {
    $html = renderActionModal(Action::make('edit')->bottomSheet()->slideOverFrom('lg'));

    expect(openingTag($html, 'fi-modal'))
        ->not->toContain('fi-modal-slide-over');
});

it('gives the snap points in order and the initial height, in each order of the calls', function (): void {
    $before = Action::make('edit')
        ->bottomSheetSnapPoints([1, 0.3, 0.6])
        ->bottomSheetInitialHeight(0.6)
        ->bottomSheet();
    $after = Action::make('edit')
        ->bottomSheet()
        ->bottomSheetSnapPoints([1, 0.3, 0.6])
        ->bottomSheetInitialHeight(0.6);

    foreach ([$before, $after] as $action) {
        expect(openingTag(renderActionModal($action), 'fi-modal-window'))
            ->toContain('data-bottom-sheet-snap-points="[0.3,0.6,1]"')
            ->toContain('data-bottom-sheet-initial-height="0.6"');
    }
});

it('sets the options with the named arguments of the bottom sheet', function (): void {
    $action = Action::make('edit')->bottomSheet(snapPoints: [1, 0.4], initialHeight: 0.75, overlay: false);

    expect(openingTag(renderActionModal($action), 'fi-modal-window'))
        ->toContain('data-bottom-sheet-snap-points="[0.4,1]"')
        ->toContain('data-bottom-sheet-initial-height="0.75"')
        ->toContain('data-bottom-sheet-overlay="false"');
});

it('keeps the value of an alias when a named argument is null', function (): void {
    $action = Action::make('edit')
        ->bottomSheetSnapPoints([0.3, 0.9])
        ->bottomSheetInitialHeight(0.3)
        ->bottomSheetOverlay(false)
        ->bottomSheet();

    expect(openingTag(renderActionModal($action), 'fi-modal-window'))
        ->toContain('data-bottom-sheet-snap-points="[0.3,0.9]"')
        ->toContain('data-bottom-sheet-initial-height="0.3"')
        ->toContain('data-bottom-sheet-overlay="false"');
});

it('uses the value of the last call, a named argument or an alias', function (): void {
    $aliasLast = Action::make('edit')
        ->bottomSheet(snapPoints: [0.5, 1], initialHeight: 0.5, overlay: false)
        ->bottomSheetSnapPoints([0.2, 0.8])
        ->bottomSheetInitialHeight(0.8)
        ->bottomSheetOverlay();
    $argumentLast = Action::make('edit')
        ->bottomSheetSnapPoints([0.2, 0.8])
        ->bottomSheetInitialHeight(0.8)
        ->bottomSheetOverlay()
        ->bottomSheet(snapPoints: [0.5, 1], initialHeight: 'content', overlay: false);

    expect(openingTag(renderActionModal($aliasLast), 'fi-modal-window'))
        ->toContain('data-bottom-sheet-snap-points="[0.2,0.8]"')
        ->toContain('data-bottom-sheet-initial-height="0.8"')
        ->not->toContain('data-bottom-sheet-overlay')
        ->and(openingTag(renderActionModal($argumentLast), 'fi-modal-window'))
        ->toContain('data-bottom-sheet-snap-points="[0.5,1]"')
        ->toContain('data-bottom-sheet-initial-height="content"')
        ->toContain('data-bottom-sheet-overlay="false"');
});

it('keeps the other modal window attributes of the action', function (): void {
    $action = Action::make('edit')
        ->extraModalWindowAttributes(['data-app' => 'kept'])
        ->bottomSheet();

    expect(openingTag(renderActionModal($action), 'fi-modal-window'))
        ->toContain('data-app="kept"')
        ->toContain('x-bottom-sheet=""');
});

it('reads the condition and the options again at each render', function (): void {
    $isSheet = true;
    $action = Action::make('edit')->bottomSheet(function () use (&$isSheet): bool {
        return $isSheet;
    });

    expect(openingTag(renderActionModal($action), 'fi-modal-window'))->toContain('x-bottom-sheet=""');

    $isSheet = false;

    expect(renderActionModal($action))->not->toContain('bottom-sheet');

    $isSheet = true;
    $action->bottomSheetInitialHeight(0.8);

    expect(openingTag(renderActionModal($action), 'fi-modal-window'))->toContain('data-bottom-sheet-initial-height="0.8"');
});

it('renders the action as Filament does when the bottom sheet is disabled', function (bool|Closure $condition): void {
    $action = Action::make('edit')->bottomSheet($condition)->modalFrom('md')->slideOverFrom('lg')->bottomSheetSnapPoints([0.4]);

    expect(renderActionModal($action))->toBe(renderActionModal(Action::make('edit')))
        ->and($action->getExtraAttributes())->toBe([]);
})->with([
    'false' => [false],
    'a closure that gives false' => [fn (): Closure => fn (Action $action): bool => $action->getName() !== 'edit'],
]);

it('does not change a modal without a bottom sheet', function (): void {
    expect(renderActionModal(Action::make('edit')))->not->toContain('bottom-sheet');
});

it('may not use an unknown breakpoint, one breakpoint for two types or an invalid height', function (Closure $configure, string $message): void {
    expect(fn () => $configure(Action::make('edit')->bottomSheet()))
        ->toThrow(InvalidArgumentException::class, $message);
})->with([
    'a modal breakpoint' => [fn (Action $action) => $action->modalFrom('tablet'), '[tablet]'],
    'a slide-over breakpoint' => [fn (Action $action) => $action->slideOverFrom('tablet'), '[tablet]'],
    'the same breakpoint' => [fn (Action $action) => $action->modalFrom('lg')->slideOverFrom('lg'), '[lg]'],
    'the same breakpoint, the other order' => [fn (Action $action) => $action->slideOverFrom('md')->modalFrom('md'), '[md]'],
    'no snap point' => [fn (Action $action) => $action->bottomSheetSnapPoints([]), 'at least one snap point'],
    'a snap point above 1' => [fn (Action $action) => $action->bottomSheetSnapPoints([0.5, 1.2]), 'snap point'],
    'a snap point of 0' => [fn (Action $action) => $action->bottomSheetSnapPoints([0]), 'snap point'],
    'an initial height name' => [fn (Action $action) => $action->bottomSheetInitialHeight('auto'), 'initial height'],
    'an initial height above 1' => [fn (Action $action) => $action->bottomSheetInitialHeight(1.5), 'initial height'],
    'a snap point that is not a number' => [fn (Action $action) => $action->bottomSheetSnapPoints([NAN]), 'finite'],
    'an initial height that is not a number' => [fn (Action $action) => $action->bottomSheet(initialHeight: NAN), 'finite'],
    'an infinite initial height' => [fn (Action $action) => $action->bottomSheet(initialHeight: INF), 'finite'],
    'a named snap point above 1' => [fn (Action $action) => $action->bottomSheet(snapPoints: [2]), 'snap point'],
]);

it('may not combine the bottom sheet with a slide-over or no modal, in each order', function (Closure $configure): void {
    $action = $configure(Action::make('edit'));

    expect(fn () => renderActionModal($action))
        ->toThrow(InvalidArgumentException::class, 'use ->slideOverFrom() or ->modalFrom()')
        ->and(fn () => $action->getExtraAttributes())
        ->toThrow(InvalidArgumentException::class, 'use ->slideOverFrom() or ->modalFrom()');
})->with([
    'a slide-over, before' => [fn (Action $action) => $action->slideOver()->bottomSheet()],
    'a slide-over, after' => [fn (Action $action) => $action->bottomSheet()->slideOver()],
    'no modal, before' => [fn (Action $action) => $action->modal(false)->bottomSheet()],
    'no modal, after' => [fn (Action $action) => $action->bottomSheet()->modal(false)],
]);

it('puts the overlay attribute on the window only when the option is false', function (): void {
    $off = renderActionModal(Action::make('edit')->bottomSheet()->bottomSheetOverlay(false));
    $on = renderActionModal(Action::make('edit')->bottomSheet()->bottomSheetOverlay());
    $plain = renderActionModal(Action::make('edit')->bottomSheet());

    expect(openingTag($off, 'fi-modal-window'))
        ->toContain('data-bottom-sheet-overlay="false"')
        ->and(openingTag($on, 'fi-modal-window'))
        ->not->toContain('data-bottom-sheet-overlay')
        ->and(openingTag($plain, 'fi-modal-window'))
        ->not->toContain('data-bottom-sheet-overlay');
});

it('may not use the overlay option without the bottom sheet', function (): void {
    $action = Action::make('edit')->bottomSheetOverlay(false);

    expect(fn () => renderActionModal($action))
        ->toThrow(InvalidArgumentException::class, 'without ->bottomSheet()');
});

it('may not use a window type breakpoint without the bottom sheet', function (Closure $configure): void {
    $action = $configure(Action::make('edit'));

    expect(fn () => renderActionModal($action))
        ->toThrow(InvalidArgumentException::class, 'without ->bottomSheet()');
})->with([
    'modal from' => [fn (Action $action) => $action->modalFrom('md')],
    'slide-over from' => [fn (Action $action) => $action->slideOverFrom('lg')],
]);
