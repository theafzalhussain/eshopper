import { useEffect, useRef } from 'react'
import { useToast } from './ToastNotification'

/* Bridges the window CustomEvents that the sagas emit onto the toast system.

   Two behaviours here exist to stop the sagas from producing misleading
   output, both of which were visible on the wishlist page:

   1. PAIRING. createCartSaga fires `eshopper:cart:confirmed` twice for a
      single add — once optimistically before the request so the UI feels
      instant, then again once the server confirms. Toasting both stacked two
      identical "Added to cart" toasts on every add.

      Note this is deliberately NOT deduped by message text. Two different
      products added within a few seconds both carry the generic "Added to
      cart", so matching on the message would swallow the second genuine
      notification. Instead each optimistic event increments a counter and
      the next server-confirmed event consumes one, which pairs the two
      halves of a single operation no matter how fast the user clicks:

        optimistic(A) -> toast      optimistic(B) -> toast
        confirmed(A)  -> consumed   confirmed(B)  -> consumed

      A server-confirmed event with no optimistic half still toasts, so
      channels that only emit once (the wishlist add) are unaffected.

   2. SUPERSEDE. When an optimistic success is already on screen and the
      operation then fails, the success is removed before the error is shown.
      Previously the two sat on screen together, so the user saw "Added to
      cart" and "Failed to move all items to cart." at the same time with no
      way to tell which was true.

   The pending counter is bounded by a short window so a dropped or failed
   request can never leave a stale credit that swallows a later toast. */
const PENDING_WINDOW_MS = 10000

export default function ToastEventBridge() {
  const toast = useToast()

  /* The provider rebuilds its context value on every render, so binding the
     listeners to `toast` directly would re-subscribe constantly. Read it
     through a ref instead and subscribe once. */
  const toastRef = useRef(toast)
  toastRef.current = toast

  /* channel -> { pending: [timestamps], lastToastId } */
  const state = useRef({})

  useEffect(() => {
    const channelState = (channel) => {
      if (!state.current[channel]) state.current[channel] = { pending: [], lastToastId: null }
      return state.current[channel]
    }

    /* Drop credits older than the window so one lost response cannot
       silence the next successful operation. */
    const prune = (entry) => {
      const cutoff = Date.now() - PENDING_WINDOW_MS
      entry.pending = entry.pending.filter((t) => t >= cutoff)
    }

    const onConfirmed = (channel, fallback) => (e) => {
      const entry = channelState(channel)
      prune(entry)

      const isOptimistic = Boolean(e?.detail?.optimistic)

      if (isOptimistic) {
        entry.pending.push(Date.now())
      } else if (entry.pending.length > 0) {
        // Server half of an operation already announced optimistically.
        entry.pending.shift()
        return
      }

      try {
        entry.lastToastId = toastRef.current.success(e?.detail?.message || fallback)
      } catch (err) {}
    }

    const onError = (channel, fallback) => (e) => {
      const entry = channelState(channel)
      prune(entry)

      if (entry.pending.length > 0) {
        /* An optimistic success is on screen for an operation that has now
           failed — retract it so the user is never shown both. */
        entry.pending.shift()
        if (entry.lastToastId !== null) {
          try { toastRef.current.removeToast(entry.lastToastId) } catch (err) {}
          entry.lastToastId = null
        }
      }

      try { toastRef.current.error(e?.detail?.message || fallback) } catch (err) {}
    }

    const listeners = [
      ['eshopper:cart:confirmed', onConfirmed('cart', 'Added to bag')],
      ['eshopper:cart:error', onError('cart', 'Failed to add to cart.')],
      ['eshopper:wishlist:confirmed', onConfirmed('wishlist', 'Added to wishlist')],
      ['eshopper:wishlist:error', onError('wishlist', 'Failed to update wishlist.')],
    ]

    listeners.forEach(([name, handler]) => window.addEventListener(name, handler))

    return () => {
      listeners.forEach(([name, handler]) => window.removeEventListener(name, handler))
    }
  }, [])

  return null
}
