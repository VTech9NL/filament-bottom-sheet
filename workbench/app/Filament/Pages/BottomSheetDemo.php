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
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\Html;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Text;
use Filament\Schemas\Schema;
use Illuminate\Support\HtmlString;

/**
 * The demo page: one action for each example of the README. Each one is a
 * bottom sheet on a phone, and the first one has a nested confirmation. The
 * chat is an element sheet: it stays mounted while it is closed.
 */
class BottomSheetDemo extends Page
{
    protected static ?string $slug = 'bottom-sheet-demo';

    protected static ?string $title = 'Bottom sheet demo';

    /**
     * @var array<string>
     */
    public array $messages = [];

    public string $message = '';

    public function mount(): void
    {
        $this->messages = array_map(
            fn (int $line): string => "Message {$line} of the chat.",
            range(1, 20),
        );
    }

    public function send(): void
    {
        if (trim($this->message) === '') {
            return;
        }

        $this->messages[] = $this->message;
        $this->message = '';
    }

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
                ->modalDescription('A sheet with no dark layer. A tap outside closes it.')
                ->extraModalFooterActions([
                    // A second sheet over the first one.
                    Action::make('chatOver')
                        ->label('Chat')
                        ->color('gray')
                        ->alpineClickHandler("\$dispatch('bottom-sheet:open', { id: 'chat' })"),
                ])
                ->bottomSheet(initialHeight: 0.75, overlay: false),
            Action::make('chat')
                ->label('Chat')
                ->color('gray')
                ->alpineClickHandler("\$dispatch('bottom-sheet:open', { id: 'chat' })"),
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
                    ->schema([
                        Actions::make([
                            Action::make('ping')
                                ->label('Ping')
                                ->color('gray')
                                ->action(fn () => Notification::make()->title('Ping')->send()),
                        ]),
                        ...array_map(
                            fn (int $line): Text => Text::make("Line {$line} of the page."),
                            range(1, 30),
                        ),
                    ]),
                Html::make(fn (): HtmlString => $this->chatSheet()),
            ]);
    }

    /**
     * An element sheet: a list and a footer input. An outside tap reaches the
     * page, so the page stays usable while the chat is open.
     */
    private function chatSheet(): HtmlString
    {
        $lines = implode('', array_map(
            fn (string $message): string => '<li class="py-2">'.e($message).'</li>',
            $this->messages,
        ));

        return new HtmlString(<<<HTML
            <div
                x-data
                x-cloak
                x-bottom-sheet:element
                data-bottom-sheet-id="chat"
                data-bottom-sheet-initial-height="0.5"
                data-bottom-sheet-outside="pass"
                role="dialog"
                aria-label="Chat"
            >
                <p class="px-4 pt-2 pb-2 text-base font-semibold text-gray-950 dark:text-white">Chat</p>
                <ul data-bottom-sheet-content class="divide-y divide-gray-100 px-4 text-sm text-gray-700 dark:divide-white/10 dark:text-gray-300">{$lines}</ul>
                <form data-bottom-sheet-footer wire:submit="send" class="flex gap-2 border-t border-gray-200 p-3 dark:border-white/10">
                    <input
                        wire:model="message"
                        type="text"
                        placeholder="Write a message"
                        aria-label="Message"
                        class="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                    <button type="submit" class="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white">Send</button>
                </form>
            </div>
            HTML);
    }
}
