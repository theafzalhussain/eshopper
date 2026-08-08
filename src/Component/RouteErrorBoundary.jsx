import React from 'react';
import {
    isChunkLoadFailure,
    recoverFromChunkError,
    chunkRecoveryExhausted
} from '../utils/chunkRecovery';

/* ════════════════════════════════════════════════════════════════════
   ROUTE ERROR BOUNDARY

   Without a boundary above <Suspense>, a rejected lazy() import unmounts
   the entire React tree and the user just sees a blank page (this is what
   happened on /admin-home after a deploy). This boundary:

   - auto-recovers from stale-build chunk failures (one cache-busted reload)
   - otherwise renders a readable message with a retry / home action
════════════════════════════════════════════════════════════════════ */
export default class RouteErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, reloading: false };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        if (isChunkLoadFailure(error) && !chunkRecoveryExhausted()) {
            const triggered = recoverFromChunkError(error);
            if (triggered) {
                this.setState({ reloading: true });
                return;
            }
        }
        // Surface to Sentry/Datadog if they have booted.
        try {
            window.__eshopperCaptureError?.(error, info);
        } catch (_) { /* ignore */ }
        console.error('[Eshopper] Route render failed:', error);
    }

    handleRetry = () => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('_r', String(Date.now()));
            window.location.replace(url.toString());
        } catch (_) {
            window.location.reload();
        }
    };

    render() {
        const { error, reloading } = this.state;
        if (!error) return this.props.children;

        const stale = isChunkLoadFailure(error);

        if (reloading) {
            return (
                <div style={styles.wrap} role="status" aria-live="polite">
                    <p style={styles.title}>Updating to the latest version…</p>
                </div>
            );
        }

        return (
            <div style={styles.wrap} role="alert">
                <h1 style={styles.title}>
                    {stale ? 'A new version is available' : 'Something went wrong'}
                </h1>
                <p style={styles.text}>
                    {stale
                        ? 'This tab was running an older build of the app. Reload to continue.'
                        : 'This page could not be loaded. Reloading usually fixes it.'}
                </p>
                <div style={styles.actions}>
                    <button type="button" onClick={this.handleRetry} style={styles.primaryBtn}>
                        Reload page
                    </button>
                    <a href="/" style={styles.secondaryBtn}>Go to home</a>
                </div>
                {process.env.NODE_ENV !== 'production' && (
                    <pre style={styles.pre}>{String(error?.message || error)}</pre>
                )}
            </div>
        );
    }
}

const styles = {
    wrap: {
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '48px 20px',
        textAlign: 'center'
    },
    title: { fontSize: '1.35rem', fontWeight: 600, margin: 0, color: '#111' },
    text: { margin: 0, color: '#555', maxWidth: '460px', lineHeight: 1.6 },
    actions: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' },
    primaryBtn: {
        padding: '10px 22px',
        borderRadius: '999px',
        border: 'none',
        background: '#111',
        color: '#fff',
        fontWeight: 600,
        cursor: 'pointer'
    },
    secondaryBtn: {
        padding: '10px 22px',
        borderRadius: '999px',
        border: '1px solid #111',
        color: '#111',
        fontWeight: 600,
        textDecoration: 'none'
    },
    pre: {
        marginTop: '16px',
        maxWidth: '90vw',
        overflowX: 'auto',
        fontSize: '12px',
        color: '#a00',
        textAlign: 'left'
    }
};
