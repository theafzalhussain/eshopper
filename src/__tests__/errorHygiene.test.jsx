import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import WidgetErrorBoundary from '../Component/WidgetErrorBoundary'
import {
    isNoise, isThirdPartyError, shouldReport, monitoringEnabled, isFirstPartyStack
} from '../monitoring'

/* ══════════════════════════════════════════════════════════
   ERROR HYGIENE

   These are the rules that decide what counts as an eShopper error.
   The Datadog dashboard was full of things this app cannot throw
   (extension ReferenceErrors, dev-only crashes, socket retries).
══════════════════════════════════════════════════════════ */

describe('noise classification', () => {
    test('transient infrastructure messages are noise', () => {
        expect(isNoise('ChunkLoadError: Loading chunk 5361 failed')).toBe(true)
        expect(isNoise('xhr poll error')).toBe(true)
        expect(isNoise('websocket error')).toBe(true)
        expect(isNoise('Script error.')).toBe(true)
        expect(isNoise('ResizeObserver loop completed')).toBe(true)
    })

    test('a genuine app error is not noise', () => {
        expect(isNoise("Cannot read properties of undefined (reading 'price')")).toBe(false)
    })
})

describe('third-party attribution', () => {
    test('a frame from a browser extension is not our error', () => {
        const stack = 'ReferenceError: lang is not defined\n at chrome-extension://abcd/inject.js:1:1'
        expect(isThirdPartyError('lang is not defined', stack)).toBe(true)
        expect(shouldReport('lang is not defined', stack)).toBe(false)
    })

    test('"x is not defined" with no frame of ours is not our error', () => {
        expect(isThirdPartyError('lang is not defined', '')).toBe(true)
        expect(isThirdPartyError('authUser is not defined', 'at <anonymous>:1:1')).toBe(true)
    })

    test('the same message from our own bundle IS reported', () => {
        const stack = 'ReferenceError: lang is not defined\n at https://eshopperr.me/static/js/main.abc123.js:2:9'
        expect(isFirstPartyStack(stack)).toBe(true)
        expect(isThirdPartyError('lang is not defined', stack)).toBe(false)
        expect(shouldReport('lang is not defined', stack)).toBe(true)
    })

    test('a real app error from our bundle is reported', () => {
        const stack = 'at https://eshopperr.me/static/js/main.abc123.js:9:1'
        expect(shouldReport("Cannot read properties of null (reading 'map')", stack)).toBe(true)
    })
})

describe('monitoring is production-only', () => {
    test('local development never reports', () => {
        expect(monitoringEnabled('localhost')).toBe(false)
        expect(monitoringEnabled('127.0.0.1')).toBe(false)
        expect(monitoringEnabled('macbook.local')).toBe(false)
    })

    test('the live site reports', () => {
        expect(monitoringEnabled('eshopperr.me')).toBe(true)
        expect(monitoringEnabled('www.eshopperr.me')).toBe(true)
    })
})

describe('WidgetErrorBoundary', () => {
    const Boom = () => { throw new Error('ChatBot exploded') }

    let consoleError
    let consoleWarn
    beforeEach(() => {
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => { })
        consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => { })
        window.__eshopperCaptureError = jest.fn()
    })
    afterEach(() => {
        consoleError.mockRestore()
        consoleWarn.mockRestore()
        delete window.__eshopperCaptureError
    })

    test('a crashing widget is hidden and the rest of the page survives', () => {
        render(
            <div>
                <h1>Shop</h1>
                <WidgetErrorBoundary name="ChatBot"><Boom /></WidgetErrorBoundary>
            </div>
        )

        // the page is still there — this is what used to go blank
        expect(screen.getByText('Shop')).toBeInTheDocument()
        expect(screen.queryByText('ChatBot exploded')).not.toBeInTheDocument()
    })

    test('the failure is still reported with the widget name', () => {
        render(<WidgetErrorBoundary name="ChatBot"><Boom /></WidgetErrorBoundary>)

        expect(window.__eshopperCaptureError).toHaveBeenCalledTimes(1)
        const [error, context] = window.__eshopperCaptureError.mock.calls[0]
        expect(error.message).toBe('ChatBot exploded')
        expect(context.widget).toBe('ChatBot')
    })

    test('a fallback is rendered when one is provided', () => {
        render(
            <WidgetErrorBoundary name="Footer" fallback={<p>Footer unavailable</p>}>
                <Boom />
            </WidgetErrorBoundary>
        )
        expect(screen.getByText('Footer unavailable')).toBeInTheDocument()
    })

    test('a healthy widget renders untouched', () => {
        render(<WidgetErrorBoundary name="Navbaar"><p>menu</p></WidgetErrorBoundary>)
        expect(screen.getByText('menu')).toBeInTheDocument()
        expect(window.__eshopperCaptureError).not.toHaveBeenCalled()
    })
})
