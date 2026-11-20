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
        Action::macro('bottomSheet', function (bool|Closure $condition = true): static {
            /** @var Action $this */
            BottomSheet::for($this)->enabled($condition);

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

        Action::macro('bottomSheetSnapPoints', function (array $points): static {
            /** @var Action $this */
            BottomSheet::for($this)->snapPoints($points);

            return $this;
        });

        Action::macro('bottomSheetInitialHeight', function (float|int|string $height): static {
            /** @var Action $this */
            BottomSheet::for($this)->initialHeight($height);

            return $this;
        });

        FilamentAsset::register([
            Css::make('bottom-sheet', __DIR__.'/../resources/css/bottom-sheet.css'),
            Js::make('bottom-sheet', __DIR__.'/../resources/dist/bottom-sheet.js'),
        ], self::PACKAGE);
    }
}
