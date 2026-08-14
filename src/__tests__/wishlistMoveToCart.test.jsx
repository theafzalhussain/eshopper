/* Wishlist "Move to cart" / "Move all to cart".

   The screenshot that prompted this fix showed two "Added to cart" success
   toasts and "Failed to move all items to cart." on screen simultaneously
   after one click. Three separate faults combined to produce that:

     1. `deleteWishlist` had been dropped from Wishlist.jsx's imports while
        moveToCart/moveAllToCart still called it, so the reference threw a
        ReferenceError — after the cart dispatch had already fired.
     2. Both functions wrapped synchronous saga dispatches in try/catch, so
        a genuine API failure could never be reported at all.
     3. createCartSaga emits `cart:confirmed` twice per add (optimistic then
        server-confirmed) and the toast bridge showed both.

   These tests pin the contract the fix establishes: the operation is
   awaited, failures roll the row back, and a user action produces exactly
   one toast. */

import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import axios from 'axios'
import { createCartAPI } from '../Store/Services'
import Wishlist from '../Component/Wishlist'

/* jest.mock is hoisted above these imports by babel-plugin-jest-hoist, so
   the mocks below are already in place when Wishlist is evaluated. */
jest.mock('axios')
jest.mock('../Store/Services', () => ({ createCartAPI: jest.fn() }))

jest.mock('../Store/ActionCreaters/WishlistActionCreators', () => ({
  getWishlist: () => ({ type: 'GET_WISHLIST' })
}))
jest.mock('../Store/ActionCreaters/CartActionCreators', () => ({
  getCart: () => ({ type: 'GET_CART' })
}))

const mockDispatch = jest.fn()
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }))

jest.mock('react-router-dom', () => ({
  Link: ({ children, ...rest }) => <a {...rest}>{children}</a>
}))

jest.mock('framer-motion', () => {
  const ReactLib = require('react')
  const passthrough = (tag) => ReactLib.forwardRef(({ children, ...rest }, ref) => {
    const { initial, animate, exit, transition, variants, whileHover,
      whileTap, whileInView, viewport, layout, ...dom } = rest
    return ReactLib.createElement(tag, { ...dom, ref }, children)
  })
  return {
    motion: new Proxy({}, { get: (_t, tag) => passthrough(tag) }),
    AnimatePresence: ({ children }) => children
  }
})

jest.mock('../utils/cloudinaryHelper', () => ({
  optimizeCloudinaryUrlAdvanced: (u) => u,
  optimizeCloudinaryUrl: (u) => u
}))

const toastCalls = []
jest.mock('../Component/ToastNotification', () => ({
  useToast: () => ({
    success: (message, duration, options) => toastCalls.push({ type: 'success', message, duration, options }),
    error: (message, duration, options) => toastCalls.push({ type: 'error', message, duration, options }),
    warning: (message, duration, options) => toastCalls.push({ type: 'warning', message, duration, options }),
    info: () => {},
    showToast: () => {}
  })
}))

const ITEM_A = { _id: 'w-1', name: 'Silk Blazer', price: 4999, productid: { _id: 'p-1' } }
const ITEM_B = { _id: 'w-2', name: 'Linen Shirt', price: 2499, productid: { _id: 'p-2' } }

const httpError = (status, message = 'Server exploded') =>
  Object.assign(new Error(message), { response: { status, data: { message } } })

const renderWishlist = async (items = [ITEM_A, ITEM_B]) => {
  axios.get.mockResolvedValue({ data: items })
  render(<Wishlist />)
  await screen.findByText('Silk Blazer')
}

const clickMoveAll = () =>
  fireEvent.click(screen.getByRole('button', { name: /move all to cart/i }))

const clickMoveOne = () =>
  fireEvent.click(screen.getAllByRole('button', { name: /^move to cart$/i })[0])

const rowCount = () => screen.getAllByRole('button', { name: /^move to cart$/i }).length

const firstToastOfType = (type) => toastCalls.find((c) => c.type === type)

beforeEach(() => {
  jest.clearAllMocks()
  toastCalls.length = 0
  localStorage.setItem('userid', 'user-1')
  axios.defaults = { baseURL: '' }
})

test('moving all items succeeds with exactly ONE toast, not one per item', async () => {
  await renderWishlist()
  createCartAPI.mockResolvedValue({ success: true })
  axios.delete.mockResolvedValue({ data: { success: true } })

  clickMoveAll()

  await waitFor(() => expect(createCartAPI).toHaveBeenCalledTimes(2))
  expect(axios.delete).toHaveBeenCalledTimes(2)

  await waitFor(() => expect(screen.queryByText('Silk Blazer')).not.toBeInTheDocument())
  expect(screen.queryByText('Linen Shirt')).not.toBeInTheDocument()

  // The whole point: one summary toast for the whole batch.
  expect(toastCalls).toHaveLength(1)
  expect(toastCalls[0].type).toBe('success')
  expect(toastCalls[0].message).toBe('2 items moved to cart.')

  // redux resynced so the header cart count and wishlist badge follow
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'GET_CART' })
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'GET_WISHLIST' })
})

test('a partial failure restores only the failed row and warns once', async () => {
  await renderWishlist()
  // first item moves, second fails its cart add on every retry
  createCartAPI
    .mockResolvedValueOnce({ success: true })
    .mockRejectedValue(httpError(500))
  axios.delete.mockResolvedValue({ data: { success: true } })

  clickMoveAll()

  await waitFor(
    () => expect(firstToastOfType('warning')).toBeDefined(),
    { timeout: 6000 }
  )

  // exactly one toast, and it reports both halves of the outcome
  expect(toastCalls).toHaveLength(1)
  expect(toastCalls[0].message).toBe('1 item moved to cart, 1 could not be moved.')
  expect(toastCalls[0].options.action.label).toBe('Retry')

  // the moved one is gone, the failed one is back on screen
  expect(screen.queryByText('Silk Blazer')).not.toBeInTheDocument()
  expect(await screen.findByText('Linen Shirt')).toBeInTheDocument()
})

test('a total failure reports an error once and restores every row', async () => {
  await renderWishlist()
  createCartAPI.mockRejectedValue(httpError(500))

  clickMoveAll()

  await waitFor(
    () => expect(firstToastOfType('error')).toBeDefined(),
    { timeout: 8000 }
  )

  expect(toastCalls).toHaveLength(1)
  expect(toastCalls[0].message).toBe('Could not move items to cart. Please try again.')

  expect(await screen.findByText('Silk Blazer')).toBeInTheDocument()
  expect(screen.getByText('Linen Shirt')).toBeInTheDocument()
  expect(rowCount()).toBe(2)
  // nothing was deleted from the wishlist, since nothing reached the cart
  expect(axios.delete).not.toHaveBeenCalled()
})

test('a single move that fails restores the row and offers Retry', async () => {
  await renderWishlist([ITEM_A])
  createCartAPI.mockRejectedValue(httpError(503))

  clickMoveOne()

  await waitFor(
    () => expect(firstToastOfType('error')).toBeDefined(),
    { timeout: 6000 }
  )

  expect(await screen.findByText('Silk Blazer')).toBeInTheDocument()
  const errorToast = firstToastOfType('error')
  expect(errorToast.options.action.label).toBe('Retry')

  // Retry now succeeds and the row leaves
  createCartAPI.mockResolvedValue({ success: true })
  axios.delete.mockResolvedValue({ data: { success: true } })
  errorToast.options.action.onClick()

  await waitFor(() => expect(screen.queryByText('Silk Blazer')).not.toBeInTheDocument())
})

test('a failed row is restored to its original position, not appended', async () => {
  const ITEM_C = { _id: 'w-3', name: 'Wool Coat', price: 7999, productid: { _id: 'p-3' } }
  await renderWishlist([ITEM_A, ITEM_B, ITEM_C])

  // the MIDDLE item fails; the other two move
  createCartAPI.mockImplementation((payload) =>
    payload.productId === 'p-2'
      ? Promise.reject(httpError(500))
      : Promise.resolve({ success: true }))
  axios.delete.mockResolvedValue({ data: { success: true } })

  clickMoveAll()

  await waitFor(
    () => expect(firstToastOfType('warning')).toBeDefined(),
    { timeout: 8000 }
  )

  // Only the failed row remains, and it is still the row it always was.
  const names = screen.getAllByRole('heading', { level: 5 }).map((h) => h.textContent)
  expect(names.filter((n) => /Silk Blazer|Linen Shirt|Wool Coat/.test(n)))
    .toEqual(['Linen Shirt'])
})

test('a 429 is not retried, because the API client already handles rate limits', async () => {
  await renderWishlist([ITEM_A])
  createCartAPI.mockRejectedValue(httpError(429, 'Too many requests'))

  clickMoveOne()

  await waitFor(() => expect(firstToastOfType('error')).toBeDefined())
  /* fastAPI retries 429 internally while honouring Retry-After; retrying on
     top of that turned one rate limit into up to twelve requests. */
  expect(createCartAPI).toHaveBeenCalledTimes(1)
})

test('when only the wishlist delete fails, Retry does not add to the cart twice', async () => {
  await renderWishlist([ITEM_A])
  createCartAPI.mockResolvedValue({ success: true })
  axios.delete.mockRejectedValue(httpError(500))

  clickMoveOne()

  await waitFor(
    () => expect(firstToastOfType('error')).toBeDefined(),
    { timeout: 8000 }
  )

  expect(createCartAPI).toHaveBeenCalledTimes(1)

  // Retry: the cart already has it, so only the delete should be reattempted
  axios.delete.mockResolvedValue({ data: { success: true } })
  firstToastOfType('error').options.action.onClick()

  await waitFor(() => expect(screen.queryByText('Silk Blazer')).not.toBeInTheDocument())
  expect(createCartAPI).toHaveBeenCalledTimes(1)
})
