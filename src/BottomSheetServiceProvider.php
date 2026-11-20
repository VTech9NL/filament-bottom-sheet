<?php

declare(strict_types=1);

namespace VTech9NL\BottomSheet;

use Closure;
use Filament\Actions\Action;
use Filament\Support\Assets\Css;
use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\ServiceProvider;

class BottomSheetServiceProvider extends ServiceProvider
{
    public const string PACKAGE = 'vtech9nl/filament-bottom-sheet';

    public function boot(): void
    {
        // A named argument that is null does not change its option, so an
        // alias call before ->bottomSheet() keeps its value.
        Action::macro('bottomSheet', function (
            bool|Closure $condition = true,
            ?array $snapPoints = null,
            float|int|string|null $initialHeight = null,
            bool|Closure|null $overlay = null,
        ): static {
            /** @var Action $this */
            $sheet = BottomSheet::for($this)->enabled($condition);

            if ($snapPoints !== null) {
                $sheet->snapPoints($snapPoints);
            }

            if ($initialHeight !== null) {
                $sheet->initialHeight($initialHeight);
            }

            if ($overlay !== null) {
                $sheet->overlay($overlay);
            }

            return $this;
        });

        Action::macro('modalFrom', function (string $breakpoint): static {
            /** @var Action $this */
            BottomSheet::for($this)->modalFrom($breakpoint);

            return $this;
        });

        Action::macro('slideOverFrom', function (string $breakpoint): static {
            /** @var Action $this */
            BottomSheet::for($this)->slideOverFrom($breakpoint);

            return $this;
        });

        /**
         * @deprecated Use ->bottomSheet(snapPoints: ...).
         */
        Action::macro('bottomSheetSnapPoints', function (array $points): static {
            /** @var Action $this */
            BottomSheet::for($this)->snapPoints($points);

            return $this;
        });

        /**
         * @deprecated Use ->bottomSheet(initialHeight: ...).
         */
        Action::macro('bottomSheetInitialHeight', function (float|int|string $height): static {
            /** @var Action $this */
            BottomSheet::for($this)->initialHeight($height);

            return $this;
        });

        /**
         * @deprecated Use ->bottomSheet(overlay: ...).
         */
        Action::macro('bottomSheetOverlay', function (bool|Closure $condition = true): static {
            /** @var Action $this */
            BottomSheet::for($this)->overlay($condition);

            return $this;
        });

        FilamentAsset::register([
            Css::make('bottom-sheet', __DIR__.'/../resources/css/bottom-sheet.css'),
            Js::make('bottom-sheet', __DIR__.'/../resources/dist/bottom-sheet.js'),
        ], self::PACKAGE);
    }
}
