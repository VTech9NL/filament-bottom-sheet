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
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Text;
use Filament\Schemas\Schema;

/**
 * The demo page of PRD requirement 24: an action sheet with a nested
 * confirmation, and a section sheet with a long form and footer actions.
 */
class BottomSheetDemo extends Page
{
    protected static ?string $slug = 'bottom-sheet-demo';

    protected static ?string $title = 'Bottom sheet demo';

    /**
     * @var array<string, mixed>
     */
    public ?array $data = [];

    public function mount(): void
    {
        $this->content->fill();
    }

    /**
     * @return array<Action>
     */
    protected function getHeaderActions(): array
    {
        return [
            Action::make('edit')
                ->label('Edit the show')
                ->modalDescription('An action with a form. Below lg it is a bottom sheet.')
                ->schema([
                    TextInput::make('title')->required()->default('Late show'),
                    Select::make('stage')->options(['main' => 'Main stage', 'side' => 'Side stage'])->default('main'),
                    Textarea::make('notes')->rows(3),
                ])
                ->extraModalFooterActions([
                    Action::make('reset')
                        ->label('Reset')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->modalDescription('A nested confirmation. It opens on top of the first sheet.')
                        // Filament keeps the parent modal open under it.
                        ->overlayParentActions()
                        ->bottomSheet('lg')
                        ->action(fn () => Notification::make()->title('Reset')->send()),
                ])
                ->action(fn () => Notification::make()->title('Saved')->success()->send())
                ->bottomSheet('lg'),
            Action::make('openRoom')
                ->label('Room')
                ->color('gray')
                ->alpineClickHandler("\$dispatch('open-bottom-sheet', { id: 'room' })")
                ->extraAttributes(['class' => 'lg:hidden']),
        ];
    }

    public function content(Schema $schema): Schema
    {
        return $schema
            ->statePath('data')
            ->components([
                Grid::make(['default' => 1, 'lg' => 3])->schema([
                    Section::make('Programme')
                        ->description('The page content. Below lg, the room section is a bottom sheet: open it with the Room button.')
                        ->columnSpan(['lg' => 2])
                        ->schema(array_map(
                            fn (int $line): Text => Text::make("Line {$line} of the page, so that the page scrolls behind a sheet."),
                            range(1, 30),
                        )),
                    Section::make('Room')
                        ->id('room')
                        ->description('A section with a long form and footer actions.')
                        ->schema([
                            TextInput::make('room.name')->label('Name')->default('Studio 1'),
                            Select::make('room.camera')->label('Camera')->options(['a' => 'Camera A', 'b' => 'Camera B']),
                            DatePicker::make('room.date')->label('Date'),
                            Toggle::make('room.live')->label('Live'),
                            ...array_map(
                                fn (int $field): TextInput => TextInput::make("room.field{$field}")->label("Field {$field}"),
                                range(1, 10),
                            ),
                            Textarea::make('room.notes')->label('Notes')->rows(4),
                        ])
                        ->footerActions([
                            Action::make('saveRoom')
                                ->label('Save')
                                ->action(fn () => Notification::make()->title('Room saved')->success()->send()),
                            Action::make('clearRoom')
                                ->label('Clear')
                                ->color('danger')
                                ->requiresConfirmation()
                                ->modalDescription('An action sheet on top of the section sheet.')
                                ->bottomSheet('lg')
                                ->action(fn () => Notification::make()->title('Room cleared')->send()),
                            Action::make('closeRoom')
                                ->label('Close')
                                ->color('gray')
                                ->alpineClickHandler("\$dispatch('close-bottom-sheet', { id: 'room' })")
                                ->extraAttributes(['class' => 'lg:hidden']),
                        ])
                        ->bottomSheet('lg'),
                ]),
            ]);
    }
}
