/* Caps the reveal animation so a long reply cannot add seconds of waiting
   after the model has already answered. ChatBot awaits streamReply before
   the turn completes, so this time was being paid by the user on top of the
   API round trip. */

import { streamText, STREAMING_SPEEDS, STREAMING_CHUNKS, STREAMING_MAX_MS } from '../Component/chatbot/streamingUtils'

/* Runs the animation on fake timers and reports how long it claimed. */
const measure = (text, speed) => new Promise((resolve) => {
  let elapsed = 0
  const speedMs = STREAMING_SPEEDS[speed]
  const realSetTimeout = setTimeout

  jest.useFakeTimers()
  streamText({
    text,
    speedMs,
    chunkSize: STREAMING_CHUNKS[speed],
    maxDurationMs: STREAMING_MAX_MS[speed],
    onUpdate: (partial, done) => {
      if (done) {
        jest.useRealTimers()
        realSetTimeout(() => resolve({ elapsed, partial }), 0)
      }
    }
  })

  /* Advance in single ticks so `elapsed` tracks wall-clock the animation
     would have consumed. */
  for (let i = 0; i < 20000 && jest.getTimerCount() > 0; i++) {
    jest.advanceTimersByTime(speedMs)
    elapsed += speedMs
  }
})

const LONG = 'a'.repeat(1200)
const SHORT = 'Sure, here are two options I like.'

afterEach(() => { jest.useRealTimers() })

test('a long reply is capped instead of scaling with length', async () => {
  const { elapsed, partial } = await measure(LONG, 'slow')

  // Uncapped this would be 1200/2 * 24ms = 14400ms.
  expect(elapsed).toBeLessThanOrEqual(STREAMING_MAX_MS.slow + STREAMING_SPEEDS.slow)
  // and the whole text still arrives
  expect(partial).toHaveLength(LONG.length)
})

test('every speed setting stays inside its budget', async () => {
  for (const speed of ['fast', 'normal', 'slow']) {
    const { elapsed, partial } = await measure(LONG, speed)
    expect(elapsed).toBeLessThanOrEqual(STREAMING_MAX_MS[speed] + STREAMING_SPEEDS[speed])
    expect(partial).toHaveLength(LONG.length)
  }
})

test('a short reply keeps the chosen cadence rather than being rushed', async () => {
  const { elapsed } = await measure(SHORT, 'normal')

  // 34 chars / 4 per tick = 9 ticks * 14ms = ~126ms, well inside the budget,
  // so the cap must not have altered it.
  const uncapped = Math.ceil(SHORT.length / STREAMING_CHUNKS.normal) * STREAMING_SPEEDS.normal
  expect(elapsed).toBeLessThanOrEqual(uncapped + STREAMING_SPEEDS.normal)
  expect(uncapped).toBeLessThan(STREAMING_MAX_MS.normal)
})

test('instant delivers the whole text with no timers at all', () => {
  const seen = []
  streamText({
    text: LONG,
    speedMs: STREAMING_SPEEDS.instant,
    chunkSize: STREAMING_CHUNKS.instant,
    maxDurationMs: STREAMING_MAX_MS.instant,
    onUpdate: (partial, done) => seen.push({ len: partial.length, done })
  })

  expect(seen).toHaveLength(1)
  expect(seen[0]).toEqual({ len: LONG.length, done: true })
})

test('cancelling stops further updates', () => {
  jest.useFakeTimers()
  const updates = []
  const ctrl = streamText({
    text: LONG,
    speedMs: STREAMING_SPEEDS.normal,
    chunkSize: STREAMING_CHUNKS.normal,
    maxDurationMs: STREAMING_MAX_MS.normal,
    onUpdate: (partial, done) => updates.push(done)
  })

  jest.advanceTimersByTime(STREAMING_SPEEDS.normal * 3)
  const seenBefore = updates.length
  ctrl.cancel()
  jest.advanceTimersByTime(STREAMING_SPEEDS.normal * 50)

  expect(updates).toHaveLength(seenBefore)
  expect(updates).not.toContain(true)
})
