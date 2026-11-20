<?php

declare(strict_types=1);

use Filament\Actions\Action;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\Blade;
use Livewire\Component;
use VTech9NL\BottomSheet\Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature');

/**
 * Render the action modal as `action-modal.blade.php` does, with the window
 * and overlay attributes of the action.
 */
function renderActionModal(Action $action): string
{
    return Blade::render(
        '<x-filament::modal id="sheet" heading="Edit" :extra-modal-window-attribute-bag="$window" :extra-modal-overlay-attribute-bag="$overlay">Body</x-filament::modal>',
        [
            'window' => $action->getExtraModalWindowAttributeBag(),
            'overlay' => $action->getExtraModalOverlayAttributeBag(),
        ],
    );
}

function renderSection(Section $section): string
{
    return schemaOf($section)->toHtml();
}

/**
 * Put the section in a schema of a Livewire component, as a page does.
 */
function schemaOf(Section $section): Schema
{
    $livewire = new class extends Component implements HasSchemas
    {
        use InteractsWithSchemas;
    };

    return Schema::make($livewire)->components([$section]);
}

/**
 * Give the opening tag of the first element that has the class.
 */
function openingTag(string $html, string $class): string
{
    preg_match('/<[a-z]+\b[^>]*\bclass="(?:[^"]*\s)?'.preg_quote($class, '/').'(?:\s[^"]*)?"[^>]*>/s', $html, $matches);

    expect($matches)->not->toBeEmpty("No element has the class [{$class}].");

    return $matches[0];
}
