import { lazy } from 'react';
import { isChunkLoadFailure } from './chunkRecovery';

/**
 * React.lazy with a retry.
 *
 * A chunk request can fail for a transient reason (flaky network, CDN edge
 * miss) as well as a permanent one (stale build after deploy). We retry a
 * couple of times with a short backoff; if it still fails, the rejection is
 * re-thrown so the route error boundary can decide what to show.
 *
 * Usage: const AdminHome = lazyWithRetry(() => import('./Admin/AdminHome'))
 */
export default function lazyWithRetry(factory, { retries = 2, delay = 500 } = {}) {
    return lazy(() => attempt(factory, retries, delay));
}

function attempt(factory, retries, delay) {
    return factory().catch((error) => {
        if (retries <= 0 || !isChunkLoadFailure(error)) throw error;
        return new Promise((resolve) => setTimeout(resolve, delay))
            .then(() => attempt(factory, retries - 1, delay * 2));
    });
}
