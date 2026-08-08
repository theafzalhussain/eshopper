import { renderHook, act, waitFor } from '@testing-library/react'
import { io } from 'socket.io-client'
import useRealtimeSocket from '../hooks/useRealtimeSocket'
import { notifyAuthChanged, socketHandshakeAuth, socketIdentityKey } from '../utils/authEvents'

jest.mock('socket.io-client', () => ({ io: jest.fn() }))

const sockets = []
const ioMock = io

const lastHandshake = () => sockets[sockets.length - 1].opts.auth
const lastHandshakeUserId = () => lastHandshake().userId

/* The hook waits for an idle callback; jsdom has none, so it falls back to
   setTimeout — advance it and let the dynamic import resolve. */
const flushConnect = async () => {
    await act(async () => {
        jest.advanceTimersByTime(1500)
        await Promise.resolve()
        await Promise.resolve()
    })
}

beforeEach(() => {
    jest.useFakeTimers()
    sockets.length = 0
    ioMock.mockReset()
    ioMock.mockImplementation((endpoint, opts) => {
        const s = { endpoint, opts, on: jest.fn(), disconnect: jest.fn() }
        sockets.push(s)
        return s
    })
    localStorage.clear()
})

afterEach(() => {
    jest.useRealTimers()
    localStorage.clear()
})

describe('socket handshake payload', () => {
    test('guest sends no id, user sends its id, admin also sends the admin token', () => {
        expect(socketHandshakeAuth()).toEqual({ userId: null })

        localStorage.setItem('userid', 'u123')
        expect(socketHandshakeAuth()).toEqual({ userId: 'u123' })

        localStorage.setItem('role', 'Admin')
        localStorage.setItem('adminToken', 'jwt.token.value')
        expect(socketHandshakeAuth()).toEqual({ userId: 'u123', adminToken: 'jwt.token.value' })
    })

    test('never sends a self-declared admin room name', () => {
        localStorage.setItem('userid', 'u123')
        localStorage.setItem('role', 'Admin')
        localStorage.setItem('isAdmin', 'true')
        expect(JSON.stringify(socketHandshakeAuth())).not.toContain('admin-dashboard')
    })

    test('identity key changes when the admin token appears', () => {
        localStorage.setItem('userid', 'u123')
        const asUser = socketIdentityKey()
        localStorage.setItem('adminToken', 'jwt.token.value')
        expect(socketIdentityKey()).not.toBe(asUser)
    })
})

describe('useRealtimeSocket', () => {
    test('a guest connects with userId null', async () => {
        renderHook(() => useRealtimeSocket())
        await flushConnect()

        expect(ioMock).toHaveBeenCalledTimes(1)
        expect(lastHandshakeUserId()).toBeNull()
    })

    test('logging in after page load reconnects with the user id — no reload needed', async () => {
        renderHook(() => useRealtimeSocket())
        await flushConnect()
        expect(lastHandshakeUserId()).toBeNull()
        const guestSocket = sockets[0]

        // what Login.jsx does
        localStorage.setItem('login', 'true')
        localStorage.setItem('userid', 'u777')
        localStorage.setItem('role', 'User')
        await act(async () => { notifyAuthChanged() })
        await flushConnect()

        await waitFor(() => expect(ioMock).toHaveBeenCalledTimes(2))
        expect(lastHandshakeUserId()).toBe('u777')
        expect(guestSocket.disconnect).toHaveBeenCalled()
    })

    test('an admin login sends its id plus the admin token', async () => {
        renderHook(() => useRealtimeSocket())
        await flushConnect()

        localStorage.setItem('userid', 'a1')
        localStorage.setItem('role', 'Admin')
        localStorage.setItem('adminToken', 'jwt.token.value')
        await act(async () => { notifyAuthChanged() })
        await flushConnect()

        expect(lastHandshake()).toEqual({ userId: 'a1', adminToken: 'jwt.token.value' })
    })

    test('logout drops back to a guest connection', async () => {
        localStorage.setItem('userid', 'u777')
        renderHook(() => useRealtimeSocket())
        await flushConnect()
        expect(lastHandshakeUserId()).toBe('u777')

        localStorage.clear()                 // what Navbaar logout does
        await act(async () => { notifyAuthChanged() })
        await flushConnect()

        expect(ioMock).toHaveBeenCalledTimes(2)
        expect(lastHandshakeUserId()).toBeNull()
    })

    test('an unrelated auth notification does not rebuild the socket', async () => {
        localStorage.setItem('userid', 'u777')
        renderHook(() => useRealtimeSocket())
        await flushConnect()

        await act(async () => { notifyAuthChanged() })   // same identity
        await flushConnect()

        expect(ioMock).toHaveBeenCalledTimes(1)
    })

    test('a login in another tab is picked up via the storage event', async () => {
        renderHook(() => useRealtimeSocket())
        await flushConnect()

        localStorage.setItem('userid', 'u999')
        await act(async () => { window.dispatchEvent(new Event('storage')) })
        await flushConnect()

        expect(lastHandshakeUserId()).toBe('u999')
    })
})
