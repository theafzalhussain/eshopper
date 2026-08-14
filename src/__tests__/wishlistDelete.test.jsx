/* Wishlist delete failure handling.

   Datadog reported "Failed to remove from wishlist" — the backend's 500
   response from controllers/wishlistController.js — with no matching
   frontend error. The cause was that Wishlist.jsx wrapped a synchronous
   `dispatch(deleteWishlist(...))` in try/catch, so the real DELETE (which
   happened later inside the saga) could never reject into that catch. The
   row was removed optimistically and never restored.

   These tests pin the behaviour that fix depends on:
     - a successful delete removes the row and keeps it removed
     - a 500 is retried, then rolls the row back and surfaces a toast
     - the toast carries a working Retry action
     - a 404 is not retried (retrying cannot change the outcome) */

import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import axios from 'axios'
import Wishlist from '../Component/Wishlist'

jest.mock('axios')
jest.mock('../Store/Services', () => ({ createCartAPI: jest.fn() }))

/* Wishlist.jsx pulls in a large component tree; the pieces below are not
   under test and would otherwise need a store, a router and a network. */
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
    /* strip animation-only props so React does not warn about them */
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

const ITEM = {
  _id: 'item-1',
  name: 'Silk Blazer',
  price: 4999,
  productid: { _id: 'prod-1', name: 'Silk Blazer' }
}
const OTHER = {
  _id: 'item-2',
  name: 'Linen Shirt',
  price: 2499,
  productid: { _id: 'prod-2', name: 'Linen Shirt' }
}

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), {
  response: { status, data: { message: 'Failed to remove from wishlist.' } }
})

const renderWishlist = async () => {
  axios.get.mockResolvedValue({ data: [ITEM, OTHER] })
  render(<Wishlist />)
  await screen.findByText('Silk Blazer')
}

const removeButtons = () => screen.getAllByRole('button', { name: /remove from wishlist/i })
const clickRemove = () => fireEvent.click(removeButtons()[0])
const firstToastOfType = (type) => toastCalls.find((c) => c.type === type)

beforeEach(() => {
  jest.clearAllMocks()
  toastCalls.length = 0
  localStorage.setItem('userid', 'user-1')
  axios.defaults = { baseURL: '' }
})

test('a successful delete removes the row and resyncs redux', async () => {
  await renderWishlist()
  axios.delete.mockResolvedValue({ data: { success: true } })

  clickRemove()

  await waitFor(() => expect(axios.delete).toHaveBeenCalledTimes(1))
  expect(axios.delete).toHaveBeenCalledWith('/wishlist/item-1')

  await waitFor(() => expect(screen.queryByText('Silk Blazer')).not.toBeInTheDocument())
  // the other row is untouched
  expect(screen.getByText('Linen Shirt')).toBeInTheDocument()
  // redux is resynced so the header count follows
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'GET_WISHLIST' })
})

test('a 500 is retried, then the row is restored and an error toast is shown', async () => {
  await renderWishlist()
  axios.delete.mockRejectedValue(httpError(500))

  clickRemove()

  // 1 initial attempt + 2 retries
  await waitFor(() => expect(axios.delete).toHaveBeenCalledTimes(3), { timeout: 5000 })

  // the row comes back rather than silently staying hidden
  expect(await screen.findByText('Silk Blazer')).toBeInTheDocument()
  // and it comes back in its original position, not appended
  expect(removeButtons()).toHaveLength(2)

  const errors = toastCalls.filter((c) => c.type === 'error')
  expect(errors).toHaveLength(1)
  expect(errors[0].message).toBe('Failed to remove from wishlist.')
  expect(errors[0].options.action.label).toBe('Retry')
})

test('the Retry action on the toast issues another delete', async () => {
  await renderWishlist()
  axios.delete.mockRejectedValue(httpError(500))

  clickRemove()
  await waitFor(() => expect(axios.delete).toHaveBeenCalledTimes(3), { timeout: 5000 })

  const retry = firstToastOfType('error').options.action
  axios.delete.mockResolvedValue({ data: { success: true } })

  retry.onClick()

  await waitFor(() => expect(axios.delete).toHaveBeenCalledTimes(4))
  await waitFor(() => expect(screen.queryByText('Silk Blazer')).not.toBeInTheDocument())
})

test('a 404 is not retried', async () => {
  await renderWishlist()
  axios.delete.mockRejectedValue(httpError(404))

  clickRemove()

  await waitFor(() => expect(firstToastOfType('error')).toBeDefined())
  expect(axios.delete).toHaveBeenCalledTimes(1)
})
