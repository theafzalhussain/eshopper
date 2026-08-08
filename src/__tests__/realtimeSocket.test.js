import { renderHook, act, waitFor } from '@testing-library/react'
import { io } from 'socket.io-client'
import useRealtimeSocket from '../hooks/useRealtimeSocket'
import { notifyAuthChanged, socketUserId } from '../utils/authEvents'

jest.mock('socket.io-client', () => ({ io: jest.fn() }))

const sockets = []
const ioMock = io

const lastHandshakeUserId = () => sockets[sockets.length - 1].opts.auth.userId

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

describe('socketUserId', () => {
    test('guest → null, user → id, admin → shared admin room id', () => {
        expect(socketUserId()).toBeNull()

        localStorage.setItem('userid', 'u123')
        expect(socketUserId()).toBe('u123')

        localStorage.setItem('role', 'Admin')
        expect(socketUserId()).toBe('admin-dashboard')

        localStorage.setItem('role', 'User')
        localStorage.setItem('isAdmin', 'true')
        expect(socketUserId()).toBe('admin-dashboard')
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

    test('an admin login joins the admin-dashboard identity', async () => {
        renderHook(() => useRealtimeSocket())
        await flushConnect()

        localStorage.setItem('userid', 'a1')
        localStorage.setItem('role', 'Admin')
        await act(async () => { notifyAuthChanged() })
        await flushConnect()

        expect(lastHandshakeUserId()).toBe('admin-dashboard')
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
