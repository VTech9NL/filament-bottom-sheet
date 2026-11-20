<?php

declare(strict_types=1);

namespace VTech9NL\BottomSheet;

use Closure;
use Filament\Actions\Action;
use Filament\Schemas\Components\Section;
use InvalidArgumentException;
use WeakMap;

/**
 * The bottom sheet options of one action or section, and the attributes that
 * the `x-bottom-sheet` Alpine directive reads from the rendered markup.
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

    public const string DEFAULT_UNTIL = 'md';

    /**
     * @var list<float>
     */
    public const array DEFAULT_SNAP_POINTS = [0.5, 0.8, 1.0];

    public const string CONTENT_HEIGHT = 'content';

    public const string PART_MODAL_WINDOW = 'modal-window';

    public const string PART_MODAL_OVERLAY = 'modal-overlay';

    public const string PART_SECTION = 'section';

    /**
     * @var WeakMap<Action|Section, self>|null
     */
    private static ?WeakMap $sheets = null;

    private bool|Closure $condition = false;

    private string $until = self::DEFAULT_UNTIL;

    /**
     * @var list<float>
     */
    private array $snapPoints = self::DEFAULT_SNAP_POINTS;

    private float|string $initialHeight = self::CONTENT_HEIGHT;

    /**
     * Give the options of the component. The first call attaches the
     * attributes to the component, as lazy closures, so the order of the
     * macro calls does not matter.
     */
    public static function for(Action|Section $component): self
    {
        self::$sheets ??= new WeakMap;

        if (isset(self::$sheets[$component])) {
            return self::$sheets[$component];
        }

        $sheet = new self;
        self::$sheets[$component] = $sheet;

        if ($component instanceof Action) {
            $component->extraModalWindowAttributes(
                fn (Action $action): array => $sheet->attributes(self::PART_MODAL_WINDOW, $action),
                merge: true,
            );
            $component->extraModalOverlayAttributes(
                fn (Action $action): array => $sheet->attributes(self::PART_MODAL_OVERLAY, $action),
                merge: true,
            );
        } else {
            $component->extraAttributes(
                fn (Section $section): array => $sheet->attributes(self::PART_SECTION, $section),
                merge: true,
            );
        }

        return $sheet;
    }

    public function enabled(bool|Closure $condition = true): self
    {
        $this->condition = $condition;

        return $this;
    }

    public function until(string $breakpoint): self
    {
        if (! array_key_exists($breakpoint, self::BREAKPOINTS)) {
            throw new InvalidArgumentException(sprintf(
                'The bottom sheet breakpoint [%s] is not one of [%s].',
                $breakpoint,
                implode(', ', array_keys(self::BREAKPOINTS)),
            ));
        }

        $this->until = $breakpoint;

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
    public function attributes(string $part, Action|Section $component): array
    {
        if (! $component->evaluate($this->condition)) {
            return [];
        }

        return match ($part) {
            self::PART_MODAL_WINDOW => [
                'x-bottom-sheet' => '',
                'wire:ignore.self' => '',
                ...$this->options(),
            ],
            self::PART_MODAL_OVERLAY => [
                'data-bottom-sheet-overlay' => '',
            ],
            self::PART_SECTION => [
                'x-bottom-sheet.section' => '',
                'data-bottom-sheet-id' => $this->sectionId($component),
                ...$this->options(),
            ],
            default => throw new InvalidArgumentException("The bottom sheet part [{$part}] does not exist."),
        };
    }

    /**
     * @return array<string, string>
     */
    private function options(): array
    {
        return [
            'data-bottom-sheet-until' => self::BREAKPOINTS[$this->until],
            'data-bottom-sheet-snap-points' => (string) json_encode($this->snapPoints),
            'data-bottom-sheet-initial-height' => (string) $this->initialHeight,
        ];
    }

    private function sectionId(Action|Section $section): string
    {
        $id = $section instanceof Section ? $section->getId() : null;

        if (blank($id)) {
            throw new InvalidArgumentException('A section bottom sheet needs an id() or a key(), for the open-bottom-sheet event.');
        }

        return $id;
    }

    private static function ensureViewportPart(mixed $value, string $name): void
    {
        if ((! is_int($value) && ! is_float($value)) || $value <= 0 || $value > 1) {
            throw new InvalidArgumentException("A bottom sheet {$name} is a part of the viewport height, more than 0 and at most 1.");
        }
    }
}
