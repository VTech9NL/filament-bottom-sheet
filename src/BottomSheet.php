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
 *
 * `everywhere()` gives each action a sheet below a breakpoint. The action
 * keeps its own window type from the breakpoint, and its own options.
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
    public const array DEFAULT_SNAP_POINTS = [0.25, 0.5, 0.75, 1.0];

    public const string CONTENT_HEIGHT = 'content';

    public const string PART_MODAL_WINDOW = 'modal-window';

    public const string PART_MODAL_OVERLAY = 'modal-overlay';

    public const string PART_TRIGGER = 'trigger';

    /**
     * @var WeakMap<Action, self>|null
     */
    private static ?WeakMap $sheets = null;

    /**
     * The `->slideOver()` actions that the global switch changed to a modal
     * with the slide-over type from its breakpoint.
     *
     * @var WeakMap<Action, true>|null
     */
    private static ?WeakMap $slideOvers = null;

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
     * `false` hides the dark layer of the sheet type. The default keeps it.
     */
    private bool|Closure $overlay = true;

    private bool $overlayIsSet = false;

    private bool $snapPointsIsSet = false;

    private bool $initialHeightIsSet = false;

    /**
     * The breakpoint of the global switch: below it, the action is a sheet.
     */
    private ?string $below = null;

    /**
     * The options of the global switch, for each option that the action does
     * not set.
     */
    private ?self $defaults = null;

    /**
     * @var array<string, Closure>
     */
    private array $closures = [];

    /**
     * Make each action a bottom sheet below the breakpoint. From the
     * breakpoint, the action keeps its own window type. Call it in the boot
     * method of a service provider.
     *
     * @param  array<float|int>|null  $snapPoints
     */
    public static function everywhere(
        string $below = 'lg',
        ?array $snapPoints = null,
        float|int|string|null $initialHeight = self::CONTENT_HEIGHT,
        bool|Closure|null $overlay = null,
    ): void {
        $below = self::ensureBreakpoint($below, null);
        $defaults = new self;

        if ($snapPoints !== null) {
            $defaults->snapPoints($snapPoints);
        }

        if ($initialHeight !== null) {
            $defaults->initialHeight($initialHeight);
        }

        if ($overlay !== null) {
            $defaults->overlay($overlay);
        }

        Action::configureUsing(function (Action $action) use ($below, $defaults): void {
            $sheet = self::for($action);
            $sheet->below = $below;
            $sheet->defaults = $defaults;
        });
    }

    /**
     * Give the options of the action. Each call attaches the attributes to
     * the action, as lazy closures, so the order of the macro calls does not
     * matter. Filament adds a closure only one time.
     */
    public static function for(Action $action): self
    {
        self::$sheets ??= new WeakMap;

        $sheet = self::$sheets[$action] ??= new self;
        $sheet->attach($action);

        return $sheet;
    }

    private function attach(Action $action): void
    {
        $this->closures = $this->closures ?: [
            self::PART_MODAL_WINDOW => fn (Action $action): array => $this->attributes(self::PART_MODAL_WINDOW, $action),
            self::PART_MODAL_OVERLAY => fn (Action $action): array => $this->attributes(self::PART_MODAL_OVERLAY, $action),
            self::PART_TRIGGER => fn (Action $action): array => $this->attributes(self::PART_TRIGGER, $action),
        ];

        $action->extraModalWindowAttributes($this->closures[self::PART_MODAL_WINDOW], merge: true);
        $action->extraModalOverlayAttributes($this->closures[self::PART_MODAL_OVERLAY], merge: true);
        // An action without a modal renders no window: its trigger button
        // checks the conflicts.
        $action->extraAttributes($this->closures[self::PART_TRIGGER], merge: true);
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
        $this->snapPointsIsSet = true;

        return $this;
    }

    public function overlay(bool|Closure $condition = true): self
    {
        $this->overlay = $condition;
        $this->overlayIsSet = true;

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
            $this->initialHeightIsSet = true;

            return $this;
        }

        self::ensureViewportPart($height, 'initial height');

        $this->initialHeight = (float) $height;
        $this->initialHeightIsSet = true;

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

        if (! $this->isEnabled($action)) {
            return [];
        }

        $this->takeSlideOver($action);

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
     * The explicit `->bottomSheet()` condition, else the global switch for
     * each action that has a modal.
     */
    private function isEnabled(Action $action): bool
    {
        if ($this->isCalled) {
            return (bool) $action->evaluate($this->condition);
        }

        return $this->below !== null && $action->hasModal() !== false;
    }

    private function isGlobal(): bool
    {
        return ! $this->isCalled && $this->below !== null;
    }

    /**
     * The global switch makes a `->slideOver()` action a modal that the
     * directive shows as a slide-over from the breakpoint. Filament reads the
     * window attributes before the slide-over setting.
     */
    private function takeSlideOver(Action $action): void
    {
        self::$slideOvers ??= new WeakMap;

        if (! $this->isGlobal() || isset(self::$slideOvers[$action]) || ! $action->isModalSlideOver()) {
            return;
        }

        self::$slideOvers[$action] = true;
        $action->slideOver(false);
    }

    /**
     * @return array{0: ?string, 1: ?string} The modal and the slide-over breakpoints.
     */
    private function breakpoints(Action $action): array
    {
        if (! $this->isGlobal() || $this->modalFrom !== null || $this->slideOverFrom !== null) {
            return [$this->modalFrom, $this->slideOverFrom];
        }

        return isset(self::$slideOvers[$action]) ? [null, $this->below] : [$this->below, null];
    }

    /**
     * @return array<string, string>
     */
    private function options(Action $action): array
    {
        $options = [];
        [$modalFrom, $slideOverFrom] = $this->breakpoints($action);
        $defaults = $this->defaults ?? $this;

        if ($modalFrom !== null) {
            $options['data-bottom-sheet-modal-from'] = self::BREAKPOINTS[$modalFrom];
        }

        if ($slideOverFrom !== null) {
            $options['data-bottom-sheet-slide-over-from'] = self::BREAKPOINTS[$slideOverFrom];
            $options['data-bottom-sheet-slide-over-position'] = ($action->getModalSlideOverPosition() ?? SlideOverPosition::End)->value;
            // A Filament slide-over uses the action setting, or true when the
            // action has no setting. The properties are protected.
            $options['data-bottom-sheet-slide-over-sticky-header'] = self::slideOverSticky($action, 'header');
            $options['data-bottom-sheet-slide-over-sticky-footer'] = self::slideOverSticky($action, 'footer');
        }

        // Absent when the overlay stays, so the default render does not change.
        if ($action->evaluate($this->overlayIsSet ? $this->overlay : $defaults->overlay) === false) {
            $options['data-bottom-sheet-overlay'] = 'false';
        }

        // With the global switch, a nested action stacks on this sheet while
        // it is a sheet.
        if ($this->below !== null) {
            $options['data-bottom-sheet-stack'] = '';
        }

        return [
            ...$options,
            'data-bottom-sheet-snap-points' => (string) json_encode($this->snapPointsIsSet ? $this->snapPoints : $defaults->snapPoints),
            'data-bottom-sheet-initial-height' => (string) ($this->initialHeightIsSet ? $this->initialHeight : $defaults->initialHeight),
        ];
    }

    /**
     * The sticky value of the slide-over type: the action setting, or true.
     */
    private static function slideOverSticky(Action $action, string $part): string
    {
        $setting = Closure::bind(
            match ($part) {
                'header' => fn (): bool|Closure|null => $this->isModalHeaderSticky,
                'footer' => fn (): bool|Closure|null => $this->isModalFooterSticky,
            },
            $action,
            $action,
        )();

        return ((bool) ($action->evaluate($setting) ?? true)) ? 'true' : 'false';
    }

    /**
     * The macros can be called in each order, so the conflicts are checked
     * when the attributes are read.
     */
    private function ensureNoConflict(Action $action): void
    {
        if (! $this->isCalled && $this->below === null && ($this->modalFrom !== null || $this->slideOverFrom !== null || $this->overlayIsSet)) {
            throw new InvalidArgumentException(sprintf(
                'The action [%s] uses ->modalFrom(), ->slideOverFrom() or ->bottomSheetOverlay() without ->bottomSheet().',
                $action->getName(),
            ));
        }

        if (! $this->isEnabled($action) || $this->isGlobal()) {
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
        if ((! is_int($value) && ! is_float($value)) || ! is_finite((float) $value) || $value <= 0 || $value > 1) {
            throw new InvalidArgumentException("A bottom sheet {$name} is a finite part of the viewport height, more than 0 and at most 1.");
        }
    }
}
