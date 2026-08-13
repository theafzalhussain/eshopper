import React from 'react';
import {
    isChunkLoadFailure,
    recoverFromChunkError,
    chunkRecoveryExhausted
} from '../utils/chunkRecovery';

/* ════════════════════════════════════════════════════════════════════
   WIDGET ERROR BOUNDARY

   RouteErrorBoundary only wraps <Routes>. Everything else in the shell —
   Navbaar, Footer, ChatBot, the auth nudge — sat outside any boundary, so
   a single throw inside one of those widgets unmounted the whole React
   tree and the customer saw a blank page instead of the shop.

   This boundary isolates a non-critical widget: the widget disappears,
   the rest of the page keeps working, and the error is still reported to
   Sentry/Datadog through the capture bridge installed by monitoring.js.
════════════════════════════════════════════════════════════════════ */
export default class WidgetErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error, info) {
        /* A stale-build chunk failure is recoverable — reload once. */
        if (isChunkLoadFailure(error) && !chunkRecoveryExhausted()) {
            if (recoverFromChunkError(error)) return;
        }

        try {
            window.__eshopperCaptureError?.(error, {
                ...info,
                widget: this.props.name || 'unknown'
            });
        } catch (_) { /* reporting must never throw */ }

        console.warn(`[Eshopper] Widget "${this.props.name || 'unknown'}" failed and was hidden:`, error);
    }

    render() {
        if (this.state.failed) return this.props.fallback ?? null;
        return this.props.children;
    }
}
