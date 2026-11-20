<?php

declare(strict_types=1);

use Filament\Schemas\Components\Section;

it('marks the section as a bottom sheet with its id and the default options', function (): void {
    $html = renderSection(Section::make('Room')->id('room')->bottomSheet());

    expect(openingTag($html, 'fi-sc-section'))
        ->toContain('x-bottom-sheet.section=""')
        ->toContain('wire:ignore.self=""')
        ->toContain('x-data="{ isBottomSheetOpen: false }"')
        ->toContain('x-trap.noscroll.noreturn.noautofocus="isBottomSheetOpen"')
        ->toContain('data-bottom-sheet-id="room"')
        ->toContain('data-bottom-sheet-until="48rem"')
        ->toContain('data-bottom-sheet-snap-points="[0.5,0.8,1]"')
        ->toContain('data-bottom-sheet-initial-height="content"');
});

it('hides a section sheet below the breakpoint before Alpine starts', function (string $until, string $class): void {
    $html = renderSection(Section::make('Room')->id('room')->bottomSheet($until));

    expect(openingTag($html, 'fi-sc-section'))->toContain($class);
})->with([
    'sm' => ['sm', 'max-sm:hidden'],
    'md' => ['md', 'max-md:hidden'],
    'lg' => ['lg', 'max-lg:hidden'],
    'xl' => ['xl', 'max-xl:hidden'],
    '2xl' => ['2xl', 'max-2xl:hidden'],
]);

it('uses the section key as the sheet id when the section has no id', function (): void {
    $html = renderSection(Section::make('Room')->key('room-key')->bottomSheet());

    expect(openingTag($html, 'fi-sc-section'))->toContain('data-bottom-sheet-id="room-key"');
});

it('gives the breakpoint, the snap points and the initial height', function (): void {
    $section = Section::make('Room')
        ->id('room')
        ->bottomSheet('lg')
        ->bottomSheetSnapPoints([0.9, 0.4])
        ->bottomSheetInitialHeight(0.9);

    expect(openingTag(renderSection($section), 'fi-sc-section'))
        ->toContain('data-bottom-sheet-until="64rem"')
        ->toContain('data-bottom-sheet-snap-points="[0.4,0.9]"')
        ->toContain('data-bottom-sheet-initial-height="0.9"');
});

it('keeps the other attributes of the section', function (): void {
    $section = Section::make('Room')
        ->id('room')
        ->extraAttributes(['data-app' => 'kept'])
        ->bottomSheet();

    expect(openingTag(renderSection($section), 'fi-sc-section'))
        ->toContain('data-app="kept"')
        ->toContain('x-bottom-sheet.section=""');
});

it('adds no attribute when the bottom sheet is disabled', function (bool|Closure $condition): void {
    $html = renderSection(Section::make('Room')->id('room')->bottomSheet($condition));

    expect($html)
        ->not->toContain('bottom-sheet')
        ->not->toContain('max-md:hidden');
})->with([
    'false' => [false],
    'a closure that gives false' => [fn (): Closure => fn (Section $section): bool => $section->getId() !== 'room'],
]);

it('may not be a bottom sheet without an id or a key', function (): void {
    $section = Section::make()->bottomSheet();
    schemaOf($section);

    $section->getExtraAttributes();
})->throws(InvalidArgumentException::class, 'needs an id() or a key()');
