<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::redirect('/', '/admin/bottom-sheet-demo');

// The theme of the demo panel, built from `workbench/resources/css/theme.css`.
Route::get('/workbench/theme.css', fn () => response()->file(
    dirname(__DIR__).'/public/theme.css',
    ['Content-Type' => 'text/css', 'Cache-Control' => 'no-store'],
));
