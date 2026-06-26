<?php

declare(strict_types=1);

namespace Handlr\Module\Ab;

use Handlr\Core\Routes\Router;
use Handlr\Core\ServiceProvider;
use Handlr\Module\Ab\Pipes\CaptureAbEvent;
use Handlr\Module\Ab\Pipes\GetAbAssignments;
use Handlr\Module\Ab\Pipes\GetAbTestResults;
use Handlr\Module\Ab\Pipes\GetAbTests;
use Handlr\Module\Ab\Pipes\PatchUpdateAbTest;
use Handlr\Module\Ab\Pipes\PostCreateAbTest;

class AbServiceProvider extends ServiceProvider
{
    public function routes(Router $router): void
    {
        // Public: session-scoped variant assignments + event capture.
        $router->intoJunction('api.public')
            ->get('/ab/assignments', [GetAbAssignments::class])
            ->post('/ab/capture', [CaptureAbEvent::class]);

        // Admin: manage tests and read results.
        $router->intoJunction('api.admin')
            ->get('/ab', [GetAbTests::class])
            ->post('/ab', [PostCreateAbTest::class])
            ->get('/ab/{id}', [GetAbTestResults::class])
            ->patch('/ab/{id}', [PatchUpdateAbTest::class]);
    }

    public function migrationPaths(): array
    {
        return [dirname(__DIR__) . '/migrations'];
    }
}
