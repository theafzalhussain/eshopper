/* ToastEventBridge pairing rules.

   createCartSaga emits `cart:confirmed` TWICE for one add — optimistically
   before the request, then again on server confirmation. Toasting both meant
   every add-to-cart stacked two identical toasts, which is what made the
   wishlist page show two "Added to cart" alongside a failure message.

   The fix pairs the two halves of an operation with a counter rather than
   deduping on message text, because two DIFFERENT products added within a
   few seconds both carry the generic "Added to cart" and the second one is a
   genuine notification that must not be swallowed. */

import React from 'react'
import '@testing-library/jest-dom'
import { render, act } from '@testing-library/react'
import ToastEventBridge from '../Component/ToastEventBridge'

/* `mock` prefix is required: jest.mock factories may not close over other
   out-of-scope variables. */
const mockShown = []
const mockRemoved = []
let mockNextId = 1

jest.mock('../Component/ToastNotification', () => ({
  useToast: () => ({
    success: (message) => {
      const id = mockNextId++
      mockShown.push({ id, type: 'success', message })
      return id
    },
    error: (message) => {
      const id = mockNextId++
      mockShown.push({ id, type: 'error', message })
      return id
    },
    warning: () => mockNextId++,
    info: () => mockNextId++,
    showToast: () => mockNextId++,
    removeToast: (id) => mockRemoved.push(id)
  })
}))

const fire = (name, detail) => act(() => {
  window.dispatchEvent(new CustomEvent(name, { detail }))
})

const messages = () => mockShown.map((t) => `${t.type}:${t.message}`)

beforeEach(() => {
  mockNextId = 1
  mockShown.length = 0
  mockRemoved.length = 0
  render(<ToastEventBridge />)
})

test('one add with an optimistic then confirmed event shows a single toast', () => {
  fire('eshopper:cart:confirmed', { message: 'Added to cart', optimistic: true })
  fire('eshopper:cart:confirmed', { message: 'Added to cart' })

  expect(messages()).toEqual(['success:Added to cart'])
})

test('two rapid adds still show two toasts, despite identical messages', () => {
  // This is what a message-based dedupe would have wrongly collapsed.
  fire('eshopper:cart:confirmed', { message: 'Added to cart', optimistic: true })
  fire('eshopper:cart:confirmed', { message: 'Added to cart', optimistic: true })
  fire('eshopper:cart:confirmed', { message: 'Added to cart' })
  fire('eshopper:cart:confirmed', { message: 'Added to cart' })

  expect(messages()).toEqual(['success:Added to cart', 'success:Added to cart'])
})

test('a confirmed event with no optimistic half still toasts', () => {
  // The wishlist add saga only emits once.
  fire('eshopper:wishlist:confirmed', { message: 'Added to wishlist' })

  expect(messages()).toEqual(['success:Added to wishlist'])
})

test('a failure retracts the optimistic success instead of sitting beside it', () => {
  fire('eshopper:cart:confirmed', { message: 'Added to cart', optimistic: true })
  const optimisticId = mockShown[0].id

  fire('eshopper:cart:error', { message: 'Could not add to cart.' })

  // the success was pulled...
  expect(mockRemoved).toContain(optimisticId)
  // ...and the error is what remains
  expect(messages()).toEqual(['success:Added to cart', 'error:Could not add to cart.'])
})

test('channels are independent — a cart failure does not retract a wishlist toast', () => {
  fire('eshopper:wishlist:confirmed', { message: 'Added to wishlist' })
  const wishlistId = mockShown[0].id

  fire('eshopper:cart:error', { message: 'Could not add to cart.' })

  expect(mockRemoved).not.toContain(wishlistId)
})

test('an error with no pending optimistic success retracts nothing', () => {
  fire('eshopper:cart:error', { message: 'Could not add to cart.' })

  expect(mockRemoved).toHaveLength(0)
  expect(messages()).toEqual(['error:Could not add to cart.'])
})

test('falls back to a default message when the event carries none', () => {
  fire('eshopper:cart:confirmed', {})
  expect(messages()).toEqual(['success:Added to bag'])
})
