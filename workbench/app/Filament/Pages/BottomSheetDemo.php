<?php

declare(strict_types=1);

namespace Workbench\App\Filament\Pages;

use Filament\Actions\Action;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Text;
use Filament\Schemas\Schema;

/**
 * The demo page: one action for each example of the README. Each one is a
 * bottom sheet on a phone, and the first one has a nested confirmation.
 */
class BottomSheetDemo extends Page
{
    protected static ?string $slug = 'bottom-sheet-demo';

    protected static ?string $title = 'Bottom sheet demo';

    /**
     * @return array<Action>
     */
    protected function getHeaderActions(): array
    {
        return [
            $this->editAction('edit', 'Edit the show')
                ->modalDescription('A sheet below md, a modal from md, a slide-over from lg.')
                ->extraModalFooterActions([
                    Action::make('reset')
                        ->label('Reset')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->modalDescription('A nested confirmation. On a phone, it opens on top of the first sheet.')
                        // Filament keeps the parent modal open under it.
                        ->overlayParentActions()
                        ->bottomSheet()
                        ->modalFrom('md')
                        ->action(fn () => Notification::make()->title('Reset')->send()),
                ])
                ->bottomSheet()
                ->modalFrom('md')
                ->slideOverFrom('lg'),
            $this->editAction('slideOver', 'Slide-over from lg')
                ->color('gray')
                ->modalDescription('A sheet below lg, a slide-over from lg.')
                ->bottomSheet()
                ->slideOverFrom('lg'),
            $this->editAction('modal', 'Modal from md')
                ->color('gray')
                ->modalDescription('A sheet below md, a modal from md.')
                ->bottomSheet()
                ->modalFrom('md'),
            $this->editAction('noOverlay', 'Sheet, no overlay')
                ->color('gray')
                ->modalDescription('A sheet with no dark layer. The page behind stays visible and usable.')
                ->bottomSheet()
                ->bottomSheetOverlay(false),
        ];
    }

    private function editAction(string $name, string $label): Action
    {
        return Action::make($name)
            ->label($label)
            ->schema([
                TextInput::make('title')->required()->default('Late show'),
                Select::make('stage')->options(['main' => 'Main stage', 'side' => 'Side stage'])->default('main'),
                DatePicker::make('date'),
                Toggle::make('live'),
                Textarea::make('notes')->rows(3),
            ])
            ->action(fn () => Notification::make()->title('Saved')->success()->send());
    }

    public function content(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Programme')
                    ->description('The page content, so that the page scrolls behind a window.')
                    ->schema(array_map(
                        fn (int $line): Text => Text::make("Line {$line} of the page."),
                        range(1, 30),
                    )),
            ]);
    }
}
