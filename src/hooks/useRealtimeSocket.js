import { useEffect, useState } from 'react'
import { BASE_URL, SOCKET_TRANSPORTS } from '../constants'
import { AUTH_CHANGED_EVENT, socketHandshakeAuth, socketIdentityKey } from '../utils/authEvents'

/* ════════════════════════════════════════════════════════════════════
   APP-LEVEL REALTIME SOCKET

   - connects once the main thread is idle (socket.io-client is ~40 kB and
     is dynamically imported, so it never lands in the initial bundle)
   - re-connects whenever the session changes, so a user who logs in after
     page load stops being an anonymous socket and joins their own room
   - the server verifies the handshake, so the room is decided there
   - re-broadcasts server events as window events for the rest of the app
════════════════════════════════════════════════════════════════════ */

export function resolveSocketEndpoint() {
    const envSocket = process.env.REACT_APP_API_URL || ''
    const usable = envSocket && !envSocket.includes('localhost') && !envSocket.includes('127.0.0.1')
    return usable ? envSocket : (BASE_URL || window.location.origin)
}

export function resolveTransports() {
    const fromEnv = process.env.REACT_APP_SOCKET_TRANSPORTS
    return (fromEnv && fromEnv.split(',')) || SOCKET_TRANSPORTS || ['websocket', 'polling']
}

export default function useRealtimeSocket({ connectDelay = 1200 } = {}) {
    const [identity, setIdentity] = useState(() => socketIdentityKey())

    /* Keep the handshake identity in sync with login / logout.
       setState with an unchanged value is a no-op, so the socket is only
       rebuilt when the identity actually changes. */
    useEffect(() => {
        const sync = () => setIdentity(socketIdentityKey())
        window.addEventListener(AUTH_CHANGED_EVENT, sync)
        window.addEventListener('storage', sync)   // login/logout in another tab
        window.addEventListener('focus', sync)     // safety net
        return () => {
            window.removeEventListener(AUTH_CHANGED_EVENT, sync)
            window.removeEventListener('storage', sync)
            window.removeEventListener('focus', sync)
        }
    }, [])

    useEffect(() => {
        let socket = null
        let disposed = false
        let idleId = null
        let timerId = null

        const connect = async () => {
            if (disposed) return
            try {
                const { io } = await import('socket.io-client')
                if (disposed) return

                socket = io(resolveSocketEndpoint(), {
                    auth: socketHandshakeAuth(),
                    transports: resolveTransports(),
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 8000,
                    timeout: 12000
                })

                /* Server events re-broadcast as window events so any component can
                   react without opening its own socket. `dbChange` and
                   `userPasswordReset` were the only two forwarded, which is why an
                   admin changing an order status only reached the pages that had
                   built their own connection — everywhere else needed a manual
                   refresh. */
                const FORWARDED = [
                    'dbChange',
                    'userPasswordReset',
                    'statusUpdate',
                    'orderStatusUpdate',
                    'orderRefundProcessed',
                    'newOrder',
                    'dashboardUpdate'
                ]

                FORWARDED.forEach((name) => {
                    socket.on(name, (payload) => {
                        try {
                            window.dispatchEvent(new CustomEvent(`realtime:${name}`, { detail: payload }))
                        } catch (e) { /* ignore */ }
                    })
                })

                socket.on('connect_error', (err) => console.warn('Socket connect_error:', err && err.message))
            } catch (e) {
                console.warn('Realtime socket init failed', e && e.message)
            }
        }

        const schedule = () => {
            if (typeof window.requestIdleCallback === 'function') {
                idleId = window.requestIdleCallback(connect, { timeout: 3000 })
            } else {
                timerId = setTimeout(connect, connectDelay)
            }
        }

        if (document.readyState === 'complete') schedule()
        else window.addEventListener('load', schedule, { once: true })

        return () => {
            disposed = true
            if (timerId) clearTimeout(timerId)
            if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId)
            try { if (socket) socket.disconnect() } catch (e) { /* ignore */ }
        }
    }, [identity, connectDelay])

    return identity
}
