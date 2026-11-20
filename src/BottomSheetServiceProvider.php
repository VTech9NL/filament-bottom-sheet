<?php

declare(strict_types=1);

namespace VTech9NL\BottomSheet;

use Closure;
use Filament\Actions\Action;
use Filament\Schemas\Components\Section;
use Filament\Support\Assets\Css;
use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\ServiceProvider;

class BottomSheetServiceProvider extends ServiceProvider
{
    public const string PACKAGE = 'vtech9nl/filament-bottom-sheet';

    public function boot(): void
    {
        foreach ([Action::class, Section::class] as $component) {
            // `bottomSheet('lg')` is short for `bottomSheet(true, 'lg')`.
            $component::macro('bottomSheet', function (bool|Closure|string $condition = true, string $until = BottomSheet::DEFAULT_UNTIL): static {
                /** @var Action|Section $this */
                if (is_string($condition)) {
                    [$condition, $until] = [true, $condition];
                }

                BottomSheet::for($this)->enabled($condition)->until($until);

                return $this;
            });

            $component::macro('bottomSheetSnapPoints', function (array $points): static {
                /** @var Action|Section $this */
                BottomSheet::for($this)->snapPoints($points);

                return $this;
            });

            $component::macro('bottomSheetInitialHeight', function (float|int|string $height): static {
                /** @var Action|Section $this */
                BottomSheet::for($this)->initialHeight($height);

                return $this;
            });
        }

        FilamentAsset::register([
            Css::make('bottom-sheet', __DIR__.'/../resources/css/bottom-sheet.css'),
            Js::make('bottom-sheet', __DIR__.'/../resources/dist/bottom-sheet.js'),
        ], self::PACKAGE);
    }
}
