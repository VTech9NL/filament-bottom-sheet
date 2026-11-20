<?php

declare(strict_types=1);

use Filament\Actions\Action;

it('marks the modal window and the overlay as a bottom sheet with the default options', function (): void {
    $html = renderActionModal(Action::make('edit')->bottomSheet());

    expect(openingTag($html, 'fi-modal-window'))
        ->toContain('x-bottom-sheet=""')
        ->toContain('wire:ignore.self=""')
        ->toContain('data-bottom-sheet-until="48rem"')
        ->toContain('data-bottom-sheet-snap-points="[0.5,0.8,1]"')
        ->toContain('data-bottom-sheet-initial-height="content"')
        ->and(openingTag($html, 'fi-modal-close-overlay'))
        ->toContain('data-bottom-sheet-overlay=""');
});

it('gives the breakpoint width of each breakpoint name', function (string $until, string $width): void {
    $html = renderActionModal(Action::make('edit')->bottomSheet(until: $until));

    expect(openingTag($html, 'fi-modal-window'))->toContain("data-bottom-sheet-until=\"{$width}\"");
})->with([
    ['sm', '40rem'],
    ['md', '48rem'],
    ['lg', '64rem'],
    ['xl', '80rem'],
    ['2xl', '96rem'],
]);

it('gives the snap points in order and the initial height, in each order of the calls', function (): void {
    $before = Action::make('edit')
        ->bottomSheetSnapPoints([1, 0.3, 0.6])
        ->bottomSheetInitialHeight(0.6)
        ->bottomSheet('lg');
    $after = Action::make('edit')
        ->bottomSheet('lg')
        ->bottomSheetSnapPoints([1, 0.3, 0.6])
        ->bottomSheetInitialHeight(0.6);

    foreach ([$before, $after] as $action) {
        expect(openingTag(renderActionModal($action), 'fi-modal-window'))
            ->toContain('data-bottom-sheet-until="64rem"')
            ->toContain('data-bottom-sheet-snap-points="[0.3,0.6,1]"')
            ->toContain('data-bottom-sheet-initial-height="0.6"');
    }
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

it('adds no attribute when the bottom sheet is disabled', function (bool|Closure $condition): void {
    $html = renderActionModal(Action::make('edit')->bottomSheet($condition)->bottomSheetSnapPoints([0.4]));

    expect($html)->not->toContain('bottom-sheet');
})->with([
    'false' => [false],
    'a closure that gives false' => [fn (): Closure => fn (Action $action): bool => $action->getName() !== 'edit'],
]);

it('does not change a modal without a bottom sheet', function (): void {
    expect(renderActionModal(Action::make('edit')))->not->toContain('bottom-sheet');
});

it('may not use an unknown breakpoint or an invalid height', function (Closure $configure): void {
    $configure(Action::make('edit'));
})->with([
    'breakpoint' => [fn (Action $action) => $action->bottomSheet(until: 'tablet')],
    'no snap point' => [fn (Action $action) => $action->bottomSheetSnapPoints([])],
    'a snap point above 1' => [fn (Action $action) => $action->bottomSheetSnapPoints([0.5, 1.2])],
    'a snap point of 0' => [fn (Action $action) => $action->bottomSheetSnapPoints([0])],
    'an initial height name' => [fn (Action $action) => $action->bottomSheetInitialHeight('auto')],
    'an initial height above 1' => [fn (Action $action) => $action->bottomSheetInitialHeight(1.5)],
])->throws(InvalidArgumentException::class);
