/* Wishlist saga notification contract.

   Most pages let the saga own the success notification, which
   ToastEventBridge turns into a toast. The homepage renders its own styled
   in-page toast, so a single click there produced two notifications for the
   same action — the page's own plus the generic one. `silent: true` opts a
   caller out of the generic notification.

   Also pins that `silent` is a client-side hint and must never be sent to
   the API as part of the wishlist record, and that failures are still
   reported no matter who announced the success. */

import { runSaga, stdChannel } from 'redux-saga'
import { createWishlistAPI, getWishlistAPI, deleteWishlistAPI } from '../Store/Services'
import { wishlistSaga } from '../Store/Sagas/WishlistSaga'
import { ADD_WISHLIST } from '../Store/Constant'

jest.mock('../Store/Services', () => ({
  createWishlistAPI: jest.fn(),
  deleteWishlistAPI: jest.fn(),
  getWishlistAPI: jest.fn(),
  updateWishlistAPI: jest.fn()
}))

const events = { confirmed: [], error: [] }
const onConfirmed = (e) => events.confirmed.push(e.detail)
const onError = (e) => events.error.push(e.detail)

/* Lets queued promises and the saga's nested generators settle. */
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
}

const runWishlistSaga = async (action) => {
  const channel = stdChannel()
  const task = runSaga(
    { channel, dispatch: (a) => channel.put(a), getState: () => ({}) },
    wishlistSaga
  )
  channel.put(action)
  await settle()
  task.cancel()
  return task
}

const PAYLOAD = {
  productid: 'p-1',
  userid: 'u-1',
  name: 'Silk Blazer',
  price: 4999
}

beforeAll(() => {
  window.addEventListener('eshopper:wishlist:confirmed', onConfirmed)
  window.addEventListener('eshopper:wishlist:error', onError)
})

afterAll(() => {
  window.removeEventListener('eshopper:wishlist:confirmed', onConfirmed)
  window.removeEventListener('eshopper:wishlist:error', onError)
})

beforeEach(() => {
  jest.clearAllMocks()
  events.confirmed.length = 0
  events.error.length = 0
  localStorage.setItem('userid', 'u-1')
  getWishlistAPI.mockResolvedValue([])
  deleteWishlistAPI.mockResolvedValue({ success: true })
})

test('a normal add raises the generic success notification', async () => {
  createWishlistAPI.mockResolvedValue({ message: 'Added to wishlist' })

  await runWishlistSaga({ type: ADD_WISHLIST, payload: PAYLOAD })

  expect(createWishlistAPI).toHaveBeenCalledTimes(1)
  expect(events.confirmed).toHaveLength(1)
  expect(events.confirmed[0].message).toBe('Added to wishlist')
  expect(events.error).toHaveLength(0)
})

test('silent: true suppresses the duplicate notification', async () => {
  createWishlistAPI.mockResolvedValue({ message: 'Added to wishlist' })

  await runWishlistSaga({ type: ADD_WISHLIST, payload: { ...PAYLOAD, silent: true } })

  // the item is still saved...
  expect(createWishlistAPI).toHaveBeenCalledTimes(1)
  // ...but the page's own toast is the only one the user sees
  expect(events.confirmed).toHaveLength(0)
})

test('silent is stripped before the request, never stored on the record', async () => {
  createWishlistAPI.mockResolvedValue({ message: 'Added to wishlist' })

  await runWishlistSaga({ type: ADD_WISHLIST, payload: { ...PAYLOAD, silent: true } })

  const sent = createWishlistAPI.mock.calls[0][0]
  expect(sent).not.toHaveProperty('silent')
  expect(sent).toMatchObject(PAYLOAD)
})

test('a failure is still reported even when the caller was silent', async () => {
  createWishlistAPI.mockRejectedValue(new Error('Wishlist add failed'))

  await runWishlistSaga({ type: ADD_WISHLIST, payload: { ...PAYLOAD, silent: true } })

  expect(events.error).toHaveLength(1)
  expect(events.error[0].message).toBe('Wishlist add failed')
  expect(events.confirmed).toHaveLength(0)
})
