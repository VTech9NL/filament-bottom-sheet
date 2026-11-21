<?php

declare(strict_types=1);

namespace Workbench\App\Providers;

use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Panel;
use Filament\PanelProvider;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\HtmlString;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use VTech9NL\BottomSheet\BottomSheet;
use Workbench\App\Filament\Pages\BottomSheetDemo;

/**
 * The demo panel of the workbench. It has no login, so a browser opens the
 * demo page directly. The global switch makes each action a sheet below lg.
 */
class AdminPanelProvider extends PanelProvider
{
    public function boot(): void
    {
        BottomSheet::everywhere();
    }

    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            // The theme of the workbench, built with `composer workbench:css`.
            // It has `@source` for the package files, as a host panel does.
            ->theme(new HtmlString('<link rel="stylesheet" href="/workbench/theme.css">'))
            ->pages([BottomSheetDemo::class])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ]);
    }
}
