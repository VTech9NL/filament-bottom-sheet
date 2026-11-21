<?php

declare(strict_types=1);

use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use VTech9NL\BottomSheet\BottomSheet;

it('makes a plain action a sheet below the breakpoint and a modal from it', function (): void {
    BottomSheet::everywhere();

    expect(openingTag(renderActionModal(Action::make('edit')), 'fi-modal-window'))
        ->toContain('x-bottom-sheet=""')
        ->toContain('data-bottom-sheet-modal-from="64rem"')
        ->toContain('data-bottom-sheet-initial-height="content"')
        ->toContain('data-bottom-sheet-snap-points="[0.25,0.5,0.75,1]"')
        ->not->toContain('data-bottom-sheet-slide-over-from');
});

it('makes a confirmation a sheet at the height of its content', function (): void {
    BottomSheet::everywhere('md');

    expect(openingTag(renderActionModal(Action::make('remove')->requiresConfirmation()), 'fi-modal-window'))
        ->toContain('x-bottom-sheet=""')
        ->toContain('data-bottom-sheet-modal-from="48rem"')
        ->toContain('data-bottom-sheet-initial-height="content"');
});

it('keeps the slide-over of an action from the breakpoint', function (): void {
    BottomSheet::everywhere();

    $action = Action::make('edit')->slideOver();
    $html = renderActionModal($action);

    expect(openingTag($html, 'fi-modal-window'))
        ->toContain('x-bottom-sheet=""')
        ->toContain('data-bottom-sheet-slide-over-from="64rem"')
        ->toContain('data-bottom-sheet-slide-over-position="end"')
        ->not->toContain('data-bottom-sheet-modal-from')
        // Filament renders a modal, and the directive shows the slide-over.
        ->and($action->isModalSlideOver())->toBeFalse()
        ->and(openingTag(renderActionModal($action), 'fi-modal-window'))
        ->toContain('data-bottom-sheet-slide-over-from="64rem"');
});

it('makes the table delete actions sheets below the breakpoint', function (string $class): void {
    BottomSheet::everywhere();

    expect(openingTag(renderActionModal($class::make()), 'fi-modal-window'))
        ->toContain('x-bottom-sheet=""')
        ->toContain('data-bottom-sheet-modal-from="64rem"');
})->with([
    'delete' => [DeleteAction::class],
    'bulk delete' => [DeleteBulkAction::class],
]);

it('keeps the Filament window of an action that opts out', function (): void {
    BottomSheet::everywhere();

    expect(openingTag(renderActionModal(Action::make('edit')->bottomSheet(false)), 'fi-modal-window'))
        ->not->toContain('x-bottom-sheet');
});

it('keeps the options of an explicit bottom sheet', function (): void {
    BottomSheet::everywhere(snapPoints: [0.5, 1]);

    $explicit = Action::make('edit')->bottomSheet(initialHeight: 0.75)->slideOverFrom('xl');

    expect(openingTag(renderActionModal($explicit), 'fi-modal-window'))
        ->toContain('data-bottom-sheet-initial-height="0.75"')
        ->toContain('data-bottom-sheet-slide-over-from="80rem"')
        ->not->toContain('data-bottom-sheet-modal-from')
        // An option that the action does not set comes from the switch.
        ->toContain('data-bottom-sheet-snap-points="[0.5,1]"');
});

it('gives the options of the switch to each action', function (): void {
    BottomSheet::everywhere('sm', snapPoints: [1, 0.5], initialHeight: 0.5, overlay: false);

    expect(openingTag(renderActionModal(Action::make('edit')), 'fi-modal-window'))
        ->toContain('data-bottom-sheet-modal-from="40rem"')
        ->toContain('data-bottom-sheet-snap-points="[0.5,1]"')
        ->toContain('data-bottom-sheet-initial-height="0.5"')
        ->toContain('data-bottom-sheet-overlay="false"');
});

it('lets an action change the breakpoint of the switch without bottomSheet()', function (): void {
    BottomSheet::everywhere();

    expect(openingTag(renderActionModal(Action::make('edit')->modalFrom('md')), 'fi-modal-window'))
        ->toContain('x-bottom-sheet=""')
        ->toContain('data-bottom-sheet-modal-from="48rem"');
});

it('gives the stacking option to the nested actions of a sheet', function (): void {
    BottomSheet::everywhere();

    $child = Action::make('confirm')->requiresConfirmation();
    $parent = Action::make('edit')->extraModalFooterActions([$child]);

    expect(openingTag(renderActionModal($parent), 'fi-modal-window'))
        ->toContain('data-bottom-sheet-stack=""')
        ->and(openingTag(renderActionModal($child), 'fi-modal-window'))
        ->toContain('x-bottom-sheet=""')
        ->toContain('data-bottom-sheet-stack=""');
});

it('does not mark a sheet for the nested actions without the switch', function (): void {
    expect(openingTag(renderActionModal(Action::make('edit')->bottomSheet()), 'fi-modal-window'))
        ->not->toContain('data-bottom-sheet-stack');
});

it('skips an action with no modal', function (): void {
    BottomSheet::everywhere();

    $action = Action::make('ping')->modal(false);

    expect($action->getExtraAttributes())->toBe([])
        ->and(openingTag(renderActionModal($action), 'fi-modal-window'))
        ->not->toContain('x-bottom-sheet');
});

it('keeps the conflict of an explicit bottom sheet with a slide-over', function (): void {
    BottomSheet::everywhere();

    renderActionModal(Action::make('edit')->slideOver()->bottomSheet());
})->throws(InvalidArgumentException::class, 'cannot use ->slideOver()');

it('rejects a wrong breakpoint of the switch', function (): void {
    BottomSheet::everywhere('phone');
})->throws(InvalidArgumentException::class, 'is not one of');
