<?php

declare(strict_types=1);

namespace VTech9NL\BottomSheet;

use Closure;
use Filament\Actions\Action;
use Filament\Support\Enums\SlideOverPosition;
use InvalidArgumentException;
use WeakMap;

/**
 * The bottom sheet options of one action, and the attributes that the
 * `x-bottom-sheet` Alpine directive reads from the rendered markup.
 *
 * The bottom sheet is the window type of the action at each width. From the
 * breakpoint of `modalFrom()` or `slideOverFrom()` and up, the directive
 * shows the same window as the Filament modal or slide-over.
 */
final class BottomSheet
{
    /**
     * The Tailwind CSS v4 default breakpoints.
     *
     * @var array<string, string>
     */
    public const array BREAKPOINTS = [
        'sm' => '40rem',
        'md' => '48rem',
        'lg' => '64rem',
        'xl' => '80rem',
        '2xl' => '96rem',
    ];

    /**
     * @var list<float>
     */
    public const array DEFAULT_SNAP_POINTS = [0.5, 0.8, 1.0];

    public const string CONTENT_HEIGHT = 'content';

    public const string PART_MODAL_WINDOW = 'modal-window';

    public const string PART_MODAL_OVERLAY = 'modal-overlay';

    public const string PART_TRIGGER = 'trigger';

    /**
     * @var WeakMap<Action, self>|null
     */
    private static ?WeakMap $sheets = null;

    private bool|Closure $condition = false;

    private bool $isCalled = false;

    private ?string $modalFrom = null;

    private ?string $slideOverFrom = null;

    /**
     * @var list<float>
     */
    private array $snapPoints = self::DEFAULT_SNAP_POINTS;

    private float|string $initialHeight = self::CONTENT_HEIGHT;

    /**
     * Give the options of the action. The first call attaches the
     * attributes to the action, as lazy closures, so the order of the macro
     * calls does not matter.
     */
    public static function for(Action $action): self
    {
        self::$sheets ??= new WeakMap;

        if (isset(self::$sheets[$action])) {
            return self::$sheets[$action];
        }

        $sheet = new self;
        self::$sheets[$action] = $sheet;

        $action->extraModalWindowAttributes(
            fn (Action $action): array => $sheet->attributes(self::PART_MODAL_WINDOW, $action),
            merge: true,
        );
        $action->extraModalOverlayAttributes(
            fn (Action $action): array => $sheet->attributes(self::PART_MODAL_OVERLAY, $action),
            merge: true,
        );
        // An action without a modal renders no window: its trigger button
        // checks the conflicts.
        $action->extraAttributes(
            fn (Action $action): array => $sheet->attributes(self::PART_TRIGGER, $action),
            merge: true,
        );

        return $sheet;
    }

    public function enabled(bool|Closure $condition = true): self
    {
        $this->condition = $condition;
        $this->isCalled = true;

        return $this;
    }

    public function modalFrom(string $breakpoint): self
    {
        $this->modalFrom = self::ensureBreakpoint($breakpoint, $this->slideOverFrom);

        return $this;
    }

    public function slideOverFrom(string $breakpoint): self
    {
        $this->slideOverFrom = self::ensureBreakpoint($breakpoint, $this->modalFrom);

        return $this;
    }

    /**
     * @param  array<float|int>  $points  The heights, as parts of the viewport height.
     */
    public function snapPoints(array $points): self
    {
        if ($points === []) {
            throw new InvalidArgumentException('A bottom sheet needs at least one snap point.');
        }

        foreach ($points as $point) {
            self::ensureViewportPart($point, 'snap point');
        }

        $points = array_map(floatval(...), $points);
        sort($points);

        $this->snapPoints = array_values(array_unique($points, SORT_REGULAR));

        return $this;
    }

    public function initialHeight(float|int|string $height): self
    {
        if (is_string($height)) {
            if ($height !== self::CONTENT_HEIGHT) {
                throw new InvalidArgumentException(sprintf(
                    'The bottom sheet initial height [%s] is not [%s] or a part of the viewport height.',
                    $height,
                    self::CONTENT_HEIGHT,
                ));
            }

            $this->initialHeight = $height;

            return $this;
        }

        self::ensureViewportPart($height, 'initial height');

        $this->initialHeight = (float) $height;

        return $this;
    }

    /**
     * Give the attributes of one part of the sheet. With the sheet disabled,
     * the result is empty, so the part renders as Filament renders it.
     *
     * @return array<string, string>
     */
    public function attributes(string $part, Action $action): array
    {
        $this->ensureNoConflict($action);

        if (! $action->evaluate($this->condition)) {
            return [];
        }

        return match ($part) {
            // `wire:ignore.self` keeps the classes of the directive. Before a
            // Livewire update, the directive reads the new attributes of the
            // markup, so a new condition or option takes effect.
            self::PART_MODAL_WINDOW => [
                'x-bottom-sheet' => '',
                'wire:ignore.self' => '',
                ...$this->options($action),
            ],
            self::PART_MODAL_OVERLAY => [
                'data-bottom-sheet-overlay' => '',
            ],
            self::PART_TRIGGER => [],
            default => throw new InvalidArgumentException("The bottom sheet part [{$part}] does not exist."),
        };
    }

    /**
     * @return array<string, string>
     */
    private function options(Action $action): array
    {
        $options = [];

        if ($this->modalFrom !== null) {
            $options['data-bottom-sheet-modal-from'] = self::BREAKPOINTS[$this->modalFrom];
        }

        if ($this->slideOverFrom !== null) {
            $options['data-bottom-sheet-slide-over-from'] = self::BREAKPOINTS[$this->slideOverFrom];
            $options['data-bottom-sheet-slide-over-position'] = ($action->getModalSlideOverPosition() ?? SlideOverPosition::End)->value;
        }

        return [
            ...$options,
            'data-bottom-sheet-snap-points' => (string) json_encode($this->snapPoints),
            'data-bottom-sheet-initial-height' => (string) $this->initialHeight,
        ];
    }

    /**
     * The macros can be called in each order, so the conflicts are checked
     * when the attributes are read.
     */
    private function ensureNoConflict(Action $action): void
    {
        if (! $this->isCalled && ($this->modalFrom !== null || $this->slideOverFrom !== null)) {
            throw new InvalidArgumentException(sprintf(
                'The action [%s] uses ->modalFrom() or ->slideOverFrom() without ->bottomSheet().',
                $action->getName(),
            ));
        }

        if (! $action->evaluate($this->condition)) {
            return;
        }

        if ($action->isModalSlideOver() || $action->hasModal() === false) {
            throw new InvalidArgumentException(sprintf(
                'The bottom sheet action [%s] cannot use ->slideOver() or ->modal(false): use ->slideOverFrom() or ->modalFrom().',
                $action->getName(),
            ));
        }
    }

    private static function ensureBreakpoint(string $breakpoint, ?string $other): string
    {
        if (! array_key_exists($breakpoint, self::BREAKPOINTS)) {
            throw new InvalidArgumentException(sprintf(
                'The bottom sheet breakpoint [%s] is not one of [%s].',
                $breakpoint,
                implode(', ', array_keys(self::BREAKPOINTS)),
            ));
        }

        if ($breakpoint === $other) {
            throw new InvalidArgumentException("The bottom sheet cannot use the breakpoint [{$breakpoint}] for ->modalFrom() and ->slideOverFrom().");
        }

        return $breakpoint;
    }

    private static function ensureViewportPart(mixed $value, string $name): void
    {
        if ((! is_int($value) && ! is_float($value)) || $value <= 0 || $value > 1) {
            throw new InvalidArgumentException("A bottom sheet {$name} is a part of the viewport height, more than 0 and at most 1.");
        }
    }
}
